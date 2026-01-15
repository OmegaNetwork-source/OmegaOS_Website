// Omega Vuln Scanner Frontend

let pollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const targetInput = document.getElementById('targetInput');
    const targetType = document.getElementById('targetType');
    const portInput = document.getElementById('portInput');
    const scanBtn = document.getElementById('scanBtn');
    const progressArea = document.getElementById('progressArea');
    const scanStatus = document.getElementById('scanStatus');
    const scanPercent = document.getElementById('scanPercent');
    const progressFill = document.getElementById('progressFill');
    const resultsList = document.getElementById('resultsList');
    const statsDisplay = document.getElementById('statsDisplay');

    // Window Controls
    let currentWindowId = null;

    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.getWindowId?.().then(id => {
            if (id) currentWindowId = id;
        });
    }

    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.appWindowMinimize(currentWindowId);
    });

    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.appWindowMaximize(currentWindowId);
    });

    document.getElementById('closeBtn')?.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.appWindowClose(currentWindowId);
    });

    // Start Scan
    scanBtn.addEventListener('click', async () => {
        const target = targetInput.value.trim();
        const type = targetType.value;
        const ports = portInput.value.trim() || 'common';

        if (!target) {
            alert('Please enter a target IP or hostname');
            return;
        }

        // Reset UI
        resultsList.innerHTML = '<div class="empty-state"><div class="scan-pulse"></div><p>Scanning target...</p></div>';
        statsDisplay.textContent = '';
        progressArea.classList.add('active');
        scanBtn.disabled = true;
        updateProgress(0, 'Initializing...');

        try {
            // Start scan via IPC
            const result = await window.electronAPI.invoke('vuln-start-scan', target, {
                type: type,
                ports: ports
            });

            if (result && result.error) {
                throw new Error(result.error);
            }

            // Start polling for progress
            startPolling();
        } catch (error) {
            console.error('Scan error:', error);
            alert('Failed to start scan: ' + error.message);
            resetUI();
        }
    });

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const progressData = await window.electronAPI.invoke('vuln-get-progress');

                updateProgress(progressData.progress, `Scanning... ${progressData.progress}%`);

                if (!progressData.isScanning) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    completeScan();
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 500);
    }

    function updateProgress(percent, status) {
        progressFill.style.width = percent + '%';
        scanPercent.textContent = percent + '%';
        if (status) scanStatus.textContent = status;
    }

    async function completeScan() {
        scanBtn.disabled = false;
        progressArea.classList.remove('active');

        try {
            const results = await window.electronAPI.invoke('vuln-get-results');
            renderResults(results);
        } catch (e) {
            resultsList.innerHTML = `<div class="result-item" style="color: var(--danger)">Error retrieving results: ${e.message}</div>`;
        }
    }

    function renderResults(results) {
        if (!results || (!results.openPorts.length && !results.vulnerabilities.length)) {
            resultsList.innerHTML = '<div class="empty-state"><p>No open ports or vulnerabilities found.</p></div>';
            document.getElementById('summaryDashboard').style.display = 'none';
            return;
        }

        // Show Summary Dashboard
        const summaryDashboard = document.getElementById('summaryDashboard');
        const osValue = document.getElementById('osValue');
        const portsValue = document.getElementById('portsValue');
        const vulnsValue = document.getElementById('vulnsValue');
        const riskValue = document.getElementById('riskValue');

        summaryDashboard.style.display = 'flex';

        // Populate OS
        if (results.os) {
            osValue.innerHTML = `<span style="font-size: 24px;">${results.os.icon || ''}</span> ${results.os.name}`;
            osValue.title = `Confidence: ${results.os.confidence}`;
        } else {
            osValue.textContent = 'Unknown';
        }

        // Populate Counts
        portsValue.textContent = results.openPorts.length;
        vulnsValue.textContent = results.vulnerabilities.length;

        // Populate Risk Score
        const score = results.riskScore || 0;
        riskValue.textContent = score;

        // Risk Color Coding
        if (score >= 80) riskValue.style.color = 'var(--danger)';
        else if (score >= 50) riskValue.style.color = 'var(--warning)';
        else if (score >= 20) riskValue.style.color = '#facc15';
        else riskValue.style.color = 'var(--success)';

        // Update detailed stats title (optional text reset)
        statsDisplay.innerHTML = '';

        resultsList.innerHTML = '';

        // Render Vulnerabilities first
        if (results.vulnerabilities.length > 0) {
            results.vulnerabilities.forEach(vuln => {
                const li = document.createElement('li');
                li.className = 'result-item';

                const severityClass = `sev-${vuln.severity || 'info'}`;

                li.innerHTML = `
                    <div class="vuln-header">
                        <span class="severity-badge ${severityClass}">${vuln.severity}</span>
                        <div style="flex: 1">
                            <div class="vuln-title">${escapeHtml(vuln.title)}</div>
                            <div class="vuln-meta">
                                ${vuln.cve ? `<span style="color: var(--accent); margin-right: 10px;">${vuln.cve}</span>` : ''}
                                Service: ${vuln.service} ${vuln.version ? `v${vuln.version}` : ''} (Port ${vuln.port})
                            </div>
                        </div>
                    </div>
                    <div class="vuln-desc">${escapeHtml(vuln.description)}</div>
                    <div class="vuln-details">
                        ${vuln.fix_steps ? `
                        <div class="vuln-detail-row" style="flex-direction: column; align-items: flex-start;">
                            <span class="label">FIX:</span>
                            <div class="step-list">
                                ${vuln.fix_steps.map((step, i) => `
                                    <div class="step-item">
                                        <span class="step-num">${i + 1}.</span>
                                        <span class="step-text">${escapeHtml(step)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>` : (vuln.fix ? `
                        <div class="vuln-detail-row">
                            <span class="label">FIX:</span>
                            <span class="value" style="color: var(--success)">${escapeHtml(vuln.fix)}</span>
                        </div>` : '')}

                        ${vuln.exploit_steps ? `
                        <div class="vuln-detail-row exploit-section" style="flex-direction: column; align-items: flex-start;">
                            <span class="label" style="color: var(--danger)">EXPLOIT STEPS:</span>
                            <div class="step-list">
                                ${vuln.exploit_steps.map((step, i) => `
                                    <div class="step-item" style="background: rgba(239, 68, 68, 0.1);">
                                        <span class="step-num" style="color: var(--danger)">${i + 1}.</span>
                                        <span class="step-text" style="color: #faa">${escapeHtml(step)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>` : ''}

                        ${vuln.exploit_url ? `
                        <div class="vuln-detail-row" style="margin-top: 5px;">
                            <span class="label">REF:</span>
                            <a href="#" class="link" onclick="openExternal('${vuln.exploit_url}')">Exploit Reference ↗</a>
                        </div>` : ''}
                    </div>
                `;
                resultsList.appendChild(li);
            });
        }

        // Render Open Ports info
        if (results.openPorts.length > 0) {
            const portsLi = document.createElement('li');
            portsLi.className = 'result-item';
            portsLi.innerHTML = `
                <div class="vuln-header">
                    <span class="severity-badge sev-info">INFO</span>
                    <div class="vuln-title">Open Ports / Services</div>
                </div>
                <div class="vuln-details" style="margin-top: 10px;">
                    ${results.openPorts.map(p => `
                        <div class="vuln-detail-row">
                            <span class="value" style="width: 50px;">${p.port}</span>
                            <span class="value" style="color: var(--accent); width: 80px;">${p.service}</span>
                            <span class="value" style="color: var(--text-dim);">${p.banner ? escapeHtml(p.banner).substring(0, 50) + (p.banner.length > 50 ? '...' : '') : ''}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            resultsList.appendChild(portsLi);
        }
    }

    function resetUI() {
        scanBtn.disabled = false;
        progressArea.classList.remove('active');
        document.getElementById('summaryDashboard').style.display = 'none';
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Expose for onclick handlers (Corrected function name)
    window.openExternal = (url) => {
        window.electronAPI.openExternalUrl(url);
    };
});
