"""
VersionAutopsy - Flask Web Application
Main application file with API endpoints
"""

from flask import Flask, render_template, request, jsonify
from version_analyzer import parse_requirements, analyze_package
import re

app = Flask(__name__)


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
        for pkg in packages:
            analysis = analyze_package(pkg['package'], pkg['version'])
            results.append(analysis)
        
        return jsonify({
            'success': True,
            'results': results,
            'total_packages': len(results)
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



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
