// VersionAutopsy — Dashboard JS

// ===== Utility: Scroll to section =====
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Utility: Show / hide errors =====
function showError(errorDiv, textSpan, message) {
    textSpan.textContent = message;
    errorDiv.classList.add('show');
}
function clearError(errorDiv) {
    errorDiv.classList.remove('show');
}

// ===== Utility: Animate counter =====
function animateCounter(el, target) {
    const duration = 600;
    const start = parseInt(el.textContent) || 0;
    const range = target - start;
    const startTime = performance.now();
    function update(now) {
        const elapsed = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - elapsed, 3);
        el.textContent = Math.round(start + range * ease);
        if (elapsed < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ===== Update Stats Cards =====
function updateStats(results) {
    let high = 0, medium = 0, safe = 0;
    results.forEach(r => {
        if (r.risk_level === 'HIGH') high++;
        else if (r.risk_level === 'MEDIUM') medium++;
        else safe++;
    });
    animateCounter(document.getElementById('statTotal'), results.length);
    animateCounter(document.getElementById('statHigh'), high);
    animateCounter(document.getElementById('statMedium'), medium);
    animateCounter(document.getElementById('statSafe'), safe);

    // Sidebar badge
    const badge = document.getElementById('navBadge');
    badge.style.display = results.length ? 'inline-block' : 'none';
    badge.textContent = results.length;
}

// ===== Risk helper =====
function getRiskClass(level) {
    return {
        HIGH: 'risk-high', MEDIUM: 'risk-medium', LOW: 'risk-low',
        'UP-TO-DATE': 'risk-uptodate', UNKNOWN: 'risk-unknown'
    }[level] || 'risk-unknown';
}
function getRiskIcon(level) {
    return { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢', 'UP-TO-DATE': '✨', UNKNOWN: '⬜' }[level] || '⬜';
}

// ===== Display results table =====
function displayResults(results, totalPackages) {
    const section = document.getElementById('resultsSection');
    const body = document.getElementById('resultsBody');
    const summaryBar = document.getElementById('summaryBar');
    const subtitle = document.getElementById('reportSubtitle');

    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, 'UP-TO-DATE': 0, UNKNOWN: 0 };
    results.forEach(r => { counts[r.risk_level] = (counts[r.risk_level] || 0) + 1; });

    subtitle.textContent = `${totalPackages} package${totalPackages !== 1 ? 's' : ''} analyzed`;

    summaryBar.innerHTML = `
    <span class="summary-chip chip-total">📦 ${totalPackages} Total</span>
    <span class="summary-chip chip-danger">🔴 ${counts.HIGH} High</span>
    <span class="summary-chip chip-warning">⚡ ${counts.MEDIUM} Medium</span>
    <span class="summary-chip chip-success">✅ ${counts.LOW} Low</span>
    <span class="summary-chip chip-info">✨ ${counts['UP-TO-DATE']} Up-to-Date</span>
  `;

    body.innerHTML = '';
    results.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><span class="pkg-name">${r.package}</span></td>
      <td><span class="pkg-version">${r.current_version}</span></td>
      <td><span class="pkg-latest">${r.latest_version}</span></td>
      <td><span class="risk-badge ${getRiskClass(r.risk_level)}">${getRiskIcon(r.risk_level)} ${r.risk_level}</span></td>
      <td style="color:var(--text-secondary);font-size:.84rem;">${r.explanation}</td>
    `;
        body.appendChild(tr);
    });

    section.classList.add('visible');
    updateStats(results);

    setTimeout(() => scrollToSection('resultsSection'), 100);
}

// ===== Display single result =====
function displaySingleResult(r) {
    const section = document.getElementById('singleResult');
    const card = document.getElementById('resultCard');

    card.innerHTML = `
    <div class="result-detail-item">
      <div class="detail-label">Package</div>
      <div class="detail-value">${r.package}</div>
    </div>
    <div class="result-detail-item">
      <div class="detail-label">Current Version</div>
      <div class="detail-value">${r.current_version}</div>
    </div>
    <div class="result-detail-item">
      <div class="detail-label">Latest Version</div>
      <div class="detail-value">${r.latest_version}</div>
    </div>
    <div class="result-detail-item">
      <div class="detail-label">Risk Level</div>
      <div><span class="risk-badge ${getRiskClass(r.risk_level)}">${getRiskIcon(r.risk_level)} ${r.risk_level}</span></div>
    </div>
    <div class="result-explanation">${r.explanation}</div>
  `;

    section.classList.add('visible');
    setTimeout(() => scrollToSection('singleResult'), 100);
}

// ===== Clear results =====
function clearResults() {
    const section = document.getElementById('resultsSection');
    section.classList.remove('visible');
    document.getElementById('resultsBody').innerHTML = '';
    ['statTotal', 'statHigh', 'statMedium', 'statSafe'].forEach(id => {
        document.getElementById(id).textContent = '0';
    });
    document.getElementById('navBadge').style.display = 'none';
}

// ===== FORM 1: Analyze Dependencies =====
document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const requirements = document.getElementById('requirements').value.trim();
    const errorDiv = document.getElementById('analyzeError');
    const errorText = document.getElementById('analyzeErrorText');
    const loader = document.getElementById('analyzeLoader');
    const btn = document.getElementById('analyzeBtn');

    clearError(errorDiv);

    if (!requirements) {
        showError(errorDiv, errorText, 'Please paste your requirements.txt content.');
        return;
    }

    loader.classList.add('active');
    btn.disabled = true;

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
        displayResults(data.results, data.total_packages);
    } catch (err) {
        showError(errorDiv, errorText, err.message);
    } finally {
        loader.classList.remove('active');
        btn.disabled = false;
    }
});

// ===== FORM 2: Check Single Package =====
document.getElementById('checkPackageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const packageName = document.getElementById('packageName').value.trim();
    const currentVersion = document.getElementById('currentVersion').value.trim();
    const errorDiv = document.getElementById('checkPackageError');
    const errorText = document.getElementById('checkPackageErrorText');
    const loader = document.getElementById('checkLoader');
    const btn = document.getElementById('checkBtn');

    clearError(errorDiv);

    if (!packageName) {
        showError(errorDiv, errorText, 'Please enter a package name.');
        return;
    }
    if (!currentVersion) {
        showError(errorDiv, errorText, 'Please enter the current version.');
        return;
    }
    if (!/^\d+(\.\d+)*$/.test(currentVersion)) {
        showError(errorDiv, errorText, 'Invalid version format. Use semantic versioning, e.g. 2.31.0');
        return;
    }

    loader.classList.add('active');
    btn.disabled = true;

    try {
        const res = await fetch('/api/check-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package: packageName, version: currentVersion })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Package check failed');
        displaySingleResult(data.result);
    } catch (err) {
        showError(errorDiv, errorText, err.message);
    } finally {
        loader.classList.remove('active');
        btn.disabled = false;
    }
});
