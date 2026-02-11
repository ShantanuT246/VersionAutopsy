"""
VersionAutopsy - Dependency Risk Analyzer
Core module for version comparison and risk assessment
"""

import re
import requests
from typing import Dict, Tuple, Optional


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
    Parse semantic version string into major, minor, patch components.
    
    Args:
        version_string: Version string like "2.31.0"
        
    Returns:
        Tuple of (major, minor, patch) as integers
    """
    parts = version_string.split('.')
    major = int(parts[0]) if len(parts) > 0 else 0
    minor = int(parts[1]) if len(parts) > 1 else 0
    patch = int(parts[2]) if len(parts) > 2 else 0
    
    return (major, minor, patch)


def fetch_latest_version(package_name: str) -> Optional[str]:
    """
    Fetch the latest version of a package from PyPI.
    
    Args:
        package_name: Name of the PyPI package
        
    Returns:
        Latest version string or None if package not found
    """
    try:
        url = f"https://pypi.org/pypi/{package_name}/json"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return data['info']['version']
        else:
            return None
    except Exception as e:
        print(f"Error fetching version for {package_name}: {e}")
        return None


def calculate_risk(current_version: str, latest_version: str) -> str:
    """
    Calculate upgrade risk based on semantic versioning rules.
    
    Args:
        current_version: Current version string
        latest_version: Latest available version string
        
    Returns:
        Risk level: "LOW", "MEDIUM", or "HIGH"
    """
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


def generate_explanation(risk_level: str, package: str, current: str, latest: str) -> str:
    """
    Generate plain-English explanation of the upgrade risk.
    
    Args:
        risk_level: The calculated risk level
        package: Package name
        current: Current version
        latest: Latest version
        
    Returns:
        Human-readable explanation string
    """
    current_parts = parse_version(current)
    latest_parts = parse_version(latest)
    
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


def analyze_package(package_name: str, current_version: str) -> Dict:
    """
    Analyze a single package and return risk assessment.
    
    Args:
        package_name: Name of the package
        current_version: Current installed version
        
    Returns:
        Dictionary with analysis results
    """
    latest_version = fetch_latest_version(package_name)
    
    if latest_version is None:
        return {
            'package': package_name,
            'current_version': current_version,
            'latest_version': 'Not Found',
            'risk_level': 'UNKNOWN',
            'explanation': f'Package "{package_name}" not found on PyPI. Please verify the package name.'
        }
    
    risk_level = calculate_risk(current_version, latest_version)
    explanation = generate_explanation(risk_level, package_name, current_version, latest_version)
    
    return {
        'package': package_name,
        'current_version': current_version,
        'latest_version': latest_version,
        'risk_level': risk_level,
        'explanation': explanation
    }
