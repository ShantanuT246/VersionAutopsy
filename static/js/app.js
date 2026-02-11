// VersionAutopsy - Frontend JavaScript

// ===== Form 1: Analyze Dependencies =====
document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const requirements = document.getElementById('requirements').value.trim();
    const errorDiv = document.getElementById('analyzeError');
    const loader = document.getElementById('analyzeLoader');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Client-side validation
    if (!requirements) {
        showError(errorDiv, 'Please enter your requirements.txt content');
        return;
    }
    
    // Show loader
    loader.classList.add('active');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requirements })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        displayResults(data.results, data.total_packages);
        
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        loader.classList.remove('active');
        submitBtn.disabled = false;
    }
});

// ===== Form 2: Check Single Package =====
document.getElementById('checkPackageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const packageName = document.getElementById('packageName').value.trim();
    const currentVersion = document.getElementById('currentVersion').value.trim();
    const errorDiv = document.getElementById('checkPackageError');
    const loader = document.getElementById('checkLoader');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Client-side validation
    if (!packageName) {
        showError(errorDiv, 'Please enter a package name');
        return;
    }
    
    if (!currentVersion) {
        showError(errorDiv, 'Please enter the current version');
        return;
    }
    
    // Validate version format
    if (!/^\d+(\.\d+)*$/.test(currentVersion)) {
        showError(errorDiv, 'Invalid version format. Use semantic versioning (e.g., 2.31.0)');
        return;
    }
    
    // Show loader
    loader.classList.add('active');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/check-package', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                package: packageName, 
                version: currentVersion 
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Package check failed');
        }
        
        displaySingleResult(data.result);
        
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        loader.classList.remove('active');
        submitBtn.disabled = false;
    }
});

// ===== Form 3: Submit Feedback =====
document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const errorDiv = document.getElementById('feedbackError');
    const successDiv = document.getElementById('feedbackSuccess');
    const loader = document.getElementById('feedbackLoader');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous messages
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    successDiv.textContent = '';
    successDiv.classList.remove('show');
    
    // Client-side validation
    if (!name) {
        showError(errorDiv, 'Please enter your name');
        return;
    }
    
    if (!email) {
        showError(errorDiv, 'Please enter your email');
        return;
    }
    
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        showError(errorDiv, 'Please enter a valid email address');
        return;
    }
    
    if (!message) {
        showError(errorDiv, 'Please enter your message');
        return;
    }
    
    // Show loader
    loader.classList.add('active');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, message })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Feedback submission failed');
        }
        
        // Show success message
        successDiv.textContent = data.message;
        successDiv.classList.add('show');
        
        // Reset form
        e.target.reset();
        
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        loader.classList.remove('active');
        submitBtn.disabled = false;
    }
});

// ===== Helper Functions =====

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function displayResults(results, totalPackages) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const resultsBody = document.getElementById('resultsBody');
    
    // Count risks
    const risksCount = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        'UP-TO-DATE': 0,
        UNKNOWN: 0
    };
    
    results.forEach(result => {
        risksCount[result.risk_level] = (risksCount[result.risk_level] || 0) + 1;
    });
    
    // Update summary
    resultsSummary.innerHTML = `
        <strong>Analyzed ${totalPackages} packages:</strong>
        <span style="color: var(--danger-color); margin-left: 10px;">⚠️ ${risksCount.HIGH} High Risk</span>
        <span style="color: var(--warning-color); margin-left: 10px;">⚡ ${risksCount.MEDIUM} Medium Risk</span>
        <span style="color: var(--success-color); margin-left: 10px;">✅ ${risksCount.LOW} Low Risk</span>
        <span style="color: var(--primary-color); margin-left: 10px;">✨ ${risksCount['UP-TO-DATE']} Up-to-Date</span>
    `;
    
    // Clear previous results
    resultsBody.innerHTML = '';
    
    // Populate table
    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${result.package}</strong></td>
            <td>${result.current_version}</td>
            <td>${result.latest_version}</td>
            <td><span class="risk-badge ${getRiskClass(result.risk_level)}">${result.risk_level}</span></td>
            <td>${result.explanation}</td>
        `;
        resultsBody.appendChild(row);
    });
    
    // Show results section
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displaySingleResult(result) {
    const singleResult = document.getElementById('singleResult');
    const resultCard = document.getElementById('resultCard');
    
    resultCard.innerHTML = `
        <h3>📦 ${result.package}</h3>
        <p><strong>Current Version:</strong> ${result.current_version}</p>
        <p><strong>Latest Version:</strong> ${result.latest_version}</p>
        <span class="risk-badge ${getRiskClass(result.risk_level)}">${result.risk_level}</span>
        <p style="margin-top: 15px; color: var(--text-primary);">${result.explanation}</p>
    `;
    
    // Show single result
    singleResult.style.display = 'block';
    
    // Scroll to result
    singleResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getRiskClass(riskLevel) {
    const classMap = {
        'HIGH': 'risk-high',
        'MEDIUM': 'risk-medium',
        'LOW': 'risk-low',
        'UP-TO-DATE': 'risk-uptodate',
        'UNKNOWN': 'risk-unknown'
    };
    return classMap[riskLevel] || 'risk-unknown';
}
