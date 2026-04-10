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
        if (r.risk_level === 'CRITICAL' || r.risk_level === 'CONFLICT' || r.risk_level === 'HIGH') high++;
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
        CRITICAL: 'risk-critical', CONFLICT: 'risk-conflict',
        HIGH: 'risk-high', MEDIUM: 'risk-medium', LOW: 'risk-low',
        'UP-TO-DATE': 'risk-uptodate', UNKNOWN: 'risk-unknown'
    }[level] || 'risk-unknown';
}
function getRiskIcon(level) {
    const iconStyle = 'width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;';
    return {
        CRITICAL: '🚨',
        CONFLICT: '⚔️',
        HIGH: `<img src="/static/high_risk.svg" alt="High" style="${iconStyle}">`,
        MEDIUM: `<img src="/static/medium_risk.svg" alt="Medium" style="${iconStyle}">`,
        LOW: `<img src="/static/low_risk.svg" alt="Low" style="${iconStyle}">`,
        'UP-TO-DATE': '✨',
        UNKNOWN: '⬜'
    }[level] || '⬜';
}

// ===== Display results table =====
function displayResults(results, totalPackages, fixCommand = "") {
    const section = document.getElementById('resultsSection');
    const body = document.getElementById('resultsBody');
    const summaryBar = document.getElementById('summaryBar');
    const subtitle = document.getElementById('reportSubtitle');

    const counts = { CRITICAL: 0, CONFLICT: 0, HIGH: 0, MEDIUM: 0, LOW: 0, 'UP-TO-DATE': 0, UNKNOWN: 0 };
    results.forEach(r => { counts[r.risk_level] = (counts[r.risk_level] || 0) + 1; });

    subtitle.textContent = `${totalPackages} package${totalPackages !== 1 ? 's' : ''} analyzed`;

    // Only show critical/conflict chips if > 0 to keep UI clean
    const criticalChip = counts.CRITICAL > 0 ? `<span class="summary-chip chip-critical">🚨 ${counts.CRITICAL} Critical CVEs</span>` : '';
    const conflictChip = counts.CONFLICT > 0 ? `<span class="summary-chip chip-conflict">⚔️ ${counts.CONFLICT} Conflicts</span>` : '';

    summaryBar.innerHTML = `
    <span class="summary-chip chip-total">📦 ${totalPackages} Total</span>
    ${criticalChip}
    ${conflictChip}
    <span class="summary-chip chip-danger"><img src="/static/high_risk.svg" alt="High" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.HIGH} High</span>
    <span class="summary-chip chip-warning"><img src="/static/medium_risk.svg" alt="Medium" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.MEDIUM} Medium</span>
    <span class="summary-chip chip-success"><img src="/static/low_risk.svg" alt="Low" style="width:1.2em;height:1.2em;vertical-align:text-bottom;margin-right:2px;"> ${counts.LOW} Low</span>
    <span class="summary-chip chip-info">✨ ${counts['UP-TO-DATE']} Up-to-Date</span>
  `;

    body.innerHTML = '';
    results.forEach(r => {
        const conflicts_text = r.conflicted_with && r.conflicted_with.length > 0 
            ? r.conflicted_with.map(c => `<span class="summary-chip chip-conflict" style="font-size:0.7rem;padding:2px 6px;">${c}</span>`).join(' ') 
            : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><span class="pkg-name">${r.package}</span></td>
      <td><span class="pkg-version">${r.current_version}</span></td>
      <td><span class="pkg-latest">${r.latest_version}</span></td>
      <td><span class="risk-badge ${getRiskClass(r.risk_level)}">${getRiskIcon(r.risk_level)} ${r.risk_level}</span></td>
      <td style="text-align:center;">${conflicts_text}</td>
      <td style="color:var(--text-secondary);font-size:.84rem;">${r.explanation}</td>
    `;
        body.appendChild(tr);
    });

    section.classList.add('visible');
    
    // Handle Auto-Fix Command Container
    const fixContainer = document.getElementById('fixCommandContainer');
    if (fixContainer) {
        if (fixCommand) {
            document.getElementById('fixCommandInput').value = fixCommand;
            fixContainer.style.display = 'block';
        } else {
            fixContainer.style.display = 'none';
        }
    }
    
    updateStats(results);

    // Render doughnut chart
    if (window.renderRiskChart) window.renderRiskChart(counts, totalPackages);

    setTimeout(() => scrollToSection('resultsSection'), 100);
}

// ===== Copy Auto-Fix Command =====
window.copyFixCommand = function(event) {
    event.preventDefault();
    const input = document.getElementById('fixCommandInput');
    input.select();
    document.execCommand('copy');
    
    const btn = event.target;
    const oldText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = oldText; }, 2000);
};

// ===== Risk Doughnut Chart =====
(function () {
    const RISK_META = [
        { key: 'CRITICAL',   label: 'Critical CVE',  color: '#dc2626', glow: 'rgba(220,38,38,.4)' },
        { key: 'CONFLICT',   label: 'Conflict',       color: '#ea580c', glow: 'rgba(234,88,12,.4)' },
        { key: 'HIGH',       label: 'High',           color: '#ef4444', glow: 'rgba(239,68,68,.35)' },
        { key: 'MEDIUM',     label: 'Medium',         color: '#f59e0b', glow: 'rgba(245,158,11,.35)' },
        { key: 'LOW',        label: 'Low',            color: '#10b981', glow: 'rgba(16,185,129,.35)' },
        { key: 'UP-TO-DATE', label: 'Up-to-Date',     color: '#06b6d4', glow: 'rgba(6,182,212,.35)' },
        { key: 'UNKNOWN',    label: 'Unknown',        color: '#64748b', glow: 'rgba(100,116,139,.3)' },
    ];

    // Gap (in radians) between segments
    const GAP = 0.028;
    const INNER_RATIO = 0.58;     // hole size
    const HOVER_EXPAND = 8;       // px outward on hover
    const ANIM_DURATION = 800;    // ms for sweep-in animation

    let currentSegments = [];     // [{meta, count, pct, startAngle, endAngle}]
    let hoveredIdx = -1;
    let animProgress = 0;         // 0→1
    let animStart = null;
    let animRaf = null;

    const canvas  = document.getElementById('riskDonutChart');
    const tooltip = document.getElementById('chartTooltip');
    const legend  = document.getElementById('chartLegend');
    const centerCount = document.getElementById('chartCenterCount');

    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ---- Geometry helpers ----
    function getCenter() { return { cx: canvas.width / 2, cy: canvas.height / 2 }; }
    function getRadius() { return Math.min(canvas.width, canvas.height) / 2 - 6; }
    function getInnerR() { return getRadius() * INNER_RATIO; }

    // ---- Draw ----
    function draw(progress) {
        const { cx, cy } = getCenter();
        const outerR = getRadius();
        const innerR = getInnerR();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!currentSegments.length) return;

        const totalAngle = Math.PI * 2 * progress;

        currentSegments.forEach((seg, i) => {
            if (seg.count === 0) return;

            // Clamp to animation progress
            const segStart = seg.startAngle;
            const segEnd   = seg.endAngle;

            // How much of this segment is revealed at `progress`
            const clampedEnd = Math.min(segEnd, seg.startAngle + (seg.endAngle - seg.startAngle));
            const revealedEnd = Math.min(clampedEnd, -Math.PI / 2 + totalAngle);
            if (revealedEnd <= segStart) return;

            const isHovered = hoveredIdx === i;
            const r = isHovered ? outerR + HOVER_EXPAND : outerR;
            const midAngle = (segStart + Math.min(revealedEnd, segEnd)) / 2;
            const dx = isHovered ? Math.cos(midAngle) * (HOVER_EXPAND / 2) : 0;
            const dy = isHovered ? Math.sin(midAngle) * (HOVER_EXPAND / 2) : 0;

            ctx.save();
            ctx.translate(dx, dy);

            if (isHovered) {
                ctx.shadowColor = seg.meta.glow;
                ctx.shadowBlur = 18;
            }

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(segStart + GAP / 2) * innerR, cy + Math.sin(segStart + GAP / 2) * innerR);
            ctx.arc(cx, cy, r, segStart + GAP / 2, revealedEnd - GAP / 2);
            ctx.arc(cx, cy, innerR, revealedEnd - GAP / 2, segStart + GAP / 2, true);
            ctx.closePath();
            ctx.fillStyle = seg.meta.color;
            ctx.fill();

            ctx.restore();
        });
    }

    // ---- Animation ----
    function animate(ts) {
        if (!animStart) animStart = ts;
        const elapsed = ts - animStart;
        animProgress = Math.min(elapsed / ANIM_DURATION, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - animProgress, 3);
        draw(eased);
        if (animProgress < 1) {
            animRaf = requestAnimationFrame(animate);
        } else {
            draw(1);
        }
    }

    function startAnimation() {
        if (animRaf) cancelAnimationFrame(animRaf);
        animStart = null;
        animProgress = 0;
        animRaf = requestAnimationFrame(animate);
    }

    // ---- Build segments from counts ----
    function buildSegments(counts) {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const active = RISK_META.filter(m => counts[m.key] > 0);
        const segments = [];
        let angle = -Math.PI / 2; // start at top

        active.forEach(meta => {
            const count = counts[meta.key] || 0;
            if (!count) return;
            const sweep = (count / total) * Math.PI * 2;
            segments.push({
                meta,
                count,
                pct: Math.round((count / total) * 1000) / 10,
                startAngle: angle,
                endAngle: angle + sweep,
            });
            angle += sweep;
        });
        return segments;
    }

    // ---- Legend ----
    function buildLegend(segments, total) {
        legend.innerHTML = '';
        segments.forEach((seg, i) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.dataset.idx = i;
            item.innerHTML = `
                <span class="legend-dot" style="background:${seg.meta.color};box-shadow:0 0 8px ${seg.meta.glow};"></span>
                <span class="legend-label">${seg.meta.label}</span>
                <span class="legend-count">${seg.count}</span>
                <span class="legend-pct">${seg.pct}%</span>
            `;
            item.addEventListener('mouseenter', () => { hoveredIdx = i; draw(1); showTooltip(seg, null); });
            item.addEventListener('mouseleave', () => { hoveredIdx = -1; draw(1); hideTooltip(); });
            legend.appendChild(item);
        });
    }

    // ---- Tooltip helpers ----
    function showTooltip(seg, mouseEvent) {
        tooltip.textContent = `${seg.meta.label}: ${seg.count} package${seg.count !== 1 ? 's' : ''} (${seg.pct}%)`;
        tooltip.style.display = 'block';
        if (mouseEvent) {
            tooltip.style.left = mouseEvent.clientX + 'px';
            tooltip.style.top  = mouseEvent.clientY + 'px';
        }
    }
    function hideTooltip() {
        tooltip.style.display = 'none';
        hoveredIdx = -1;
    }

    // ---- Hit-test: which segment is at (x, y) relative to canvas? ----
    function hitTest(x, y) {
        const { cx, cy } = getCenter();
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const innerR = getInnerR();
        const outerR = getRadius() + HOVER_EXPAND; // generous hit area

        if (dist < innerR || dist > outerR) return -1;

        let angle = Math.atan2(dy, dx);
        // Normalize to start from -π/2
        currentSegments.forEach((seg, i) => {
            // Normalize angles
        });

        for (let i = 0; i < currentSegments.length; i++) {
            const seg = currentSegments[i];
            let a = angle;
            // Wrap angle so it sits within the circle's 0..2π range starting from seg.startAngle's origin
            const start = seg.startAngle;
            const end   = seg.endAngle;
            // Both will be in [-π/2, 3π/2]
            if (a < start && a + Math.PI * 2 < end) a += Math.PI * 2;
            if (a >= start && a <= end) return i;
        }
        return -1;
    }

    // ---- Mouse events on canvas ----
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width  / rect.width);
        const y = (e.clientY - rect.top)  * (canvas.height / rect.height);
        const idx = hitTest(x, y);

        if (idx !== hoveredIdx) {
            hoveredIdx = idx;
            draw(1);
        }
        if (idx >= 0) {
            showTooltip(currentSegments[idx], e);
            canvas.style.cursor = 'pointer';
        } else {
            hideTooltip();
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredIdx = -1;
        draw(1);
        hideTooltip();
    });

    // ---- Public API: renderChart(counts, total) ----
    window.renderRiskChart = function (counts, total) {
        currentSegments = buildSegments(counts);
        hoveredIdx = -1;

        // Center label
        centerCount.textContent = total;

        buildLegend(currentSegments, total);

        document.getElementById('chartSection').style.display = 'block';
        startAnimation();
    };

    // ---- Public API: clearChart() ----
    window.clearRiskChart = function () {
        if (animRaf) cancelAnimationFrame(animRaf);
        currentSegments = [];
        hoveredIdx = -1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        legend.innerHTML = '';
        centerCount.textContent = '0';
        document.getElementById('chartSection').style.display = 'none';
        hideTooltip();
    };
})();

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
    if (window.clearRiskChart) window.clearRiskChart();
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
        displayResults(data.results, data.total_packages, data.fix_command);
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
