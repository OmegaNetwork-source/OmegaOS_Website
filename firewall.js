// Omega Firewall - Network Traffic Control
let currentWindowId = null;
let isEnabled = true;
let firewallRules = [];
let firewallLogs = [];
let activeConnections = [];
let searchQuery = '';
let expandedDomains = new Set(); // Track which domains are expanded

// Add error handler at the top level
window.addEventListener('error', (e) => {
    console.error('[FIREWALL] Global error:', e.error);
    alert('Firewall Error: ' + (e.error?.message || e.message));
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[FIREWALL] Unhandled promise rejection:', e.reason);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('[FIREWALL] DOMContentLoaded - initializing...');
    
    try {
        if (window.electronAPI) {
            console.log('[FIREWALL] electronAPI available');
            window.electronAPI.onWindowId((windowId) => {
                currentWindowId = windowId;
                console.log('[FIREWALL] Window ID received:', windowId);
            });
        } else {
            console.error('[FIREWALL] electronAPI NOT available!');
            alert('ERROR: electronAPI not available in firewall window! Check preload.js');
        }

        setupWindowControls();
        setupEventListeners();
        loadRules();
        
        // Wait a bit for electronAPI to be fully ready, then register
        setTimeout(() => {
            startMonitoring(); // Start monitoring first to register for events
        }, 100);
        
        console.log('[FIREWALL] Initialization complete');
    } catch (error) {
        console.error('[FIREWALL] Initialization error:', error);
        alert('Firewall initialization error: ' + error.message);
    }
    
    updateDisplay();
    
    // Cleanup on close
    window.addEventListener('beforeunload', () => {
        if (window.electronAPI && window.electronAPI.firewallUnregister) {
            window.electronAPI.firewallUnregister();
        }
    });
});

function setupWindowControls() {
    try {
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const closeBtn = document.getElementById('closeBtn');
        
        if (!minimizeBtn || !maximizeBtn || !closeBtn) {
            console.error('[FIREWALL] Window control buttons not found!');
            return;
        }
        
        minimizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[FIREWALL] Minimize clicked');
            if (currentWindowId && window.electronAPI) {
                window.electronAPI.appWindowMinimize(currentWindowId);
            }
        });
        
        maximizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[FIREWALL] Maximize clicked');
            if (currentWindowId && window.electronAPI) {
                window.electronAPI.appWindowMaximize(currentWindowId);
            }
        });
        
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[FIREWALL] Close clicked');
            if (currentWindowId && window.electronAPI) {
                window.electronAPI.appWindowClose(currentWindowId);
            }
        });
        
        console.log('[FIREWALL] Window controls setup complete');
    } catch (error) {
        console.error('[FIREWALL] Error setting up window controls:', error);
    }
}

function setupEventListeners() {
    try {
        const toggleBtn = document.getElementById('toggleFirewallBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFirewall();
            });
            console.log('[FIREWALL] Toggle button setup');
        } else {
            console.error('[FIREWALL] Toggle button not found!');
        }
        
        const tabButtons = document.querySelectorAll('.tab-btn');
        if (tabButtons.length > 0) {
            tabButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tab = btn.dataset.tab;
                    console.log('[FIREWALL] Tab clicked:', tab);
                    switchTab(tab);
                });
            });
            console.log('[FIREWALL] Tab buttons setup:', tabButtons.length);
        } else {
            console.error('[FIREWALL] Tab buttons not found!');
        }
        
        const addRuleBtn = document.getElementById('addRuleBtn');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('addRuleModal').classList.add('active');
            });
        }
        
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('addRuleModal').classList.remove('active');
            });
        }
        
        const cancelRuleBtn = document.getElementById('cancelRuleBtn');
        if (cancelRuleBtn) {
            cancelRuleBtn.addEventListener('click', () => {
                document.getElementById('addRuleModal').classList.remove('active');
                document.getElementById('ruleForm').reset();
            });
        }
        
        const ruleForm = document.getElementById('ruleForm');
        if (ruleForm) {
            ruleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addRule(e);
            });
        }
        
        console.log('[FIREWALL] Event listeners setup complete');
    } catch (error) {
        console.error('[FIREWALL] Error setting up event listeners:', error);
        alert('Error setting up firewall UI: ' + error.message);
    }
}

function toggleFirewall() {
    isEnabled = !isEnabled;
    localStorage.setItem('firewall_enabled', isEnabled.toString());
    if (window.electronAPI && window.electronAPI.firewallSetEnabled) {
        window.electronAPI.firewallSetEnabled(isEnabled);
    }
    updateFirewallStatus();
}

function updateFirewallStatus() {
    const dot = document.getElementById('firewallStatusDot');
    const text = document.getElementById('firewallStatusText');
    const btn = document.getElementById('toggleFirewallBtn');
    
    if (!dot || !text || !btn) {
        console.warn('[FIREWALL] Status elements not found');
        return;
    }
    
    if (isEnabled) {
        dot.classList.remove('disabled');
        text.textContent = 'Enabled';
        btn.textContent = 'Disable';
    } else {
        dot.classList.add('disabled');
        text.textContent = 'Disabled';
        btn.textContent = 'Enable';
    }
}

function loadRules() {
    const saved = localStorage.getItem('firewall_rules');
    if (saved) {
        try {
            firewallRules = JSON.parse(saved);
            // Sync rules to main process
            if (window.electronAPI && window.electronAPI.firewallUpdateRules) {
                window.electronAPI.firewallUpdateRules(firewallRules);
            }
        } catch (e) {
            firewallRules = [];
        }
    }
    
    const savedEnabled = localStorage.getItem('firewall_enabled');
    if (savedEnabled !== null) {
        isEnabled = savedEnabled === 'true';
        if (window.electronAPI && window.electronAPI.firewallSetEnabled) {
            window.electronAPI.firewallSetEnabled(isEnabled);
        }
    }
    updateFirewallStatus();
}

function saveRules() {
    localStorage.setItem('firewall_rules', JSON.stringify(firewallRules));
    // Sync rules to main process for actual blocking
    if (window.electronAPI && window.electronAPI.firewallUpdateRules) {
        window.electronAPI.firewallUpdateRules(firewallRules);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    const titles = {
        'rules': 'Firewall Rules',
        'connections': 'Active Connections',
        'logs': 'Firewall Logs'
    };
    document.getElementById('tabTitle').textContent = titles[tab];
    
    // Update terminate all button visibility
    const terminateAllBtn = document.getElementById('terminateAllBtn');
    if (terminateAllBtn) {
        terminateAllBtn.style.display = (tab === 'connections' && activeConnections.length > 0) ? 'flex' : 'none';
    }
    
    updateDisplay();
}

function updateDisplay() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    if (activeTab.id === 'rulesTab') {
        updateRulesList();
    } else if (activeTab.id === 'connectionsTab') {
        updateConnectionsList();
    } else if (activeTab.id === 'logsTab') {
        updateLogsDisplay();
    }
    
    updateStats();
}

// Terminate connection functions
window.terminateConnection = function(index) {
    if (index < 0 || index >= activeConnections.length) return;
    
    const conn = activeConnections[index];
    if (confirm(`Terminate connection to ${conn.url || conn.ip}?`)) {
        // Remove from active connections
        activeConnections.splice(index, 1);
        
        // Log the termination
        logFirewallEvent('terminated', conn.url || conn.ip, 'Connection terminated by user');
        
        // Update display
        updateDisplay();
    }
};

window.terminateAllConnections = function() {
    if (activeConnections.length === 0) return;
    
    if (confirm(`Terminate all ${activeConnections.length} active connections?`)) {
        const count = activeConnections.length;
        activeConnections.length = 0; // Clear all connections
        
        // Log the termination
        logFirewallEvent('terminated', `All connections (${count})`, 'All connections terminated by user');
        
        // Update display
        updateDisplay();
    }
};

// Search functionality
function handleFirewallSearch(query) {
    searchQuery = query.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'block' : 'none';
    }
    
    // Re-render current tab with search filter
    updateDisplay();
}

function clearFirewallSearch() {
    const searchInput = document.getElementById('firewallSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    handleFirewallSearch('');
}

// Make it available globally for inline handlers
window.handleFirewallSearch = handleFirewallSearch;
window.clearFirewallSearch = clearFirewallSearch;

function updateRulesList() {
    const list = document.getElementById('rulesList');
    
    // Filter rules by search query
    let filteredRules = firewallRules;
    if (searchQuery) {
        filteredRules = firewallRules.filter(rule => 
            rule.name.toLowerCase().includes(searchQuery) ||
            rule.target.toLowerCase().includes(searchQuery) ||
            rule.value.toLowerCase().includes(searchQuery) ||
            rule.action.toLowerCase().includes(searchQuery)
        );
    }
    
    if (filteredRules.length === 0) {
        if (firewallRules.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No firewall rules configured</div>';
        } else {
            list.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">No rules match "${searchQuery}"</div>`;
        }
        return;
    }
    
    list.innerHTML = filteredRules.map((rule, index) => {
        // Find original index for delete function
        const originalIndex = firewallRules.indexOf(rule);
        return `
        <div class="rule-item">
            <div class="rule-info">
                <div class="rule-name">${rule.name}</div>
                <div class="rule-details">${rule.target}: ${rule.value}</div>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="rule-action ${rule.action}">${rule.action.toUpperCase()}</span>
                <div class="rule-controls">
                    <button class="control-btn delete" onclick="deleteRule(${originalIndex})">Delete</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Helper function to extract domain from URL
function extractDomain(url) {
    if (!url) return 'Unknown';
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        // If URL parsing fails, try to extract domain manually
        const match = url.match(/https?:\/\/([^\/]+)/);
        return match ? match[1] : url;
    }
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper to escape for use in onclick attribute
function escapeForOnclick(text) {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Toggle domain expansion
window.toggleDomain = function(domain) {
    if (expandedDomains.has(domain)) {
        expandedDomains.delete(domain);
    } else {
        expandedDomains.add(domain);
    }
    updateConnectionsList();
};

function updateConnectionsList() {
    const list = document.getElementById('connectionsList');
    
    // Filter connections by search query
    let filteredConnections = activeConnections;
    if (searchQuery) {
        filteredConnections = activeConnections.filter(conn => 
            (conn.url || conn.ip || '').toLowerCase().includes(searchQuery) ||
            (conn.domain || '').toLowerCase().includes(searchQuery) ||
            (conn.method || '').toLowerCase().includes(searchQuery) ||
            (conn.status || '').toLowerCase().includes(searchQuery)
        );
    }
    
    // Show/hide terminate all button based on tab
    const terminateAllBtn = document.getElementById('terminateAllBtn');
    const activeTab = document.querySelector('.tab-content.active');
    if (terminateAllBtn && activeTab && activeTab.id === 'connectionsTab') {
        terminateAllBtn.style.display = filteredConnections.length > 0 ? 'flex' : 'none';
    } else if (terminateAllBtn) {
        terminateAllBtn.style.display = 'none';
    }
    
    if (filteredConnections.length === 0) {
        if (activeConnections.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No active connections</div>';
        } else {
            list.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">No connections match "${searchQuery}"</div>`;
        }
        return;
    }
    
    // Group connections by domain
    const domainGroups = {};
    filteredConnections.forEach(conn => {
        const domain = conn.domain || extractDomain(conn.url || conn.ip);
        if (!domainGroups[domain]) {
            domainGroups[domain] = [];
        }
        domainGroups[domain].push(conn);
    });
    
    // Sort domains by connection count (descending), then alphabetically
    const sortedDomains = Object.keys(domainGroups).sort((a, b) => {
        const countDiff = domainGroups[b].length - domainGroups[a].length;
        if (countDiff !== 0) return countDiff;
        return a.localeCompare(b);
    });
    
    // If search query is active, always expand matching domains
    if (searchQuery) {
        sortedDomains.forEach(domain => expandedDomains.add(domain));
    }
    
    // Build HTML for grouped connections
    let html = '';
    sortedDomains.forEach(domain => {
        const connections = domainGroups[domain];
        const count = connections.length;
        const isExpanded = expandedDomains.has(domain);
        
        // Domain header - use data attribute for safer handling
        const escapedDomain = escapeForOnclick(domain);
        const displayDomain = escapeHtml(domain);
        html += `
        <div class="domain-group">
            <div class="domain-header" data-domain="${escapeHtml(domain)}" onclick="toggleDomain('${escapedDomain}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg class="expand-icon ${isExpanded ? 'expanded' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                    <span class="domain-name">${displayDomain}</span>
                    <span class="domain-count">${count}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="rule-action ${connections.some(c => c.blocked) ? 'block' : 'allow'}">
                        ${connections.some(c => c.blocked) ? 'BLOCKED' : 'ALLOWED'}
                    </span>
                </div>
            </div>
            <div class="domain-connections ${isExpanded ? 'expanded' : ''}">
        `;
        
        // Individual connections (shown when expanded)
        if (isExpanded) {
            connections.forEach(conn => {
                const originalIndex = activeConnections.findIndex(c => c.id === conn.id);
                const displayUrl = escapeHtml(conn.url || conn.ip || 'Unknown');
                const displayMethod = escapeHtml(conn.method || 'Connection');
                const displayStatus = escapeHtml(conn.status || 'Active');
                html += `
                <div class="connection-item nested">
                    <div class="rule-info">
                        <div class="rule-name">${displayUrl}</div>
                        <div class="rule-details">${displayMethod} - ${displayStatus}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="rule-action ${conn.blocked ? 'block' : 'allow'}">
                            ${conn.blocked ? 'BLOCKED' : 'ALLOWED'}
                        </span>
                        <button class="terminate-btn" onclick="event.stopPropagation(); terminateConnection(${originalIndex})" title="Terminate connection">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                `;
            });
        }
        
        html += `
            </div>
        </div>
        `;
    });
    
    list.innerHTML = html;
}

function updateLogsDisplay() {
    const container = document.getElementById('logsContainer');
    
    // Get recent logs (last 1000 for search, then limit display)
    let logsToDisplay = firewallLogs.slice(-1000).reverse();
    
    // Filter logs by search query
    if (searchQuery) {
        logsToDisplay = logsToDisplay.filter(log => 
            (log.target || '').toLowerCase().includes(searchQuery) ||
            (log.action || '').toLowerCase().includes(searchQuery) ||
            (log.reason || '').toLowerCase().includes(searchQuery) ||
            new Date(log.timestamp).toLocaleTimeString().toLowerCase().includes(searchQuery)
        );
    }
    
    // Limit to last 100 for display (after filtering)
    logsToDisplay = logsToDisplay.slice(0, 100);
    
    if (logsToDisplay.length === 0) {
        if (firewallLogs.length === 0) {
            container.innerHTML = '<div style="color: #666;">No firewall logs</div>';
        } else {
            container.innerHTML = `<div style="color: #666;">No logs match "${searchQuery}"</div>`;
        }
        return;
    }
    
    container.innerHTML = logsToDisplay.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `<div class="log-entry ${log.action}">[${time}] ${log.action.toUpperCase()}: ${log.target} - ${log.reason || ''}</div>`;
    }).join('');
}

function updateStats() {
    const blocked = firewallLogs.filter(l => l.action === 'blocked').length;
    const allowed = firewallLogs.filter(l => l.action === 'allowed').length;
    document.getElementById('blockedCount').textContent = blocked;
    document.getElementById('allowedCount').textContent = allowed;
}

function addRule(e) {
    e.preventDefault();
    
    const rule = {
        id: Date.now(),
        name: document.getElementById('ruleName').value,
        target: document.getElementById('ruleTarget').value,
        value: document.getElementById('ruleValue').value,
        action: document.getElementById('ruleAction').value
    };
    
    firewallRules.push(rule);
    saveRules(); // This will sync to main process
    updateDisplay();
    document.getElementById('addRuleModal').classList.remove('active');
    document.getElementById('ruleForm').reset();
}

window.deleteRule = function(index) {
    if (confirm('Delete this firewall rule?')) {
        firewallRules.splice(index, 1);
        saveRules();
        updateDisplay();
    }
};

function startMonitoring() {
    console.log('[FIREWALL] Starting firewall monitoring...');
    addConsoleLog('info', 'Firewall monitoring starting...');
    
    // Register with main process to receive network events
    if (!window.electronAPI) {
        console.error('[FIREWALL] electronAPI not available!');
        addConsoleLog('error', 'electronAPI not available!');
        alert('ERROR: electronAPI not available! Check preload.js');
        return;
    }
    
    if (!window.electronAPI.firewallRegister) {
        console.error('[FIREWALL] firewallRegister method not available!');
        addConsoleLog('error', 'firewallRegister method not available!');
        alert('ERROR: firewallRegister method not found in electronAPI!');
        return;
    }
    
    try {
        console.log('[FIREWALL] Calling firewallRegister()...');
        window.electronAPI.firewallRegister();
        console.log('[FIREWALL] firewallRegister() called successfully');
        addConsoleLog('info', 'Firewall registered with main process');
        
        // Verify registration worked by checking if we can receive events
        setTimeout(() => {
            console.log('[FIREWALL] Registration verification - checking listeners...');
            addConsoleLog('info', 'Registration complete. Waiting for events...');
        }, 500);
        
        // Add a test event to show it's working
        setTimeout(() => {
            logFirewallEvent('allowed', 'https://test.omeganetwork.co', 'Firewall monitoring started');
            updateDisplay();
        }, 1000);
    } catch (e) {
        console.error('[FIREWALL] Failed to register firewall:', e);
        addConsoleLog('error', `Failed to register firewall: ${e.message}`);
        alert('ERROR: Failed to register firewall: ' + e.message);
    }
    
    // Listen for network events from main process
    if (window.electronAPI && window.electronAPI.onFirewallEvent) {
        window.electronAPI.onFirewallEvent((event) => {
            console.log('Received firewall event from main process:', event);
            addConsoleLog('info', `Event received from main: ${event?.url || 'invalid'}`);
            if (event && event.url) {
                handleNetworkEvent(event);
            } else {
                console.warn('Received invalid event:', event);
                addConsoleLog('warn', `Invalid event: ${JSON.stringify(event)}`);
            }
        });
        console.log('Firewall event listener registered successfully');
        addConsoleLog('info', 'Firewall event listener registered');
    } else {
        console.error('onFirewallEvent not available!');
        addConsoleLog('error', 'onFirewallEvent not available!');
        alert('ERROR: onFirewallEvent not available! Check preload.js');
    }

    // Listen for rules sync from main process
    if (window.electronAPI && window.electronAPI.onFirewallSyncRules) {
        window.electronAPI.onFirewallSyncRules((rules) => {
            firewallRules = rules || [];
            updateDisplay();
        });
    }

    // Listen for enabled state sync
    if (window.electronAPI && window.electronAPI.onFirewallSyncEnabled) {
        window.electronAPI.onFirewallSyncEnabled((enabled) => {
            isEnabled = enabled;
            updateFirewallStatus();
        });
    }
    
    // Update display periodically
    setInterval(() => {
        updateDisplay();
    }, 500);
}

// Console logging for firewall (simple version for firewall window)
function addConsoleLog(type, message) {
    console.log(`[FIREWALL] ${message}`);
}

function handleNetworkEvent(event) {
    try {
        console.log('handleNetworkEvent called with:', event);
        addConsoleLog('info', `Received network event: ${event.url}`);
        
        if (!event || !event.url) {
            console.warn('Invalid event received:', event);
            addConsoleLog('warn', 'Invalid event received');
            return;
        }
        
        // Parse URL safely
        let domain = event.url;
        try {
            const url = new URL(event.url);
            domain = url.hostname;
        } catch (e) {
            // Invalid URL, use as-is
            domain = event.url;
        }
        
        console.log('Processing event for URL:', event.url, 'Domain:', domain);
        
        if (event.blocked) {
            logFirewallEvent('blocked', event.url, 'Blocked by firewall rule');
        } else {
            logFirewallEvent('allowed', event.url, 'Allowed');
            
            // Add to active connections
            const conn = {
                id: Date.now() + Math.random(),
                url: event.url,
                domain: domain,
                method: event.method || 'GET',
                status: 'Active',
                timestamp: event.timestamp || Date.now(),
                blocked: false
            };
            
            // Remove duplicates (keep most recent) - increase time window
            activeConnections = activeConnections.filter(c => 
                !(c.url === event.url && Math.abs((c.timestamp || 0) - (conn.timestamp || 0)) < 2000)
            );
            activeConnections.unshift(conn);
            if (activeConnections.length > 100) {
                activeConnections.pop();
            }
            
            console.log('Added connection:', conn.url, 'Total connections:', activeConnections.length);
        }
        
        updateDisplay();
    } catch (e) {
        console.error('Error handling network event:', e);
        // Still try to log it even if processing fails
        if (event && event.url) {
            logFirewallEvent('allowed', event.url, 'Allowed');
            updateDisplay();
        }
    }
}

function logFirewallEvent(action, target, reason) {
    const log = {
        timestamp: Date.now(),
        action: action,
        target: target,
        reason: reason
    };
    firewallLogs.unshift(log);
    if (firewallLogs.length > 1000) firewallLogs.pop();
    updateDisplay();
}

function checkRule(url, domain) {
    if (!isEnabled) return 'allow';
    
    try {
        const urlObj = new URL(url);
        const urlDomain = urlObj.hostname;
        const urlPath = urlObj.pathname;
        
        for (const rule of firewallRules) {
            let matches = false;
            
            if (rule.target === 'domain') {
                // Check if domain matches (exact or subdomain)
                matches = urlDomain === rule.value || urlDomain.endsWith('.' + rule.value);
            } else if (rule.target === 'ip') {
                // Check if IP matches
                matches = url.includes(rule.value);
            } else if (rule.target === 'port') {
                // Check if port matches
                const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
                matches = port === rule.value || url.includes(':' + rule.value);
            }
            
            if (matches) {
                return rule.action;
            }
        }
    } catch (e) {
        // Invalid URL, allow by default
    }
    
    return 'allow';
}
