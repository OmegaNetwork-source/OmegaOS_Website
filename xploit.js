// Xploit Framework Logic

const MODULES = [
    {
        id: 'auxiliary/scanner/http/robust_scan',
        type: 'AUXILIARY',
        name: 'Full Web Vulnerability Scanner',
        desc: 'Fuzzes paths (/admin, /robots.txt), checks headers, and server version.',
        fields: [
            { id: 'rhost', label: 'RHOSTS (Target IP/URL)', type: 'text', def: 'http://localhost' }
        ]
    },
    {
        id: 'payload/windows/powershell_reverse_tcp',
        type: 'PAYLOAD',
        name: 'PowerShell Reverse TCP',
        desc: 'Windows one-liner reverse shell.',
        fields: [
            { id: 'lhost', label: 'LHOST', type: 'text', def: '127.0.0.1' },
            { id: 'lport', label: 'LPORT', type: 'number', def: '4444' }
        ]
    },
    {
        id: 'payload/linux/bash_reverse_tcp',
        type: 'PAYLOAD',
        name: 'Bash Reverse TCP',
        desc: 'Linux/Unix reverse shell using /dev/tcp.',
        fields: [
            { id: 'lhost', label: 'LHOST', type: 'text', def: '127.0.0.1' },
            { id: 'lport', label: 'LPORT', type: 'number', def: '4444' }
        ]
    },
    {
        id: 'payload/cmd/batch_reverse_tcp',
        type: 'PAYLOAD',
        name: 'Windows Batch (CMD)',
        desc: 'Classic .bat file reverse shell wrapper.',
        fields: [
            { id: 'lhost', label: 'LHOST', type: 'text', def: '127.0.0.1' },
            { id: 'lport', label: 'LPORT', type: 'number', def: '4444' }
        ]
    },
    {
        id: 'exploit/multi/handler',
        type: 'EXPLOIT',
        name: 'Multi-Handler Listener',
        desc: 'Starts a TCP listener to catch incoming reverse shells.',
        fields: [
            { id: 'lport', label: 'LPORT (Listen Port)', type: 'number', def: '4444' }
        ]
    }
];

let currentModule = null;

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar(MODULES);

    // Listen for logs
    if (window.electronAPI && window.electronAPI.onXploitLog) {
        window.electronAPI.onXploitLog((data) => {
            log(data.msg, data.type);
        });
    }

    // Search
    document.getElementById('searchBox').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = MODULES.filter(m => m.name.toLowerCase().includes(val) || m.id.includes(val));
        renderSidebar(filtered);
    });
});

function renderSidebar(list) {
    const container = document.getElementById('moduleList');
    container.innerHTML = '';
    list.forEach(mod => {
        const el = document.createElement('div');
        el.className = 'module-item';
        el.innerHTML = `<div class="mod-type">${mod.type}</div><div class="mod-name">${mod.name}</div>`;
        el.onclick = () => selectModule(mod, el);
        container.appendChild(el);
    });
}

function selectModule(mod, el) {
    currentModule = mod;

    // Highlight
    document.querySelectorAll('.module-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');

    // Render Config
    document.getElementById('confTitle').innerText = mod.name;
    document.getElementById('confDesc').innerText = mod.id + ' // ' + mod.desc;

    const form = document.getElementById('confForm');
    form.innerHTML = '';

    mod.fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'form-group';
        row.innerHTML = `
            <label class="form-label">${f.label}</label>
            <input class="form-input" id="inp_${f.id}" type="${f.type}" value="${f.def}" ${f.readonly ? 'readonly' : ''}>
        `;
        form.appendChild(row);
    });

    const btn = document.createElement('button');
    btn.className = 'exploit-btn';
    btn.innerText = mod.type === 'PAYLOAD' ? 'GENERATE' : 'EXPLOIT';
    btn.onclick = executeModule;
    form.appendChild(btn);
}

async function executeModule() {
    if (!currentModule) return;

    const params = {};
    currentModule.fields.forEach(f => {
        params[f.id] = document.getElementById(`inp_${f.id}`).value;
    });

    log(`[*] Running ${currentModule.name}...`);

    try {
        if (currentModule.id === 'exploit/multi/handler') {
            log(`[*] Starting listener on port ${params.lport}...`, 'info');
            const res = await window.electronAPI.invoke('xploit-start-listener', params.lport);
            if (res.success) log(`[+] ${res.msg}`, 'success');
            else log(`[-] ${res.error}`, 'error');
        }

        else if (currentModule.type === 'PAYLOAD') {
            log(`[*] Generating payload for ${params.lhost}:${params.lport}...`, 'info');

            let type = 'cmd';
            if (currentModule.id.includes('powershell')) type = 'powershell';
            if (currentModule.id.includes('bash')) type = 'bash';
            if (currentModule.id.includes('python')) type = 'python';

            const res = await window.electronAPI.invoke('xploit-generate-payload', {
                type: type,
                host: params.lhost,
                port: params.lport
            });
            if (res.success) {
                log(`[+] Payload written to: ${res.path}`, 'success');
            } else {
                log(`[-] Error: ${res.error}`, 'error');
            }
        }

        else if (currentModule.type === 'AUXILIARY') {
            log(`[*] Scanning ${params.rhost}... (Fuzzing enabled)`, 'info');
            const res = await window.electronAPI.invoke('xploit-scan-web', params.rhost);

            if (res.success) {
                const d = res.data;
                log(`[+] Server: ${d.server}`, 'success');

                if (d.foundPaths && d.foundPaths.length > 0) {
                    log(`[+] Discovered Paths:`, 'success');
                    d.foundPaths.forEach(p => log(`    > ${p.path} [${p.status}]`, 'success'));
                } else {
                    log(`[*] No interesting paths found.`, 'info');
                }

                if (d.vulns.length > 0) {
                    d.vulns.forEach(v => log(`[!] VULNERABILITY: ${v}`, 'warn'));
                }
            } else {
                log(`[-] Scan failed: ${res.error}`, 'error');
            }
        }

    } catch (e) {
        log(`[-] Execution error: ${e.message}`, 'error');
    }
}

function log(msg, type = 'normal') {
    const c = document.getElementById('console');
    const l = document.createElement('div');
    l.className = `log-line log-${type}`;
    l.innerHTML = `<span class="prompt">msf6 ></span> ${msg}`;
    c.appendChild(l);
    c.scrollTop = c.scrollHeight;
}

function downloadBlob(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
