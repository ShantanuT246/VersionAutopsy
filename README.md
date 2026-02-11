# 🔍 VersionAutopsy

**Dependency Risk Analyzer for Python Projects**

VersionAutopsy is a web-based tool that helps developers identify potential dependency upgrade risks in Python projects by analyzing version numbers using semantic versioning rules. Built as an educational project to demonstrate full-stack web development principles.

---

## 📋 Problem Statement

Dependency upgrades often introduce breaking changes that can cause applications to fail. Developers, especially beginners, frequently upgrade libraries without understanding the implications of semantic versioning changes. VersionAutopsy provides a simple, explainable risk assessment based on version number changes, helping users make safer upgrade decisions.

---

## ✨ Features

### Core Functionality
- **Bulk Dependency Analysis**: Paste your entire `requirements.txt` file for comprehensive risk assessment
- **Manual Package Check**: Verify individual package upgrade risks
- **Real-time PyPI Integration**: Fetches latest package versions directly from PyPI
- **Semantic Versioning Analysis**: Applies industry-standard semver rules
- **Risk Level Classification**:
  - 🔴 **HIGH RISK**: Major version changes (breaking changes likely)
  - 🟡 **MEDIUM RISK**: Minor version changes (new features, possible deprecations)
  - 🟢 **LOW RISK**: Patch version changes (bug fixes only)
  - ✨ **UP-TO-DATE**: Already using the latest version
- **Plain-English Explanations**: Clear, actionable insights for each package

### Technical Highlights
- Two validated forms with client-side and server-side validation
- Responsive design (mobile, tablet, desktop)
- Modern gradient UI with color-coded risk indicators
- RESTful API architecture
- Error handling and user-friendly messages

---

## 👥 Team Details

**Project Team**: [Add your team members here]

| Name | Role | Contributions |
|------|------|---------------|
| [Student 1] | Backend Developer | Flask API, version analyzer, PyPI integration |
| [Student 2] | Frontend Developer | HTML/CSS/JS, form validation, UI/UX design |
| [Student 3] | Full-Stack Developer | Integration, testing, documentation |

*Note: Customize the team section based on your actual team composition (1-3 members).*

---

## 🛠️ Technology Stack

- **Backend**: Python 3.x, Flask 3.0.2
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **External API**: PyPI JSON API
- **Dependencies**: Flask, requests

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)
- Internet connection (for PyPI API access)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VersionAutopsy
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the application**
   - Open your browser and navigate to: `http://localhost:5000`

---

## 🚀 Usage Guide

### 1. Analyze Dependencies (Form 1)
- Copy the contents of your `requirements.txt` file
- Paste it into the **Analyze Dependencies** form
- Click "Analyze Dependencies"
- View the comprehensive risk report in the results table

**Example Input:**
```
flask==2.0.0
requests==2.25.0
numpy==1.21.0
pandas==1.3.0
```

### 2. Check Single Package (Form 2)
- Enter the package name (e.g., `django`)
- Enter your current version (e.g., `3.2.0`)
- Click "Check Package"
- View the detailed risk assessment

---

## 📁 Project Structure

```
VersionAutopsy/
├── app.py                      # Flask application with API endpoints
├── version_analyzer.py         # Core logic for version comparison
├── requirements.txt            # Project dependencies
├── templates/
│   └── index.html             # Main HTML page
├── static/
│   ├── css/
│   │   └── style.css          # Styling and responsive design
│   └── js/
│       └── app.js             # Frontend JavaScript
└── README.md                  # This file
```

---

## 🔍 How It Works

### Semantic Versioning Rules

VersionAutopsy uses standard **semantic versioning (semver)** principles:

- **Version Format**: MAJOR.MINOR.PATCH (e.g., 2.31.0)
- **Major Version Change** (1.x.x → 2.x.x): 
  - HIGH RISK - May contain breaking changes
- **Minor Version Change** (1.1.x → 1.2.x): 
  - MEDIUM RISK - New features, possible deprecations
- **Patch Version Change** (1.1.1 → 1.1.2): 
  - LOW RISK - Bug fixes only

### PyPI Integration

1. User submits package name and current version
2. Backend sends GET request to `https://pypi.org/pypi/{package}/json`
3. Extracts latest version from JSON response
4. Compares versions using semver rules
5. Returns risk level with explanation

---

## 🧪 Testing

### Manual Testing Steps

1. **Test Form Validation**
   - Submit empty forms → should show error messages
   - Enter invalid version formats → should reject
   - Enter invalid email format → should reject

2. **Test Dependency Analysis**
   - Use sample requirements.txt with various packages
   - Verify risk levels are calculated correctly
   - Check that results table displays properly

3. **Test Package Check**
   - Check a package with major version difference
   - Check a package with minor version difference
   - Check a package with patch version difference
   - Verify explanations are appropriate

4. **Test Responsive Design**
   - Resize browser to mobile width (< 768px)
   - Verify forms remain usable
   - Check table responsiveness

---

## 🎯 Design Decisions

### Why No External Database?
- **Simplicity**: Focuses on core functionality without added complexity
- **Academic Scope**: Meets project requirements without over-engineering
- **Real-time Data**: PyPI API provides up-to-date information directly

### Why Basic Semantic Versioning Only?
- **Educational Focus**: Demonstrates fundamental concepts clearly
- **Transparency**: Users can understand the logic easily
- **Scope Constraint**: Avoids advanced dependency resolution complexity

### Why Vanilla CSS/JS?
- **Learning Fundamentals**: Reinforces core web development skills
- **No Build Process**: Simple to run and deploy
- **Full Control**: Complete understanding of all styling and behavior

---

## 🚧 Known Limitations

- **No Transitive Dependencies**: Only analyzes directly specified packages
- **Simple Version Parsing**: May not handle all edge cases (alpha, beta, rc versions)
- **No Caching**: Each request queries PyPI (can be slow for many packages)
- **No Authentication**: Feedback is logged but not persisted to a database
- **Limited Error Recovery**: Network failures may not be gracefully handled

---

## 🔮 Future Enhancements

If this project were to be extended, consider:

- **Caching Layer**: Store PyPI responses to reduce API calls
- **Database Integration**: Persist feedback and analysis history
- **Advanced Version Parsing**: Handle pre-release versions (alpha, beta, rc)
- **Dependency Graph**: Visualize package relationships
- **Export Reports**: Download analysis as PDF or CSV
- **Changelog Integration**: Fetch and display package changelogs
- **Batch Analysis**: Upload requirements.txt files directly
- **User Accounts**: Save analysis history per user

---

## 📝 Development Log

### Commit History
This project follows a structured development process:
1. Initial project setup and repository initialization
2. Backend implementation (Flask, version_analyzer)
3. Frontend development (HTML, CSS, JavaScript)
4. Integration and testing
5. Documentation and finalization

See the Git commit history for detailed development progress.

---

## 📄 License

This project is developed for educational purposes as part of a web programming course assignment.

---

## 🙏 Acknowledgments

- **PyPI**: For providing the public JSON API
- **Flask**: For the lightweight web framework
- **Semantic Versioning**: For the standardized versioning scheme

---

## 📞 Support

For questions, issues, or feedback, please use the built-in feedback form in the application or contact the development team.

---

**Built with ❤️ for safer dependency management | VersionAutopsy © 2026**
