// VersionAutopsy — Dashboard JS

// ===== Dark Mode Toggle =====
(function () {
    const html = document.documentElement;
    const STORAGE_KEY = 'va-theme';

    function applyTheme(dark) {
        html.setAttribute('data-theme', dark ? 'dark' : 'light');
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = dark ? '☀️' : '🌙';
    }

    // Restore saved preference (default: light)
    const savedDark = localStorage.getItem(STORAGE_KEY) === 'dark';
    applyTheme(savedDark);

    // Wire up toggle button after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        // Re-apply so button emoji matches (DOMContentLoaded fires after inline scripts)
        applyTheme(localStorage.getItem(STORAGE_KEY) === 'dark');
        btn.addEventListener('click', () => {
            const isDark = html.getAttribute('data-theme') === 'dark';
            const next = !isDark;
            applyTheme(next);
            localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
        });

        // ===== Typewriter effect on subtitle =====
        const subtitle = document.querySelector('.page-subtitle');
        if (subtitle) {
            const fullText = subtitle.textContent.trim();
            subtitle.textContent = '';
            let i = 0;
            const type = () => {
                if (i === 0) subtitle.classList.add('typewriter-active'); // cursor appears only when typing starts
                if (i < fullText.length) {
                    subtitle.textContent += fullText[i++];
                    setTimeout(type, 38);
                } else {
                    subtitle.classList.remove('typewriter-active');
                }
            };
            setTimeout(type, 320);
        }
    });
})();

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
    const iconStyle = 'width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;';
    return {
        HIGH: `<img src="/static/high_risk.svg" alt="High" style="${iconStyle}">`,
        MEDIUM: `<img src="/static/medium_risk.svg" alt="Medium" style="${iconStyle}">`,
        LOW: `<img src="/static/low_risk.svg" alt="Low" style="${iconStyle}">`,
        'UP-TO-DATE': '✨',
        UNKNOWN: '⬜'
    }[level] || '⬜';
}

// ===== Group badge helper =====
const GROUP_META = {
    web: { label: 'Web Stack', color: '#6366f1' },
    data: { label: 'Data Science', color: '#0ea5e9' },
    geo: { label: 'Geospatial', color: '#10b981' },
    viz: { label: 'Visualisation', color: '#f59e0b' },
    http: { label: 'HTTP/Network', color: '#8b5cf6' },
    datetime: { label: 'Date / Time', color: '#ec4899' },
    build: { label: 'Build Tools', color: '#6b7280' },
    other: { label: 'Other', color: '#374151' },
};
function getGroupBadge(group) {
    const meta = GROUP_META[group] || GROUP_META.other;
    return `<span class="group-badge" style="background:${meta.color}20;color:${meta.color};border:1px solid ${meta.color}40">${meta.label}</span>`;
}

// ===== Display results table =====
function displayResults(results, totalPackages, calcTime) {
    const section = document.getElementById('resultsSection');
    const body = document.getElementById('resultsBody');
    const summaryBar = document.getElementById('summaryBar');
    const subtitle = document.getElementById('reportSubtitle');
    const calcTimeEl = document.getElementById('calcTime');

    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, 'UP-TO-DATE': 0, UNKNOWN: 0 };
    results.forEach(r => { counts[r.risk_level] = (counts[r.risk_level] || 0) + 1; });

    subtitle.textContent = `${totalPackages} package${totalPackages !== 1 ? 's' : ''} analyzed`;

    summaryBar.innerHTML = `
    <span class="summary-chip chip-total">📦 ${totalPackages} Total</span>
    <span class="summary-chip chip-danger"><img src="/static/high_risk.svg" alt="High" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.HIGH} High</span>
    <span class="summary-chip chip-warning"><img src="/static/medium_risk.svg" alt="Medium" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.MEDIUM} Medium</span>
    <span class="summary-chip chip-success"><img src="/static/low_risk.svg" alt="Low" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.LOW} Low</span>
    <span class="summary-chip chip-info">✨ ${counts['UP-TO-DATE']} Up-to-Date</span>
  `;

    // Calculation time
    if (calcTimeEl) {
        calcTimeEl.textContent = calcTime != null
            ? `⏱ Analysis completed in ${calcTime}s`
            : '';
    }

    body.innerHTML = '';
    results.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><span class="pkg-name">${r.package}</span></td>
      <td><span class="pkg-version">${r.current_version}</span></td>
      <td><span class="pkg-latest">${r.latest_version}</span></td>
      <td><span class="risk-badge ${getRiskClass(r.risk_level)}">${getRiskIcon(r.risk_level)} ${r.risk_level}</span></td>
      <td>${getGroupBadge(r.conflict_group || 'other')}</td>
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
        displayResults(data.results, data.total_packages, data.calculation_time);
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
