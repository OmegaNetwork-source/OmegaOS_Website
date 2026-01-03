// Omega Privacy Monitor - Track System Access
let currentWindowId = null;
let accessLogs = [];
let networkLogs = [];
let startTime = Date.now();

document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
    }

    setupWindowControls();
    setupEventListeners();
    loadStoredLogs();
    startMonitoring();
    updateStats();
    updateDisplay();
});

function setupWindowControls() {
    document.getElementById('minimizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMinimize(currentWindowId);
        }
    });
    document.getElementById('maximizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMaximize(currentWindowId);
        }
    });
    document.getElementById('closeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowClose(currentWindowId);
        }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    const titles = {
        'access': 'File Access Monitor',
        'network': 'Network Activity',
        'permissions': 'System Permissions',
        'logs': 'Activity Logs'
    };
    document.getElementById('tabTitle').textContent = titles[tab];
    
    updateDisplay();
}

function loadStoredLogs() {
    const stored = localStorage.getItem('privacy_monitor_logs');
    if (stored) {
        try {
            const logs = JSON.parse(stored);
            accessLogs = logs.access || [];
            networkLogs = logs.network || [];
        } catch (e) {
            accessLogs = [];
            networkLogs = [];
        }
    }
}

function saveLogs() {
    localStorage.setItem('privacy_monitor_logs', JSON.stringify({
        access: accessLogs.slice(-1000),
        network: networkLogs.slice(-1000)
    }));
}

function startMonitoring() {
    // Monitor file operations via IPC (would need main process hooks)
    // For now, simulate monitoring
    setInterval(() => {
        // This would be replaced with actual IPC listeners
        updateStats();
    }, 1000);
    
    // Add sample entries for demo
    setTimeout(() => {
        logAccess('read', 'document.txt', 'Omega Word');
        logAccess('write', 'spreadsheet.xlsx', 'Omega Sheets');
        logNetwork('https://api.example.com', 'GET', 200);
    }, 2000);
}

function logAccess(type, file, app) {
    const entry = {
        id: Date.now(),
        type: type,
        file: file,
        app: app,
        timestamp: new Date().toISOString(),
        time: Date.now()
    };
    accessLogs.unshift(entry);
    if (accessLogs.length > 1000) accessLogs.pop();
    saveLogs();
    updateStats();
    updateDisplay();
}

function logNetwork(url, method, status) {
    const entry = {
        id: Date.now(),
        url: url,
        method: method,
        status: status,
        timestamp: new Date().toISOString(),
        time: Date.now()
    };
    networkLogs.unshift(entry);
    if (networkLogs.length > 1000) networkLogs.pop();
    saveLogs();
    updateStats();
    updateDisplay();
}

function updateStats() {
    const fileReads = accessLogs.filter(l => l.type === 'read').length;
    const fileWrites = accessLogs.filter(l => l.type === 'write').length;
    const networkCount = networkLogs.length;
    
    document.getElementById('fileAccessCount').textContent = fileReads;
    document.getElementById('fileWriteCount').textContent = fileWrites;
    document.getElementById('networkRequests').textContent = networkCount;
    
    const today = new Date().toDateString();
    const todayRequests = networkLogs.filter(l => new Date(l.time).toDateString() === today).length;
    document.getElementById('requestsToday').textContent = todayRequests;
}

function updateDisplay() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    if (activeTab.id === 'accessTab') {
        updateAccessList();
    } else if (activeTab.id === 'networkTab') {
        updateNetworkList();
    } else if (activeTab.id === 'permissionsTab') {
        updatePermissionsList();
    } else if (activeTab.id === 'logsTab') {
        updateLogsDisplay();
    }
}

function updateAccessList() {
    const list = document.getElementById('fileAccessList');
    if (accessLogs.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No file access recorded</div>';
        return;
    }
    
    list.innerHTML = accessLogs.slice(0, 50).map(log => `
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-type">${log.type === 'read' ? 'Read' : 'Write'}: ${log.file}</div>
                <div class="activity-details">by ${log.app}</div>
            </div>
            <div class="activity-time">${formatTime(log.time)}</div>
        </div>
    `).join('');
}

function updateNetworkList() {
    const list = document.getElementById('networkList');
    if (networkLogs.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No network activity recorded</div>';
        return;
    }
    
    list.innerHTML = networkLogs.slice(0, 50).map(log => `
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-type">${log.method} ${log.url}</div>
                <div class="activity-details">Status: ${log.status}</div>
            </div>
            <div class="activity-time">${formatTime(log.time)}</div>
        </div>
    `).join('');
}

function updatePermissionsList() {
    const list = document.getElementById('permissionsList');
    const permissions = [
        { name: 'File System Access', description: 'Access to isolated file system', allowed: true },
        { name: 'Network Access', description: 'Internet connectivity', allowed: true },
        { name: 'Clipboard Access', description: 'Read/write clipboard', allowed: false },
        { name: 'Camera', description: 'Access camera', allowed: false },
        { name: 'Microphone', description: 'Access microphone', allowed: false },
        { name: 'Location', description: 'Access location data', allowed: false }
    ];
    
    list.innerHTML = permissions.map(perm => `
        <div class="permission-item">
            <div>
                <div class="permission-name">${perm.name}</div>
                <div class="permission-description">${perm.description}</div>
            </div>
            <div class="permission-status ${perm.allowed ? 'allowed' : 'denied'}">
                ${perm.allowed ? 'Allowed' : 'Denied'}
            </div>
        </div>
    `).join('');
}

function updateLogsDisplay() {
    const container = document.getElementById('logsContainer');
    const allLogs = [
        ...accessLogs.map(l => ({ ...l, type: 'access', level: 'info' })),
        ...networkLogs.map(l => ({ ...l, type: 'network', level: 'info' }))
    ].sort((a, b) => b.time - a.time).slice(0, 200);
    
    if (allLogs.length === 0) {
        container.innerHTML = '<div style="color: #666;">No activity logs</div>';
        return;
    }
    
    container.innerHTML = allLogs.map(log => {
        const time = new Date(log.time).toLocaleTimeString();
        let message = '';
        if (log.type === 'access') {
            message = `[${time}] [${log.type.toUpperCase()}] ${log.file} - ${log.app}`;
        } else {
            message = `[${time}] [${log.type.toUpperCase()}] ${log.method} ${log.url} - ${log.status}`;
        }
        return `<div class="log-entry ${log.level}">${message}</div>`;
    }).join('');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString();
}

function clearLogs() {
    if (confirm('Clear all activity logs?')) {
        accessLogs = [];
        networkLogs = [];
        saveLogs();
        updateStats();
        updateDisplay();
    }
}

async function exportLogs() {
    if (!window.electronAPI) return;
    
    const exportData = {
        access: accessLogs,
        network: networkLogs,
        exported: new Date().toISOString()
    };
    
    try {
        const result = await window.electronAPI.saveFileDialog({
            defaultPath: `privacy-logs-${Date.now()}.json`,
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });
        
        if (!result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, JSON.stringify(exportData, null, 2));
            alert('Logs exported successfully!');
        }
    } catch (error) {
        alert('Failed to export logs: ' + error.message);
    }
}

