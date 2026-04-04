"""
VersionAutopsy - Dependency Risk Analyzer
Core module for version comparison and risk assessment
"""

import re
import requests
from typing import Dict, Tuple, Optional, List


def parse_requirements(content: str) -> list:
    """
    Parse requirements.txt content and extract package names and versions.
    
    Args:
        content: String content of requirements.txt file
        
    Returns:
        List of dictionaries with 'package' and 'version' keys
    """
    packages = []
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        # Skip empty lines and comments
        if not line or line.startswith('#'):
            continue
            
        # Match package==version or package>=version or package<=version
        match = re.match(r'^([a-zA-Z0-9\-_]+)\s*([=><]=?)\s*([0-9.]+)', line)
        if match:
            package_name = match.group(1).lower()
            version = match.group(3)
            packages.append({
                'package': package_name,
                'version': version
            })
    
    return packages


def parse_version(version_string: str) -> Tuple[int, int, int]:
    """
    Parse semantic version string into major, minor, patch components safely.
    """
    parts = version_string.split('.')
    
    def safe_int(val):
        import re
        match = re.search(r'^(\d+)', str(val))
        return int(match.group(1)) if match else 0
        
    major = safe_int(parts[0]) if len(parts) > 0 else 0
    minor = safe_int(parts[1]) if len(parts) > 1 else 0
    patch = safe_int(parts[2]) if len(parts) > 2 else 0
    
    return (major, minor, patch)


def fetch_package_data(package_name: str, version: Optional[str] = None) -> Optional[Dict]:
    """
    Fetch package data from PyPI.
    
    Args:
        package_name: Name of the PyPI package
        version: Optional specific version to fetch
        
    Returns:
        JSON package data dictionary or None if not found
    """
    try:
        url = f"https://pypi.org/pypi/{package_name}/json"
        if version:
            url = f"https://pypi.org/pypi/{package_name}/{version}/json"
            
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except Exception as e:
        print(f"Error fetching data for {package_name}: {e}")
        return None


def calculate_risk(current_version: str, latest_version: str, has_cve: bool, has_conflict: bool) -> str:
    """
    Calculate upgrade risk based on semantic versioning rules, CVEs, and conflicts.
    
    Args:
        current_version: Current version string
        latest_version: Latest available version string
        has_cve: Boolean indicating if current version has known vulnerabilities
        has_conflict: Boolean indicating if upgrading causes dependency conflicts
        
    Returns:
        Risk level: "CRITICAL", "CONFLICT", "HIGH", "MEDIUM", "LOW", or "UP-TO-DATE"
    """
    if has_cve:
        return "CRITICAL"
        
    if has_conflict:
        return "CONFLICT"
        
    current = parse_version(current_version)
    latest = parse_version(latest_version)
    
    # If versions are the same, no risk
    if current == latest:
        return "UP-TO-DATE"
    
    # Major version change - HIGH RISK
    if latest[0] > current[0]:
        return "HIGH"
    
    # Minor version change - MEDIUM RISK
    if latest[1] > current[1]:
        return "MEDIUM"
    
    # Patch version change - LOW RISK
    if latest[2] > current[2]:
        return "LOW"
    
    # Current version is newer than "latest" (edge case)
    return "UNKNOWN"


def generate_explanation(risk_level: str, current: str, latest: str, vulnerabilities: List[Dict], conflicts: List[str]) -> str:
    """
    Generate plain-English explanation of the upgrade risk.
    """
    current_parts = parse_version(current)
    latest_parts = parse_version(latest)
    
    if risk_level == "CRITICAL":
        cve_ids = [v.get('id', 'Unknown CVE') for v in vulnerabilities]
        cves_str = ', '.join(cve_ids)
        return f"🚨 URGENT: Your current version ({current}) has known security vulnerabilities: {cves_str}. Upgrade strongly recommended!"
        
    if risk_level == "CONFLICT":
        conflicts_str = '<br>• '.join(conflicts)
        return f"⚠️ DEPENDENCY CONFLICT: Upgrading to {latest} requires packages that clash with your pinned requirements.<br>• {conflicts_str}"
    
    explanations = {
        "HIGH": f"⚠️ Major version upgrade ({current_parts[0]}.x → {latest_parts[0]}.x). "
                f"This update may contain breaking changes that could require significant code modifications. "
                f"Review the changelog carefully before upgrading.",
        
        "MEDIUM": f"⚡ Minor version upgrade ({current_parts[0]}.{current_parts[1]}.x → "
                  f"{latest_parts[0]}.{latest_parts[1]}.x). "
                  f"New features have been added. Some functions may be deprecated. "
                  f"Test thoroughly but major breaking changes are unlikely.",
        
        "LOW": f"✅ Patch version upgrade ({current} → {latest}). "
               f"This is a bug fix release with no new features. "
               f"Safe to upgrade with minimal testing required.",
        
        "UP-TO-DATE": f"✨ You're using the latest version! No upgrade needed.",
        
        "UNKNOWN": f"⚠️ Version comparison unclear. Your version ({current}) appears newer than PyPI ({latest})."
    }
    
    return explanations.get(risk_level, "Unable to determine risk level.")


def analyze_package(package_name: str, current_version: str, all_packages: Optional[List[Dict]] = None) -> Dict:
    """
    Analyze a single package and return risk assessment.
    
    Args:
        package_name: Name of the package
        current_version: Current installed version
        all_packages: Optional list of all packages in requirements.txt (for conflict checking)
        
    Returns:
        Dictionary with analysis results
    """
    latest_data = fetch_package_data(package_name)
    current_data = fetch_package_data(package_name, current_version)
    
    if latest_data is None:
        return {
            'package': package_name,
            'current_version': current_version,
            'latest_version': 'Not Found',
            'risk_level': 'UNKNOWN',
            'explanation': f'Package "{package_name}" not found on PyPI. Please verify the package name.',
            'conflicted_with': []
        }
    
    latest_version = latest_data['info']['version']
    
    # 1. Vulnerability Checking
    vulnerabilities = []
    if current_data and current_data.get('vulnerabilities'):
        vulnerabilities = current_data['vulnerabilities']
        
    # 2. Inter-Dependency Conflict Checking (Simple approach)
    conflicts = []
    conflicted_with = []
    if all_packages and latest_data['info'].get('requires_dist'):
        latest_requires = latest_data['info']['requires_dist']
        for req in latest_requires:
            if ';' in req: continue # Skip environment specific markers for simplicity
            
            req_match = re.match(r'^([a-zA-Z0-9\-_]+)', req)
            if req_match:
                req_basename = req_match.group(1).lower()
                for p in all_packages:
                    if p['package'] == req_basename and p['package'] != package_name:
                        # Found a requirement that matches another pinned package
                        conflicts.append(f"Clashes with {p['package']} == {p['version']}")
                        if p['package'] not in conflicted_with:
                            conflicted_with.append(p['package'])
    
    has_cve = len(vulnerabilities) > 0
    has_conflict = len(conflicts) > 0
    
    risk_level = calculate_risk(current_version, latest_version, has_cve, has_conflict)
    explanation = generate_explanation(risk_level, current_version, latest_version, vulnerabilities, conflicts)
    
    return {
        'package': package_name,
        'current_version': current_version,
        'latest_version': latest_version,
        'risk_level': risk_level,
        'explanation': explanation,
        'conflicted_with': conflicted_with
    }
