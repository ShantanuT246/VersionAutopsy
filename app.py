"""
VersionAutopsy - Flask Web Application
Main application file with API endpoints
"""

from flask import Flask, render_template, request, jsonify
from version_analyzer import parse_requirements, analyze_package
import re
import urllib.request
import urllib.error

app = Flask(__name__)

# ── GitHub URL helpers ────────────────────────────────────────────────────────

_GH_REPO_RE = re.compile(
    r'^https?://github\.com/'
    r'(?P<owner>[^/]+)/'
    r'(?P<repo>[^/]+)'
    r'(?:/tree/(?P<branch>[^/]+)(?P<path_tree>/.*))?'   # /tree/branch/path
    r'(?:/blob/(?P<blob_branch>[^/]+)(?P<path_blob>/.*))?'  # /blob/branch/path
    r'/?$',
    re.IGNORECASE,
)

def _build_raw_url(owner: str, repo: str, branch: str, file_path: str) -> str:
    """Construct a raw.githubusercontent.com URL."""
    # Normalise the file path
    file_path = file_path.lstrip('/')
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"


def _fetch_raw(url: str):
    """
    Fetch text from a raw URL.
    Returns (text, None) on success, (None, error_str) on failure.
    """
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'VersionAutopsy/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8', errors='replace'), None
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, 'not_found'
        if e.code in (401, 403):
            return None, 'private'
        return None, f'http_{e.code}'
    except urllib.error.URLError as e:
        return None, f'network: {e.reason}'
    except Exception as e:
        return None, str(e)


def fetch_github_requirements(repo_url: str, branch_hint: str = '', file_path: str = ''):
    """
    Given a GitHub repository URL, fetch requirements.txt (or the specified file).

    Returns dict:
        success      bool
        content      str   (raw file text, only when success)
        repo_name    str
        owner        str
        branch       str   (resolved branch)
        file_path    str   (path inside repo)
        error        str   (human-readable, only when not success)
    """
    repo_url = repo_url.strip().rstrip('/')

    m = _GH_REPO_RE.match(repo_url)
    if not m:
        # Maybe user pasted owner/repo shorthand
        short = re.match(r'^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$', repo_url)
        if short:
            owner, repo = short.group(1), short.group(2)
            resolved_branch, resolved_path = '', ''
        else:
            return {'success': False, 'error': 'Invalid GitHub URL. Expected format: https://github.com/owner/repo'}
    else:
        owner = m.group('owner')
        repo  = m.group('repo').rstrip('.git')
        # Branch from URL or hint
        resolved_branch = (
            m.group('branch') or m.group('blob_branch') or branch_hint or ''
        )
        # Path from URL or caller
        resolved_path = (
            m.group('path_tree') or m.group('path_blob') or file_path or ''
        )

    # Default file path
    if not resolved_path:
        resolved_path = 'requirements.txt'

    resolved_path = resolved_path.lstrip('/')

    # Determine branches to try
    if resolved_branch:
        branches_to_try = [resolved_branch]
    else:
        branches_to_try = ['main', 'master']

    last_error = 'not_found'
    for branch in branches_to_try:
        raw_url = _build_raw_url(owner, repo, branch, resolved_path)
        content, err = _fetch_raw(raw_url)
        if content is not None:
            return {
                'success': True,
                'content': content,
                'repo_name': repo,
                'owner': owner,
                'branch': branch,
                'file_path': resolved_path,
                'raw_url': raw_url,
            }
        last_error = err

    # Map internal error codes to friendly messages
    error_map = {
        'not_found': (
            f"Could not find '{resolved_path}' in {owner}/{repo}. "
            "Make sure the file exists and the repo is public."
        ),
        'private': (
            f"Repository {owner}/{repo} appears to be private or requires authentication."
        ),
    }
    friendly = error_map.get(last_error, f"Failed to fetch file: {last_error}")
    return {'success': False, 'error': friendly, 'repo_name': repo, 'owner': owner}


@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template('index.html')


@app.route('/api/analyze', methods=['POST'])
def analyze_dependencies():
    """
    Analyze requirements.txt content and return risk assessment.
    
    Expected JSON payload:
    {
        "requirements": "flask==2.0.0\\nrequests==2.25.0"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'requirements' not in data:
            return jsonify({'error': 'Missing requirements field'}), 400
        
        requirements_content = data['requirements'].strip()
        
        if not requirements_content:
            return jsonify({'error': 'Requirements cannot be empty'}), 400
        
        # Parse the requirements
        packages = parse_requirements(requirements_content)
        
        if not packages:
            return jsonify({'error': 'No valid packages found. Please check the format.'}), 400
        
        # Analyze each package
        results = []
        fix_command_packages = []
        for pkg in packages:
            analysis = analyze_package(pkg['package'], pkg['version'], packages)
            results.append(analysis)
            
            # Include in auto-fix if it needs upgrading AND does not explicitly conflict with other pinned packages
            if analysis['risk_level'] not in ('UP-TO-DATE', 'UNKNOWN', 'CONFLICT') and analysis['latest_version'] != 'Not Found':
                fix_command_packages.append(f"{analysis['package']}=={analysis['latest_version']}")
                
        fix_command = f"pip install {' '.join(fix_command_packages)} && pip freeze > requirements.txt" if fix_command_packages else ""
        
        return jsonify({
            'success': True,
            'results': results,
            'total_packages': len(results),
            'fix_command': fix_command
        })
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/check-package', methods=['POST'])
def check_single_package():
    """
    Check a single package version.
    
    Expected JSON payload:
    {
        "package": "flask",
        "version": "2.0.0"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'package' not in data or 'version' not in data:
            return jsonify({'error': 'Missing package or version field'}), 400
        
        package_name = data['package'].strip().lower()
        version = data['version'].strip()
        
        # Validate package name (alphanumeric, hyphens, underscores)
        if not re.match(r'^[a-zA-Z0-9\-_]+$', package_name):
            return jsonify({'error': 'Invalid package name format'}), 400
        
        # Validate version format (x.y.z or x.y or x)
        if not re.match(r'^\d+(\.\d+)*$', version):
            return jsonify({'error': 'Invalid version format. Use semantic versioning (e.g., 2.31.0)'}), 400
        
        # Analyze the package
        analysis = analyze_package(package_name, version)
        
        return jsonify({
            'success': True,
            'result': analysis
        })
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/fetch-github', methods=['POST'])
def fetch_github():
    """
    Fetch requirements.txt from a public GitHub repository URL.

    Expected JSON payload:
    {
        "repo_url":  "https://github.com/owner/repo",
        "branch":    "main",           // optional; defaults to main → master
        "file_path": "requirements.txt"  // optional; defaults to requirements.txt
    }
    """
    try:
        data = request.get_json()

        if not data or 'repo_url' not in data:
            return jsonify({'error': 'Missing repo_url field'}), 400

        repo_url  = data['repo_url'].strip()
        branch    = data.get('branch', '').strip()
        file_path = data.get('file_path', '').strip()

        if not repo_url:
            return jsonify({'error': 'repo_url cannot be empty'}), 400

        result = fetch_github_requirements(repo_url, branch_hint=branch, file_path=file_path)

        if not result['success']:
            status = 404 if 'not_found' in result.get('error', '').lower() or 'Could not find' in result.get('error', '') else 400
            return jsonify({'error': result['error']}), status

        return jsonify({
            'success':   True,
            'content':   result['content'],
            'repo_name': result['repo_name'],
            'owner':     result['owner'],
            'branch':    result['branch'],
            'file_path': result['file_path'],
            'raw_url':   result['raw_url'],
        })

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
