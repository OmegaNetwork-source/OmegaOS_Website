// Theme Management
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// Window Controls - App Window
let currentWindowId = null;

// Get window ID when available
if (window.electronAPI) {
    // Try to get window ID immediately
    window.electronAPI.getWindowId?.().then(id => {
        if (id) currentWindowId = id;
    });
    
    // Listen for window ID assignment
    window.electronAPI.onWindowId?.((windowId) => {
        currentWindowId = windowId;
    });
}

document.getElementById('minimizeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowMinimize(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowMinimize(null);
    }
});

document.getElementById('maximizeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowMaximize(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowMaximize(null);
    }
});

document.getElementById('closeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowClose(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowClose(null);
    }
});

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggle');

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
    });
}

// Switch browser to use qwen2.5:1.5b model (works better for browser summarization than DeepSeek)
if (window.electronAPI && window.electronAPI.aiSetModel) {
    // Use qwen2.5:1.5b for browser - it works better with extracted page content
    window.electronAPI.aiSetModel('qwen2.5:1.5b').then(result => {
        if (result && result.success) {
            console.log('[Browser] Switched to qwen2.5:1.5b model for better browser compatibility');
        }
    }).catch(err => {
        console.log('[Browser] Model switch failed (will use default):', err);
    });
}

// Sidebar Toggle
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
if (sidebarCollapsed === null) {
    sidebarCollapsed = true; // Default to collapsed
} else {
    sidebarCollapsed = sidebarCollapsed === 'true';
}

const sidebar = document.getElementById('sidebar');

function updateSidebarState(collapsed) {
    sidebarCollapsed = collapsed;
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
}

if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
} else {
    sidebar.classList.remove('collapsed');
}

// Sidebar Toggle Button
document.getElementById('sidebarToggle').addEventListener('click', () => {
    updateSidebarState(!sidebarCollapsed);
});

// Sidebar Move Button - Move sidebar to other side
let sidebarRightSide = localStorage.getItem('sidebarRightSide') === 'true';
const sidebarMoveBtn = document.getElementById('sidebarMoveBtn');

function updateSidebarPosition(rightSide) {
    sidebarRightSide = rightSide;
    if (sidebarRightSide) {
        sidebar.classList.add('right-side');
    } else {
        sidebar.classList.remove('right-side');
    }
    localStorage.setItem('sidebarRightSide', sidebarRightSide);
}

// Initialize sidebar position
if (sidebarRightSide) {
    sidebar.classList.add('right-side');
}

if (sidebarMoveBtn) {
    sidebarMoveBtn.addEventListener('click', () => {
        updateSidebarPosition(!sidebarRightSide);
    });
}

// AI Chat Functionality
let conversationHistory = [];
let isAIProcessing = false;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const welcomeMessage = document.getElementById('welcomeMessage');

// Ensure chat input is enabled immediately
if (chatInput) chatInput.disabled = false;
if (chatSend) chatSend.disabled = false;

// Check if AI is ready and enable chat
async function initializeAIChat() {
    if (!window.electronAPI?.aiCheckReady) {
        console.warn('AI API not available');
        // Enable chat anyway - let user try
        if (chatInput) chatInput.disabled = false;
        if (chatSend) chatSend.disabled = false;
        return;
    }
    
    // Always enable chat input - let user try and we'll handle errors
    if (chatInput) chatInput.disabled = false;
    if (chatSend) chatSend.disabled = false;
    
    try {
        const status = await window.electronAPI.aiCheckReady();
        if (status.ready || status.available) {
            // AI is ready
            if (welcomeMessage) {
                const subtitle = welcomeMessage.querySelector('.subtitle');
                if (subtitle) {
                    subtitle.textContent = 'AI ready - ask me anything!';
                }
            }
        } else {
            // Not ready yet, but enable input anyway
            if (welcomeMessage) {
                const subtitle = welcomeMessage.querySelector('.subtitle');
                if (subtitle) {
                    subtitle.textContent = 'AI initializing... You can try sending a message.';
                }
            }
        }
    } catch (error) {
        console.error('Error checking AI status:', error);
        // Still enable chat - errors will be shown in chat if needed
        if (welcomeMessage) {
            const subtitle = welcomeMessage.querySelector('.subtitle');
            if (subtitle) {
                subtitle.textContent = 'AI may be starting... Try sending a message.';
            }
        }
    }
}

// Add message to chat
function addChatMessage(role, content) {
    if (welcomeMessage && welcomeMessage.parentElement) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    messageDiv.innerHTML = `
        <div class="chat-message-content">${escapeHtml(content)}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send chat message
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || isAIProcessing) return;
    
    if (!window.electronAPI?.aiChat) {
        alert('AI chat is not available');
        return;
    }
    
    // Add user message
    addChatMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    chatInput.value = '';
    chatInput.disabled = true;
    chatSend.disabled = true;
    isAIProcessing = true;
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant typing';
    typingDiv.innerHTML = '<div class="chat-message-content">Thinking...</div>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const result = await window.electronAPI.aiChat(message, conversationHistory);
        typingDiv.remove();
        
        if (result.success) {
            addChatMessage('assistant', result.response);
            conversationHistory.push({ role: 'assistant', content: result.response });
        } else {
            addChatMessage('assistant', `Error: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        typingDiv.remove();
        addChatMessage('assistant', `Error: ${error.message}`);
    } finally {
        chatInput.disabled = false;
        chatSend.disabled = false;
        isAIProcessing = false;
        chatInput.focus();
    }
}

// Event listeners for chat
if (chatSend) {
    chatSend.addEventListener('click', sendChatMessage);
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

// Wrap updateSidebarState to initialize AI when sidebar opens
const originalUpdateSidebarState = updateSidebarState;
window.updateSidebarState = function(collapsed) {
    originalUpdateSidebarState(collapsed);
    if (!collapsed && chatInput) {
        // Sidebar opened, initialize AI if not already done
        setTimeout(() => {
            initializeAIChat();
            chatInput.focus();
        }, 100);
    }
};

// Also initialize on page load if sidebar is open
if (!sidebarCollapsed) {
    setTimeout(initializeAIChat, 500);
}

// Page Summarization
async function summarizeCurrentPage() {
    if (!window.electronAPI?.aiSummarizePage) {
        alert('AI summarization is not available');
        return;
    }
    
    // Get active webview
    const activeWebview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (!activeWebview) {
        alert('No active page to summarize');
        return;
    }
    
    try {
        // Extract page content WITHOUT modifying the actual page
        const pageContent = await activeWebview.executeJavaScript(`
            (function() {
                // Clone the body to avoid modifying the actual page
                const clone = document.body.cloneNode(true);
                
                // Remove unwanted elements from the clone only
                const unwanted = clone.querySelectorAll('script, style, nav, header, footer, aside, iframe, embed, object, audio, video');
                unwanted.forEach(el => el.remove());
                
                // Get text content from clone (doesn't affect original page)
                const bodyText = clone.innerText || clone.textContent || '';
                
                // Get title
                const title = document.title || '';
                
                return title + '\\n\\n' + bodyText.substring(0, 5000); // Limit to 5000 chars
            })();
        `);
        
        if (!pageContent || pageContent.trim().length < 50) {
            alert('Unable to extract page content. Please wait for the page to fully load.');
            return;
        }
        
        // Show loading in chat
        addChatMessage('user', 'Summarize this page');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant typing';
        typingDiv.innerHTML = '<div class="chat-message-content">Summarizing page...</div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Summarize
        const result = await window.electronAPI.aiSummarizePage(pageContent, 200);
        typingDiv.remove();
        
        if (result.success) {
            addChatMessage('assistant', `**Page Summary:**\n\n${result.summary}`);
            conversationHistory.push({ role: 'user', content: 'Summarize this page' });
            conversationHistory.push({ role: 'assistant', content: result.summary });
        } else {
            addChatMessage('assistant', `Error: ${result.error || 'Failed to summarize page'}`);
        }
    } catch (error) {
        console.error('Error summarizing page:', error);
        alert('Error summarizing page: ' + error.message);
    }
}

// Summarize page button
const summarizePageBtn = document.getElementById('summarizePageBtn');
if (summarizePageBtn) {
    summarizePageBtn.addEventListener('click', summarizeCurrentPage);
}

// Tab Management
let tabs = [];
let activeTabId = 0;
let tabIdCounter = 0;

async function createTab(url = null) {
    if (!url) {
        url = getHomeUrl();
    }
    const tabId = tabIdCounter++;
    tabs.push({
        id: tabId,
        url: url,
        title: 'New Tab'
    });
    
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
        <span class="tab-title">New Tab</span>
        <button class="tab-close">&times;</button>
    `;
    
    if (tabsContainer) {
        tabsContainer.appendChild(tab);
    }
    
    // Tab click handler
    tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close') && !e.target.closest('.tab-close')) {
            switchTab(tabId);
        }
    });
    
    // Tab close handler
    const closeBtn = tab.querySelector('.tab-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tabId);
        });
    }
    
    // Create webview for this tab before switching
    await createWebView(tabId, url);
    
    // Switch to the new tab
    switchTab(tabId);
}

function switchTab(tabId) {
    activeTabId = tabId;
    
    // Update tab appearance
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        if (parseInt(t.dataset.tabId) === tabId) {
            t.classList.add('active');
        }
    });
    
    // Show/hide webviews
    document.querySelectorAll('webview').forEach(wv => {
        if (parseInt(wv.dataset.tabId) === tabId) {
            wv.style.display = 'inline-flex';
        } else {
            wv.style.display = 'none';
        }
    });
    
    // Update address bar and navigation
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        const addressBar = document.getElementById('addressBar');
        addressBar.value = tab.url;
        updateTabTitle(tabId, tab.title);
    }
}

function closeTab(tabId) {
    if (tabs.length <= 1) {
        // Don't close the last tab
        return;
    }
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    tabs.splice(tabIndex, 1);
    
    // Remove tab element
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.remove();
    }
    
    // Remove webview
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (webview) {
        webview.remove();
    }
    
    // Switch to another tab
    if (activeTabId === tabId) {
        const newActiveTab = tabs.length > 0 ? tabs[Math.max(0, tabIndex - 1)].id : null;
        if (newActiveTab !== null) {
            switchTab(newActiveTab);
        }
    }
}

function updateTabTitle(tabId, title) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.title = title;
    }
    
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
    if (tabElement) {
        tabElement.textContent = title || 'New Tab';
    }
}

async function createWebView(tabId, url) {
    const container = document.querySelector('.webview-container');
    const webview = document.createElement('webview');
    webview.dataset.tabId = tabId;
    
    // CRITICAL: Set preload BEFORE setting src
    // Preload must be set before webview loads
    let preloadPath = './webview-preload.js';
    if (window.electronAPI?.getPreloadPath) {
        try {
            const path = await window.electronAPI.getPreloadPath();
            if (path) preloadPath = path;
        } catch (e) {
            // Use fallback
        }
    }
    webview.setAttribute('preload', preloadPath);
    
    webview.src = url;
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.display = tabId === activeTabId ? 'inline-flex' : 'none';
    webview.setAttribute('allowpopups', 'true');
    // Set Chrome user agent so Chrome Web Store recognizes us
    const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    webview.setAttribute('useragent', chromeUserAgent);
    webview.setAttribute('webpreferences', 'allowRunningInsecureContent,contextIsolation=yes');
    
    // Hide all other webviews when this one is shown
    webview.addEventListener('dom-ready', () => {
        if (parseInt(webview.dataset.tabId) === activeTabId) {
            document.querySelectorAll('webview').forEach(wv => {
                if (wv !== webview) {
                    wv.style.display = 'none';
                }
            });
        }
    });
    
    webview.addEventListener('page-title-updated', (e) => {
        updateTabTitle(tabId, e.title);
        // Add to history when page loads
        const tab = tabs.find(t => t.id === tabId);
        if (tab && e.title) {
            addToHistory(tab.url, e.title);
        }
    });
    
    webview.addEventListener('did-start-loading', () => {
        updateNavButtons();
    });
    
    webview.addEventListener('did-stop-loading', () => {
        updateNavButtons();
    });
    
    webview.addEventListener('did-navigate', (e) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            tab.url = e.url;
            if (parseInt(webview.dataset.tabId) === activeTabId) {
                const addressBar = document.getElementById('addressBar');
                if (addressBar) {
                    addressBar.value = e.url;
                }
            }
            // Add to history
            if (e.url && !e.url.startsWith('chrome-extension://') && !e.url.startsWith('about:') && !e.url.startsWith('chrome://') && !e.url.startsWith('file://') && !e.url.startsWith('data:')) {
                addToHistory(e.url, tab.title);
                // Notify firewall of navigation - THIS IS KEY!
                addConsoleLog('navigation', `did-navigate: ${e.url}`);
                notifyFirewall('navigate', e.url, 'GET');
            }
        }
        updateNavButtons();
        applyZoom();
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab && e.isMainFrame) {
            tab.url = e.url;
            if (parseInt(webview.dataset.tabId) === activeTabId) {
                const addressBar = document.getElementById('addressBar');
                if (addressBar) {
                    addressBar.value = e.url;
                }
            }
            // Notify firewall of in-page navigation
            if (e.url && !e.url.startsWith('chrome-extension://') && !e.url.startsWith('about:') && !e.url.startsWith('chrome://') && !e.url.startsWith('file://') && !e.url.startsWith('data:')) {
                addConsoleLog('navigation', `did-navigate-in-page: ${e.url}`);
                notifyFirewall('navigate', e.url, 'GET');
            }
        }
    });
    
    webview.addEventListener('did-fail-load', (e) => {
        console.error('Failed to load:', e.errorDescription);
        // Could show an error page here
    });
    
    // Intercept popup/new window requests (like MetaMask connection popups)
    // Open them in new tabs instead
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        const url = e.url;
        console.log('Intercepted popup request:', url);
        
        // If it's a chrome-extension:// URL (MetaMask/Phantom popup), open in new tab
        if (url.startsWith('chrome-extension://')) {
            createTab(url);
        } else {
            // Regular popup - open in new tab
            createTab(url);
        }
    });
    
    webview.addEventListener('did-start-navigation', (e) => {
        if (e.isDownload) {
            addDownload(e.url, e.url.split('/').pop() || 'download');
        }
            // ALWAYS send network event to firewall - this ensures we catch everything
        if (e.url && !e.url.startsWith('about:') && !e.url.startsWith('chrome-extension://') && !e.url.startsWith('chrome://') && !e.url.startsWith('file://') && !e.url.startsWith('data:')) {
            addConsoleLog('navigation', `did-start-navigation: ${e.url}`, { isMainFrame: e.isMainFrame });
            notifyFirewall('navigation', e.url, e.isMainFrame ? 'GET' : 'GET');
        }
    });
    
    // Monitor when page starts loading - capture the URL
    webview.addEventListener('did-start-loading', () => {
        // Use getURL() which is async
        webview.getURL().then(url => {
            if (url && !url.startsWith('about:') && !url.startsWith('chrome-extension://') && !url.startsWith('chrome://') && !url.startsWith('file://') && !url.startsWith('data:')) {
                addConsoleLog('navigation', `did-start-loading: ${url}`);
                notifyFirewall('request', url, 'GET');
            }
        }).catch(() => {
            // Fallback to src attribute
            const url = webview.src;
            if (url && !url.startsWith('about:') && !url.startsWith('chrome-extension://') && !url.startsWith('chrome://') && !url.startsWith('file://') && !url.startsWith('data:')) {
                addConsoleLog('navigation', `did-start-loading (fallback): ${url}`);
                notifyFirewall('request', url, 'GET');
            }
        });
    });
    
    // Monitor when page finishes loading - capture final URL
    webview.addEventListener('did-finish-load', () => {
        webview.getURL().then(url => {
            if (url && !url.startsWith('about:') && !url.startsWith('chrome-extension://') && !url.startsWith('chrome://') && !url.startsWith('file://') && !url.startsWith('data:')) {
                addConsoleLog('navigation', `did-finish-load: ${url}`);
                notifyFirewall('request', url, 'GET');
            }
        }).catch(() => {});
    });
    
    // Also notify when webview URL changes (src set) - more aggressive monitoring
    let lastUrl = webview.src;
    const urlObserver = new MutationObserver(() => {
        const currentUrl = webview.src;
            if (currentUrl && currentUrl !== lastUrl && 
                !currentUrl.startsWith('about:') && !currentUrl.startsWith('chrome-extension://') && 
                !currentUrl.startsWith('chrome://') && !currentUrl.startsWith('file://') && 
                !currentUrl.startsWith('data:')) {
                addConsoleLog('navigation', `URL mutation detected: ${currentUrl}`);
                lastUrl = currentUrl;
                notifyFirewall('navigation', currentUrl, 'GET');
            }
    });
    urlObserver.observe(webview, { attributes: true, attributeFilter: ['src'] });
    
    // Periodic URL check as backup (every 500ms)
    let urlCheckInterval = setInterval(() => {
        try {
            const currentUrl = webview.src;
            if (currentUrl && currentUrl !== lastUrl && 
                !currentUrl.startsWith('about:') && !currentUrl.startsWith('chrome-extension://') && 
                !currentUrl.startsWith('chrome://') && !currentUrl.startsWith('file://') && 
                !currentUrl.startsWith('data:')) {
                addConsoleLog('navigation', `Periodic URL check: ${currentUrl}`);
                lastUrl = currentUrl;
                notifyFirewall('navigation', currentUrl, 'GET');
            }
        } catch (e) {
            // Webview might be removed
            clearInterval(urlCheckInterval);
        }
    }, 500);
    
    webview.addEventListener('will-download', (e) => {
        const filename = e.suggestedFilename || e.url.split('/').pop() || 'download';
        addDownload(e.url, filename);
    });
    
    container.appendChild(webview);
    applyZoom();
    
    // Inject Omega Wallet providers IMMEDIATELY when webview is created
    // This ensures they're available before dApps check for them
    injectSolanaProvider(webview);
    injectEVMProvider(webview);
    
    // Also re-inject on dom-ready to ensure they're present
    webview.addEventListener('dom-ready', () => {
        injectSolanaProvider(webview);
        injectEVMProvider(webview);
    });
}

// Console Logging System
let consoleLogs = [];
const MAX_CONSOLE_LOGS = 1000;

function addConsoleLog(type, message, data = null) {
    const log = {
        time: new Date().toLocaleTimeString(),
        type: type,
        message: message,
        data: data,
        timestamp: Date.now()
    };
    consoleLogs.push(log);
    if (consoleLogs.length > MAX_CONSOLE_LOGS) {
        consoleLogs = consoleLogs.slice(-MAX_CONSOLE_LOGS);
    }
    updateConsoleDisplay();
}

function updateConsoleDisplay() {
    const output = document.getElementById('consoleOutput');
    if (!output) return;
    
    const autoScroll = document.getElementById('autoScrollConsole')?.checked !== false;
    
    output.innerHTML = consoleLogs.map(log => {
        let color = '#d4d4d4';
        if (log.type === 'error') color = '#f48771';
        else if (log.type === 'warn') color = '#cca700';
        else if (log.type === 'firewall') color = '#4ec9b0';
        else if (log.type === 'navigation') color = '#569cd6';
        else if (log.type === 'info') color = '#4fc1ff';
        
        let html = `<div style="color: ${color}; margin-bottom: 4px;">`;
        html += `<span style="color: #858585;">[${log.time}]</span> `;
        html += `<span style="color: ${color}; font-weight: bold;">${log.type.toUpperCase()}:</span> `;
        html += `<span>${escapeHtml(log.message)}</span>`;
        if (log.data) {
            html += ` <span style="color: #858585;">${escapeHtml(JSON.stringify(log.data, null, 2))}</span>`;
        }
        html += `</div>`;
        return html;
    }).join('');
    
    if (autoScroll) {
        output.scrollTop = output.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Override console methods to capture logs
const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console)
};

console.log = function(...args) {
    originalConsole.log(...args);
    addConsoleLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.error = function(...args) {
    originalConsole.error(...args);
    addConsoleLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.warn = function(...args) {
    originalConsole.warn(...args);
    addConsoleLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.info = function(...args) {
    originalConsole.info(...args);
    addConsoleLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

// Notify firewall of network activity
function notifyFirewall(type, url, method) {
    if (!url || url.startsWith('about:') || url.startsWith('chrome-extension://') || 
        url.startsWith('chrome://') || url.startsWith('file://') || url.startsWith('data:')) {
        return; // Skip internal URLs
    }
    
    addConsoleLog('firewall', `Firewall notification: ${type} ${url}`, { type, url, method });
    
    // Always send to main process - it will forward to firewall if registered
    if (window.electronAPI && window.electronAPI.firewallNotify) {
        try {
            const eventData = {
                type: type,
                url: url,
                method: method || 'GET',
                timestamp: Date.now()
            };
            originalConsole.log('notifyFirewall called:', url);
            window.electronAPI.firewallNotify(eventData);
            addConsoleLog('firewall', `Sent to main process: ${url}`);
        } catch (e) {
            originalConsole.error('Failed to notify firewall:', e);
            addConsoleLog('error', `Failed to notify firewall: ${e.message}`);
        }
    } else {
        originalConsole.warn('electronAPI.firewallNotify not available!');
        addConsoleLog('warn', 'electronAPI.firewallNotify not available!');
    }
}

// Navigation
document.getElementById('backBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.goBack();
    }
});

document.getElementById('forwardBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.goForward();
    }
});

document.getElementById('reloadBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.reload();
    }
});

document.getElementById('homeBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.src = getHomeUrl();
    }
});

// Address Bar
const addressBar = document.getElementById('addressBar');
addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        navigateToAddress(addressBar.value.trim());
    }
});

// AI Mode Button - Toggle Sidebar
const aiModeBtn = document.getElementById('aiModeBtn');

if (aiModeBtn) {
    // Update button state based on sidebar state
    function updateAIModeButton() {
        if (aiModeBtn) {
            if (!sidebarCollapsed) {
                aiModeBtn.classList.add('active');
            } else {
                aiModeBtn.classList.remove('active');
            }
        }
    }
    
    aiModeBtn.addEventListener('click', () => {
        // Toggle the sidebar when AI button is clicked
        // Use window.updateSidebarState if available (has AI initialization), otherwise use updateSidebarState
        if (window.updateSidebarState) {
            window.updateSidebarState(!sidebarCollapsed);
        } else {
            updateSidebarState(!sidebarCollapsed);
        }
    });
    
    // Update button state when sidebar state changes
    // Hook into the existing wrapper
    const existingWrapper = window.updateSidebarState;
    if (existingWrapper) {
        window.updateSidebarState = function(collapsed) {
            existingWrapper(collapsed);
            updateAIModeButton();
        };
    } else {
        // If wrapper doesn't exist yet, wrap the original function
        const originalUpdateSidebarState = updateSidebarState;
        updateSidebarState = function(collapsed) {
            originalUpdateSidebarState(collapsed);
            updateAIModeButton();
        };
    }
    
    // Initial state
    updateAIModeButton();
}

// Camera button removed - no longer needed

async function navigateToAddress(input) {
    let url = input;
    
        if (!url) {
            url = getHomeUrl();
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Check if it looks like a URL or a search query
        // A URL should have a dot and no spaces, or be a localhost/local path
        if ((url.includes('.') || url.startsWith('localhost') || url.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)) && !url.includes(' ')) {
            url = 'https://' + url;
            } else {
                // Search query - use selected search engine
                url = getSearchUrl(url);
            }
    }
    
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
        tab.url = url;
    }
    
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.src = url;
    } else {
        // Webview doesn't exist yet, create it
        await createWebView(activeTabId, url);
    }
}

// Update navigation button states
function updateNavButtons() {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.canGoBack().then(canGoBack => {
            document.getElementById('backBtn').disabled = !canGoBack;
        });
        webview.canGoForward().then(canGoForward => {
            document.getElementById('forwardBtn').disabled = !canGoForward;
        });
    }
}

// Search Engine Management (defined before use)
const searchEngines = {
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com', search: 'https://duckduckgo.com/?q=' },
    startpage: { name: 'Startpage', url: 'https://www.startpage.com', search: 'https://www.startpage.com/sp/search?query=' },
    searx: { name: 'SearX', url: 'https://searx.org', search: 'https://searx.org/search?q=' }
};

let currentSearchEngine = localStorage.getItem('searchEngine') || 'duckduckgo';

function getSearchUrl(query) {
    return searchEngines[currentSearchEngine].search + encodeURIComponent(query);
}

function getHomeUrl() {
    return searchEngines[currentSearchEngine].url;
}

// History Management
let history = JSON.parse(localStorage.getItem('browserHistory') || '[]');

function addToHistory(url, title) {
    const historyItem = {
        id: Date.now(),
        url: url,
        title: title || url,
        timestamp: Date.now()
    };
    history.unshift(historyItem);
    // Keep only last 1000 items
    if (history.length > 1000) {
        history = history.slice(0, 1000);
    }
    localStorage.setItem('browserHistory', JSON.stringify(history));
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No history yet</div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();
        return `
            <div class="history-item" data-url="${item.url}">
                <div class="history-item-content">
                    <div class="history-item-title">${item.title}</div>
                    <div class="history-item-url">${item.url}</div>
                </div>
                <div class="history-item-time">${timeStr}</div>
                <button class="item-delete" data-id="${item.id}" title="Delete">×</button>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('item-delete')) {
                const url = item.dataset.url;
                navigateToAddress(url);
                closePanel('historyPanel');
            }
        });
    });
    
    // Add delete handlers
    historyList.querySelectorAll('.item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            history = history.filter(item => item.id !== id);
            localStorage.setItem('browserHistory', JSON.stringify(history));
            renderHistory();
        });
    });
}

// Bookmarks Management
let bookmarks = JSON.parse(localStorage.getItem('browserBookmarks') || '[]');

function addBookmark(url, title) {
    const bookmark = {
        id: Date.now(),
        url: url,
        title: title || url,
        timestamp: Date.now()
    };
    bookmarks.push(bookmark);
    localStorage.setItem('browserBookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
}

function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarksList');
    if (!bookmarksList) return;
    
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No bookmarks yet</div>';
        return;
    }
    
    bookmarksList.innerHTML = bookmarks.map(item => {
        return `
            <div class="bookmark-item" data-url="${item.url}">
                <div class="bookmark-item-content">
                    <div class="bookmark-item-title">${item.title}</div>
                    <div class="bookmark-item-url">${item.url}</div>
                </div>
                <button class="item-delete" data-id="${item.id}" title="Delete">×</button>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    bookmarksList.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('item-delete')) {
                const url = item.dataset.url;
                navigateToAddress(url);
                closePanel('bookmarksPanel');
            }
        });
    });
    
    // Add delete handlers
    bookmarksList.querySelectorAll('.item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            bookmarks = bookmarks.filter(item => item.id !== id);
            localStorage.setItem('browserBookmarks', JSON.stringify(bookmarks));
            renderBookmarks();
        });
    });
}

// Downloads Management
let downloads = JSON.parse(localStorage.getItem('browserDownloads') || '[]');

function addDownload(url, filename) {
    const download = {
        id: Date.now(),
        url: url,
        filename: filename || url.split('/').pop() || 'download',
        timestamp: Date.now(),
        status: 'completed'
    };
    downloads.unshift(download);
    if (downloads.length > 100) {
        downloads = downloads.slice(0, 100);
    }
    localStorage.setItem('browserDownloads', JSON.stringify(downloads));
    renderDownloads();
}

function renderDownloads() {
    const downloadsList = document.getElementById('downloadsList');
    if (!downloadsList) return;
    
    if (downloads.length === 0) {
        downloadsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No downloads yet</div>';
        return;
    }
    
    downloadsList.innerHTML = downloads.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();
        return `
            <div class="download-item">
                <div class="history-item-content">
                    <div class="history-item-title">${item.filename}</div>
                    <div class="history-item-url">${item.url}</div>
                    <div class="history-item-time" style="margin-top: 4px;">${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Zoom Management
let currentZoom = parseFloat(localStorage.getItem('browserZoom') || '1.0');

function updateZoom(zoom) {
    currentZoom = Math.max(0.25, Math.min(5.0, zoom));
    localStorage.setItem('browserZoom', currentZoom.toString());
    updateZoomDisplay();
    applyZoom();
}

function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
    }
}

function applyZoom() {
    document.querySelectorAll('webview').forEach(webview => {
        webview.setZoomFactor(currentZoom);
    });
}

// Panel Management
function openPanel(panelId) {
    closeAllPanels();
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('active');
        if (panelId === 'historyPanel') {
            renderHistory();
        } else if (panelId === 'bookmarksPanel') {
            renderBookmarks();
        } else if (panelId === 'downloadsPanel') {
            renderDownloads();
        } else if (panelId === 'settingsPanel') {
            openSettings();
        } else if (panelId === 'consolePanel') {
            // Console panel opened
        }
    }
}

function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove('active');
    }
}

function closeAllPanels() {
    closePanel('historyPanel');
    closePanel('bookmarksPanel');
    closePanel('downloadsPanel');
    closePanel('settingsPanel');
    closePanel('consolePanel');
    closeDropdown();
}

// Settings Dropdown
const settingsDropdown = document.getElementById('settingsDropdown');

// Ad Blocker Toggle
function setupAdBlockerToggle() {
    const adBlockerCheckbox = document.getElementById('adBlockerCheckbox');
    const adBlockerToggle = document.getElementById('adBlockerToggle');
    
    if (adBlockerCheckbox && window.electronAPI) {
        // Load current status
        window.electronAPI.adBlockerGetStatus().then(status => {
            adBlockerCheckbox.checked = status.enabled;
            updateAdBlockerToggleVisual(adBlockerCheckbox.checked);
        }).catch(err => {
            console.error('Error loading ad blocker status:', err);
        });
        
        // Handle checkbox change
        adBlockerCheckbox.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            try {
                await window.electronAPI.adBlockerSetStatus(enabled);
                updateAdBlockerToggleVisual(enabled);
            } catch (err) {
                console.error('Error setting ad blocker status:', err);
                // Revert on error
                adBlockerCheckbox.checked = !enabled;
                updateAdBlockerToggleVisual(!enabled);
            }
        });
        
        // Handle click on toggle container (to ensure it works)
        if (adBlockerToggle) {
            adBlockerToggle.addEventListener('click', (e) => {
                // Don't toggle if clicking directly on the checkbox (it handles itself)
                if (e.target !== adBlockerCheckbox && !e.target.closest('label')) {
                    adBlockerCheckbox.checked = !adBlockerCheckbox.checked;
                    adBlockerCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }
}

function updateAdBlockerToggleVisual(checked) {
    const checkbox = document.getElementById('adBlockerCheckbox');
    if (checkbox) {
        const toggleSpan = checkbox.nextElementSibling;
        if (toggleSpan) {
            const circle = toggleSpan.querySelector('span');
            if (checked) {
                toggleSpan.style.backgroundColor = 'rgba(34, 197, 94, 0.5)';
                if (circle) circle.style.transform = 'translateX(16px)';
            } else {
                toggleSpan.style.backgroundColor = 'rgba(100, 116, 139, 0.5)';
                if (circle) circle.style.transform = 'translateX(0)';
            }
        }
    }
}
let dropdownOpen = false;

function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
    if (dropdownOpen) {
        settingsDropdown.classList.add('active');
    } else {
        closeDropdown();
    }
}

function closeDropdown() {
    dropdownOpen = false;
    if (settingsDropdown) {
        settingsDropdown.classList.remove('active');
    }
}

// Settings Panel
const settingsPanel = document.getElementById('settingsPanel');
let settingsOpen = false;

// Extensions removed - using WalletConnect instead
async function renderExtensionsList() {
    // Function kept for compatibility but does nothing
    return;

    // Update user data path display
    const userDataPathEl = document.getElementById('userDataPath');
    if (userDataPathEl) {
        // Try to get user data path (this will be shown in the instructions)
        const path = window.electronAPI?.getUserDataPath ? 
            await window.electronAPI.getUserDataPath().catch(() => null) : null;
        if (path) {
            userDataPathEl.textContent = path + '\\extensions\\';
        } else {
            // Fallback path
            const isWindows = navigator.platform.toLowerCase().includes('win');
            const isMac = navigator.platform.toLowerCase().includes('mac');
            if (isWindows) {
                userDataPathEl.textContent = '%APPDATA%\\omega-os\\extensions\\';
            } else if (isMac) {
                userDataPathEl.textContent = '~/Library/Application Support/omega-os/extensions/';
            } else {
                userDataPathEl.textContent = '~/.config/omega-os/extensions/';
            }
        }
    }

    // Available extensions to install
    const availableExtensions = [
        {
            id: 'metamask',
            name: 'MetaMask',
            description: 'Crypto wallet for Ethereum and EVM chains',
            chromeStoreId: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
            icon: '🦊',
            chromeStoreUrl: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn'
        },
        {
            id: 'phantom',
            name: 'Phantom',
            description: 'Crypto wallet for Solana, Ethereum, and Polygon',
            chromeStoreId: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
            icon: '👻',
            chromeStoreUrl: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa'
        }
    ];

    // Get loaded extensions
    let loadedExtensions = [];
    if (window.electronAPI?.getLoadedExtensions) {
        try {
            loadedExtensions = await window.electronAPI.getLoadedExtensions();
        } catch (e) {
            console.warn('Could not get loaded extensions:', e);
        }
    }

    // Render extension cards
    extensionsList.innerHTML = '';
    
    for (const ext of availableExtensions) {
        const isInstalled = loadedExtensions.some(le => 
            le.name?.toLowerCase().includes(ext.id) || 
            le.id === ext.chromeStoreId
        );

        const extCard = document.createElement('div');
        extCard.style.cssText = `
            padding: 15px;
            margin-bottom: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 15px;
        `;

        extCard.innerHTML = `
            <div style="font-size: 32px; flex-shrink: 0;">${ext.icon}</div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <strong style="color: rgba(255, 255, 255, 0.95); font-size: 14px;">${ext.name}</strong>
                    ${isInstalled ? '<span style="font-size: 11px; padding: 2px 8px; background: #107c10; color: white; border-radius: 10px;">Installed</span>' : ''}
                </div>
                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-bottom: 10px;">${ext.description}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">Extension ID:</div>
                        <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 3px; font-size: 11px; word-break: break-all; display: inline-block;">${ext.chromeStoreId}</code>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: flex-end;">
                        <a href="https://chrome-extension-downloader.com/" target="_blank" style="
                            display: inline-block;
                            padding: 6px 12px;
                            background: var(--accent, #007aff);
                            color: white;
                            text-decoration: none;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: 500;
                        ">Download Extension →</a>
                        <a href="${ext.chromeStoreUrl}" target="_blank" style="
                            display: inline-block;
                            padding: 6px 12px;
                            background: rgba(255, 255, 255, 0.1);
                            color: rgba(255, 255, 255, 0.9);
                            text-decoration: none;
                            border-radius: 4px;
                            font-size: 12px;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                        ">View on Store</a>
                    </div>
                </div>
            </div>
        `;

        extensionsList.appendChild(extCard);
    }
}

function openSettings() {
    settingsOpen = true;
    settingsPanel.classList.add('active');
    // Load current settings
    const searchEngineRadios = document.querySelectorAll('input[name="searchEngine"]');
    searchEngineRadios.forEach(radio => {
        if (radio.value === currentSearchEngine) {
            radio.checked = true;
        }
    });
    
    const blockTrackers = document.getElementById('blockTrackers');
    const clearOnClose = document.getElementById('clearOnClose');
    if (blockTrackers) {
        blockTrackers.checked = localStorage.getItem('blockTrackers') !== 'false';
    }
    if (clearOnClose) {
        clearOnClose.checked = localStorage.getItem('clearOnClose') === 'true';
    }
    
    // Update Tor status display
    updateTorStatusDisplay();
}

function enableTorMode() {
    const torStatus = document.getElementById('torStatus');
    const torStatusText = document.getElementById('torStatusText');
    const torStatusDot = document.getElementById('torStatusDot');
    
    if (torStatus) {
        torStatus.style.display = 'block';
        torStatusText.textContent = 'Tor Mode Active';
        if (torStatusDot) {
            torStatusDot.style.background = '#107c10';
            torStatusDot.style.boxShadow = '0 0 8px #107c10';
        }
        updateTorInfo();
    }
}

function disableTorMode() {
    const torStatus = document.getElementById('torStatus');
    if (torStatus) {
        torStatus.style.display = 'none';
    }
}

async function updateTorStatusDisplay() {
    const torEnabled = document.getElementById('torEnabled');
    if (torEnabled && torEnabled.checked) {
        enableTorMode();
    } else {
        disableTorMode();
    }
}

async function updateTorInfo() {
    // Fetch IP info to show Tor is working
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const ipAddress = document.getElementById('torIpAddress');
        if (ipAddress) {
            ipAddress.textContent = data.ip || 'Unknown';
        }
        
        // Try to get exit node info
        const exitNode = document.getElementById('torExitNode');
        if (exitNode) {
            exitNode.textContent = 'Connected via Tor';
        }
    } catch (error) {
        const ipAddress = document.getElementById('torIpAddress');
        const exitNode = document.getElementById('torExitNode');
        if (ipAddress) ipAddress.textContent = 'Unable to fetch';
        if (exitNode) exitNode.textContent = 'Connecting...';
    }
}

function closeSettings() {
    settingsOpen = false;
    settingsPanel.classList.remove('active');
}

// Extension Icons - Removed (using WalletConnect instead)
async function initializeExtensionIcons() {
    // Extensions removed - users connect via WalletConnect
    // Function kept for compatibility but does nothing
    return;
}

function initializeButtons() {
    // New Tab Button
    const newTabBtn = document.getElementById('newTabBtn');
    if (newTabBtn) {
        newTabBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            createTab(getHomeUrl());
        });
    }

    // Settings Button - Toggle Dropdown
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsBtnContainer = settingsBtn?.parentElement;
    if (settingsBtn && settingsDropdown) {
        // Position dropdown relative to button
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownOpen && !settingsDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
                closeDropdown();
            }
        });
    }
    
    // Dropdown Menu Items
    document.getElementById('historyBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('historyPanel');
    });
    
    document.getElementById('bookmarksBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('bookmarksPanel');
    });
    
    document.getElementById('downloadsBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('downloadsPanel');
    });
    
    document.getElementById('settingsMenuBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('settingsPanel');
    });
    
    // Zoom Controls
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        updateZoom(currentZoom + 0.1);
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', () => {
        updateZoom(currentZoom - 0.1);
    });
    
    document.getElementById('zoomReset')?.addEventListener('click', () => {
        updateZoom(1.0);
    });
    
    // Panel Close Buttons
    document.getElementById('historyClose')?.addEventListener('click', () => closePanel('historyPanel'));
    document.getElementById('bookmarksClose')?.addEventListener('click', () => closePanel('bookmarksPanel'));
    document.getElementById('downloadsClose')?.addEventListener('click', () => closePanel('downloadsPanel'));
    document.getElementById('settingsClose')?.addEventListener('click', () => closePanel('settingsPanel'));
    document.getElementById('consoleClose')?.addEventListener('click', () => closePanel('consolePanel'));
    
    // Developer Console
    document.getElementById('openConsoleBtn')?.addEventListener('click', () => {
        closeAllPanels();
        openPanel('consolePanel');
    });
    
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        consoleLogs = [];
        updateConsoleDisplay();
    });
    
    document.getElementById('exportConsoleBtn')?.addEventListener('click', () => {
        const logsText = consoleLogs.map(log => `[${log.time}] ${log.type}: ${log.message}`).join('\n');
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    // Clear History Button
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (confirm('Clear all browsing history?')) {
            history = [];
            localStorage.setItem('browserHistory', JSON.stringify(history));
            renderHistory();
        }
    });
    
    // Add Bookmark Button
    document.getElementById('addBookmarkBtn')?.addEventListener('click', () => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
        if (webview) {
            const url = webview.src;
            const tab = tabs.find(t => t.id === activeTabId);
            const title = tab?.title || url;
            addBookmark(url, title);
            alert('Bookmark added!');
        }
    });
    
    // Settings Search Engine Selection
    const searchEngineRadios = document.querySelectorAll('input[name="searchEngine"]');
    searchEngineRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSearchEngine = e.target.value;
            localStorage.setItem('searchEngine', currentSearchEngine);
        });
    });
    
    // Settings Checkboxes
    const blockTrackers = document.getElementById('blockTrackers');
    if (blockTrackers) {
        blockTrackers.addEventListener('change', (e) => {
            localStorage.setItem('blockTrackers', e.target.checked);
        });
    }
    
    const clearOnClose = document.getElementById('clearOnClose');
    if (clearOnClose) {
        clearOnClose.addEventListener('change', (e) => {
            localStorage.setItem('clearOnClose', e.target.checked);
        });
    }
    
    // VPN/Tor Toggle Button (Quick Disable)
    const vpnToggleBtn = document.getElementById('vpnToggleBtn');
    const vpnToggleText = document.getElementById('vpnToggleText');
    if (vpnToggleBtn) {
        // Check initial state
        updateVpnToggleButton();
        
        vpnToggleBtn.addEventListener('click', async () => {
            // Disable both Tor and VPN for normal browsing
            if (window.electronAPI) {
                try {
                    // Disable Tor
                    if (window.electronAPI.setTorMode) {
                        await window.electronAPI.setTorMode(false);
                        localStorage.setItem('torEnabled', 'false');
                    }
                    
                    // Disable VPN
                    if (window.electronAPI.vpnSetProxy) {
                        await window.electronAPI.vpnSetProxy(null);
                        localStorage.removeItem('selectedVpnLocation');
                        localStorage.setItem('vpnUseRealLocation', 'true');
                    }
                    
                    // Update UI
                    const torEnabled = document.getElementById('torEnabled');
                    if (torEnabled) {
                        torEnabled.checked = false;
                    }
                    disableTorMode();
                    updateVpnToggleButton();
                    
                    // Reload current page to apply changes
                    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
                    if (webview) {
                        webview.reload();
                    }
                    
                    alert('VPN/Tor disabled. Normal browsing enabled.');
                } catch (error) {
                    console.error('Failed to disable VPN/Tor:', error);
                    alert('Failed to disable VPN/Tor: ' + error.message);
                }
            }
        });
    }
    
    function updateVpnToggleButton() {
        if (!vpnToggleBtn || !vpnToggleText) return;
        
        const torEnabled = localStorage.getItem('torEnabled') === 'true';
        const vpnLocation = localStorage.getItem('selectedVpnLocation');
        const isActive = torEnabled || vpnLocation;
        
        if (isActive) {
            vpnToggleBtn.classList.add('active');
            vpnToggleText.textContent = 'VPN ON';
            vpnToggleBtn.title = 'VPN/Tor Active - Click to disable for normal browsing';
        } else {
            vpnToggleBtn.classList.remove('active');
            vpnToggleText.textContent = 'VPN';
            vpnToggleBtn.title = 'VPN/Tor - Click to disable for normal browsing';
        }
    }
    
    // Tor Mode Toggle
    const torEnabled = document.getElementById('torEnabled');
    if (torEnabled) {
        // Load saved state
        const savedTorState = localStorage.getItem('torEnabled') === 'true';
        torEnabled.checked = savedTorState;
        
        torEnabled.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('torEnabled', enabled);
            if (window.electronAPI && window.electronAPI.setTorMode) {
                try {
                    await window.electronAPI.setTorMode(enabled);
                    updateVpnToggleButton();
                } catch (error) {
                    console.error('Failed to set Tor mode:', error);
                    alert('Failed to enable Tor mode. Make sure Tor is running on localhost:9050');
                    e.target.checked = false;
                    return;
                }
            }
            if (enabled) {
                enableTorMode();
            } else {
                disableTorMode();
            }
            updateVpnToggleButton();
        });
        
        // Initialize Tor status
        if (savedTorState) {
            enableTorMode();
        } else {
            disableTorMode();
        }
        updateVpnToggleButton();
    }
    
    // Close panels when clicking outside
    ['historyPanel', 'bookmarksPanel', 'downloadsPanel', 'settingsPanel', 'walletPanel', 'consolePanel'].forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.addEventListener('click', (e) => {
                if (e.target === panel) {
                    closePanel(panelId);
                }
            });
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+H - History
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            openPanel('historyPanel');
        }
        // Ctrl+J - Downloads
        if (e.ctrlKey && e.key === 'j') {
            e.preventDefault();
            openPanel('downloadsPanel');
        }
        // Ctrl+Shift+O - Bookmarks
        if (e.ctrlKey && e.shiftKey && e.key === 'O') {
            e.preventDefault();
            openPanel('bookmarksPanel');
        }
    });
    
        // Initialize zoom display
    updateZoomDisplay();
    
    // Wallet Button
    document.getElementById('walletBtn')?.addEventListener('click', () => {
        openWalletPanel();
    });
    
    // Wallet Panel Close
    document.getElementById('walletClose')?.addEventListener('click', () => {
        closePanel('walletPanel');
    });
    
    // Wallet Setup Buttons
    document.getElementById('createWalletBtn')?.addEventListener('click', () => {
        document.getElementById('createWalletForm').style.display = 'block';
        document.getElementById('importWalletForm').style.display = 'none';
    });
    
    document.getElementById('importWalletBtn')?.addEventListener('click', () => {
        document.getElementById('importWalletForm').style.display = 'block';
        document.getElementById('createWalletForm').style.display = 'none';
    });
    
    // Create Wallet
    document.getElementById('createWalletSubmit')?.addEventListener('click', async () => {
        const password = document.getElementById('createPassword').value;
        const confirmPassword = document.getElementById('createPasswordConfirm').value;
        
        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        try {
            const result = await window.electronAPI.walletCreate(password);
            document.getElementById('walletPrivateKey').value = result.secretKey;
            document.getElementById('walletMnemonic').style.display = 'block';
            document.getElementById('createPassword').value = '';
            document.getElementById('createPasswordConfirm').value = '';
        } catch (error) {
            alert('Failed to create wallet: ' + error.message);
        }
    });
    
    document.getElementById('walletMnemonicConfirm')?.addEventListener('click', () => {
        document.getElementById('walletMnemonic').style.display = 'none';
        document.getElementById('createWalletForm').style.display = 'none';
        loadWalletDashboard();
    });
    
    // Import Wallet
    document.getElementById('importWalletSubmit')?.addEventListener('click', async () => {
        const privateKey = document.getElementById('importPrivateKey').value.trim();
        const password = document.getElementById('importPassword').value;
        
        if (!privateKey || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        try {
            await window.electronAPI.walletImportFromPrivateKey(privateKey, password);
            document.getElementById('importPrivateKey').value = '';
            document.getElementById('importPassword').value = '';
            document.getElementById('importWalletForm').style.display = 'none';
            loadWalletDashboard();
        } catch (error) {
            alert('Failed to import wallet: ' + error.message);
        }
    });
    
    // Login Wallet
    document.getElementById('loginWalletBtn')?.addEventListener('click', async () => {
        const password = document.getElementById('loginPassword').value;
        
        if (!password) {
            alert('Please enter password');
            return;
        }
        
        try {
            await window.electronAPI.walletLoad(password);
            document.getElementById('loginPassword').value = '';
            loadWalletDashboard();
        } catch (error) {
            alert('Failed to unlock wallet: ' + error.message);
        }
    });
    
    // Wallet Dashboard
    document.getElementById('refreshBalanceBtn')?.addEventListener('click', async () => {
        await refreshWalletBalance();
    });
    
    // Network selector change handler
    document.getElementById('walletNetworkSelect')?.addEventListener('change', async () => {
        await updateWalletDisplay();
    });
    
    // Copy address (based on selected network)
    document.getElementById('copyAddressBtn')?.addEventListener('click', async () => {
        const network = document.getElementById('walletNetworkSelect').value;
        if (network === 'solana') {
            const publicKey = await window.electronAPI.walletGetPublicKey();
            if (publicKey) {
                navigator.clipboard.writeText(publicKey);
                alert('Solana address copied to clipboard!');
            }
        } else {
            const evmAddress = await window.electronAPI.walletGetEvmAddress();
            if (evmAddress) {
                navigator.clipboard.writeText(evmAddress);
                alert('EVM address copied to clipboard!');
            }
        }
    });
    
    // Update placeholder based on selected chain
    document.getElementById('sendChain')?.addEventListener('change', (e) => {
        const chain = e.target.value;
        const addressInput = document.getElementById('sendToAddress');
        const amountInput = document.getElementById('sendAmount');
        
        if (chain === 'solana') {
            addressInput.placeholder = 'Enter Solana address';
            amountInput.placeholder = '0.00 SOL';
        } else {
            addressInput.placeholder = 'Enter Ethereum address';
            amountInput.placeholder = '0.00 ETH';
        }
    });
    
    // Send transaction (supports both chains)
    document.getElementById('sendTransactionBtn')?.addEventListener('click', async () => {
        const chain = document.getElementById('sendChain').value;
        const toAddress = document.getElementById('sendToAddress').value.trim();
        const amount = parseFloat(document.getElementById('sendAmount').value);
        
        if (!toAddress) {
            alert('Please enter recipient address');
            return;
        }
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        const chainName = chain === 'solana' ? 'SOL' : 'ETH';
        const shortAddress = toAddress.substring(0, 8) + '...' + toAddress.substring(toAddress.length - 8);
        
        if (confirm(`Send ${amount} ${chainName} to ${shortAddress}?`)) {
            try {
                if (chain === 'solana') {
                    const signature = await window.electronAPI.walletSendSol(toAddress, amount);
                    alert(`Transaction sent! Signature: ${signature}`);
                } else {
                    const txHash = await window.electronAPI.walletSendEvmTransaction(toAddress, amount.toString(), '0x', 1);
                    alert(`Transaction sent! Hash: ${txHash}`);
                }
                document.getElementById('sendToAddress').value = '';
                document.getElementById('sendAmount').value = '';
                await refreshWalletBalance();
            } catch (error) {
                alert(`Failed to send ${chainName}: ` + error.message);
            }
        }
    });
    
    // Initialize wallet panel state
    checkWalletState();
}

// Wallet Functions
async function checkWalletState() {
    const hasWallet = await window.electronAPI.walletHasWallet();
    const isLoaded = await window.electronAPI.walletIsLoaded();
    
    if (!hasWallet) {
        showWalletSetup();
    } else if (!isLoaded) {
        showWalletLogin();
    } else {
        loadWalletDashboard();
    }
}

function showWalletSetup() {
    document.getElementById('walletSetup').style.display = 'block';
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'none';
}

function showWalletLogin() {
    document.getElementById('walletSetup').style.display = 'none';
    document.getElementById('walletLogin').style.display = 'block';
    document.getElementById('walletDashboard').style.display = 'none';
}

async function loadWalletDashboard() {
    document.getElementById('walletSetup').style.display = 'none';
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'block';
    
    // Setup network selector
    const networkSelect = document.getElementById('walletNetworkSelect');
    networkSelect.addEventListener('change', async () => {
        await updateWalletDisplay();
    });
    
    await updateWalletDisplay();
}

async function updateWalletDisplay() {
    const network = document.getElementById('walletNetworkSelect').value;
    const balanceLabel = document.getElementById('walletBalanceLabel');
    const balanceAmount = document.getElementById('walletBalance');
    const address = document.getElementById('walletAddress');
    
    if (network === 'solana') {
        balanceLabel.textContent = 'Solana Balance';
        const publicKey = await window.electronAPI.walletGetPublicKey();
        if (publicKey) {
            address.textContent = publicKey;
        }
        await refreshWalletBalance();
    } else {
        balanceLabel.textContent = 'Ethereum Balance';
        const evmAddress = await window.electronAPI.walletGetEvmAddress();
        if (evmAddress) {
            address.textContent = evmAddress;
        }
        await refreshWalletBalance();
    }
}

async function refreshWalletBalance() {
    const network = document.getElementById('walletNetworkSelect').value;
    const balanceAmount = document.getElementById('walletBalance');
    
    try {
        if (network === 'solana') {
            const balance = await window.electronAPI.walletGetBalance();
            balanceAmount.textContent = balance.toFixed(4) + ' SOL';
        } else {
            const evmBalance = await window.electronAPI.walletGetEvmBalance(1);
            balanceAmount.textContent = parseFloat(evmBalance).toFixed(4) + ' ETH';
        }
    } catch (error) {
        balanceAmount.textContent = 'Error loading balance';
    }
}

function openWalletPanel() {
    closeAllPanels();
    checkWalletState();
    openPanel('walletPanel');
}

// Position dropdown relative to settings button (already positioned via CSS, no need to adjust)

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeButtons();
        initializeExtensionIcons();
        setupAdBlockerToggle();
        // Initialize first tab
        createTab(getHomeUrl());
    });
} else {
    // DOM is already ready
    initializeButtons();
    setupAdBlockerToggle();
    initializeExtensionIcons();
    createTab(getHomeUrl());
}

// Periodically update nav buttons
setInterval(updateNavButtons, 500);

// Solana Provider Injection
const solanaProviderScript = `
(function() {
    if (window.solana && window.solana.isOmega) return;
    
    class OmegaSolanaProvider {
        constructor() {
            this.isConnected = false;
            this.publicKey = null;
            this.listeners = {};
            this.isPhantom = true; // Set to true so Solana dApps recognize it
            this.isOmega = true;
        }
        
        async connect(opts) {
            const requestId = Date.now() + Math.random();
            return new Promise((resolve, reject) => {
                window.postMessage({ 
                    type: 'OMEGA_WALLET_REQUEST',
                    action: 'connect',
                    id: requestId
                }, '*');
                
                const handler = (event) => {
                    if (event.data && event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'connect' && event.data.id === requestId) {
                        window.removeEventListener('message', handler);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            const pubKey = { toString: () => event.data.publicKey, toBase58: () => event.data.publicKey };
                            this.publicKey = pubKey;
                            this.isConnected = true;
                            this.emit('connect', { publicKey: this.publicKey });
                            resolve({ publicKey: this.publicKey });
                        }
                    }
                };
                window.addEventListener('message', handler);
                
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    reject(new Error('Connection timeout'));
                }, 30000);
            });
        }
        
        async disconnect() {
            this.isConnected = false;
            this.publicKey = null;
            this.emit('disconnect');
        }
        
        async signTransaction(transaction) {
            if (!this.isConnected) throw new Error('Wallet not connected');
            
            const requestId = Date.now() + Math.random();
            const serialized = transaction.serialize({ requireAllSignatures: false });
            const base64 = btoa(String.fromCharCode(...serialized));
            
            // Store request in queue
            if (!window.__omegaSolanaQueue) {
                window.__omegaSolanaQueue = [];
            }
            window.__omegaSolanaQueue.push({
                type: 'OMEGA_WALLET_REQUEST',
                action: 'signTransaction',
                data: base64,
                id: requestId
            });
            
            // Poll for response
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const pollInterval = setInterval(() => {
                    if (!window.__omegaSolanaResponses) {
                        window.__omegaSolanaResponses = {};
                    }
                    
                    if (window.__omegaSolanaResponses[requestId]) {
                        clearInterval(pollInterval);
                        const response = window.__omegaSolanaResponses[requestId];
                        delete window.__omegaSolanaResponses[requestId];
                        
                        if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            try {
                                const signed = Uint8Array.from(atob(response.data), c => c.charCodeAt(0));
                                const Transaction = window.solanaWeb3?.Transaction;
                                if (Transaction) {
                                    resolve(Transaction.from(signed));
                                } else {
                                    resolve({ serialize: () => signed });
                                }
                            } catch (e) {
                                reject(e);
                            }
                        }
                    } else if (Date.now() - startTime > 30000) {
                        clearInterval(pollInterval);
                        reject(new Error('Request timeout'));
                    }
                }, 50);
            });
        }
        
        async signAllTransactions(transactions) {
            const signed = [];
            for (const tx of transactions) {
                signed.push(await this.signTransaction(tx));
            }
            return signed;
        }
        
        async signMessage(message, encoding = 'utf8') {
            if (!this.isConnected) throw new Error('Wallet not connected');
            
            const requestId = Date.now() + Math.random();
            const messageStr = typeof message === 'string' ? message : new TextDecoder(encoding).decode(message);
            
            // Store request in queue
            if (!window.__omegaSolanaQueue) {
                window.__omegaSolanaQueue = [];
            }
            window.__omegaSolanaQueue.push({
                type: 'OMEGA_WALLET_REQUEST',
                action: 'signMessage',
                data: messageStr,
                id: requestId
            });
            
            // Poll for response
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const pollInterval = setInterval(() => {
                    if (!window.__omegaSolanaResponses) {
                        window.__omegaSolanaResponses = {};
                    }
                    
                    if (window.__omegaSolanaResponses[requestId]) {
                        clearInterval(pollInterval);
                        const response = window.__omegaSolanaResponses[requestId];
                        delete window.__omegaSolanaResponses[requestId];
                        
                        if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve({ signature: Uint8Array.from(atob(response.data), c => c.charCodeAt(0)) });
                        }
                    } else if (Date.now() - startTime > 30000) {
                        clearInterval(pollInterval);
                        reject(new Error('Request timeout'));
                    }
                }, 50);
            });
        }
        
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        }
        
        removeListener(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        }
        
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        }
    }
    
    window.solana = new OmegaSolanaProvider();
})();
`;

function injectSolanaProvider(webview) {
    webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(solanaProviderScript).catch(() => {});
        
        // Initialize queues
        webview.executeJavaScript(`
            window.__omegaSolanaQueue = window.__omegaSolanaQueue || [];
            window.__omegaSolanaResponses = window.__omegaSolanaResponses || {};
        `).catch(() => {});
    });
    
    // Poll for requests from webview
    const pollInterval = setInterval(async () => {
        try {
            const queue = await webview.executeJavaScript('window.__omegaSolanaQueue || []').catch(() => []);
            if (queue.length > 0) {
                // Clear queue
                await webview.executeJavaScript('window.__omegaSolanaQueue = []').catch(() => {});
                
                // Process each request
                for (const request of queue) {
                    await handleWalletRequest(webview, request);
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }, 100);
    
    webview.addEventListener('destroyed', () => {
        clearInterval(pollInterval);
    });
}

async function handleWalletRequest(webview, request) {
    try {
        let response;
        
        switch (request.action) {
            case 'connect':
                const publicKey = await window.electronAPI.walletGetPublicKey();
                if (!publicKey) {
                    response = { error: 'Wallet not unlocked. Please unlock Omega Wallet first.' };
                } else {
                    response = { publicKey: publicKey };
                }
                break;
                
            case 'signTransaction':
                const signedTx = await window.electronAPI.walletSignTransaction(request.data);
                response = { data: signedTx };
                break;
                
            case 'signMessage':
                const signature = await window.electronAPI.walletSignMessage(request.data);
                response = { data: signature };
                break;
                
            default:
                response = { error: 'Unknown action' };
        }
        
        // Send response back to webview via response queue
        webview.executeJavaScript(`
            if (!window.__omegaSolanaResponses) window.__omegaSolanaResponses = {};
            window.__omegaSolanaResponses[${JSON.stringify(request.id)}] = ${JSON.stringify(response)};
        `).catch(() => {});
    } catch (error) {
        const errorResponse = { type: 'OMEGA_WALLET_RESPONSE', error: error.message, id: request.id, action: request.action };
        webview.executeJavaScript(`
            window.postMessage(${JSON.stringify(errorResponse)}, '*');
        `);
    }
}

// EVM Provider Injection
const evmProviderScript = `
(function() {
    if (window.ethereum && window.ethereum.isOmega) return;
    
    class OmegaEVMProvider {
        constructor() {
            this.isConnected = false;
            this.selectedAddress = null;
            this.chainId = '0x1'; // Ethereum mainnet by default
            this.listeners = {};
            this.isOmega = true;
            this.isMetaMask = false; // Compatibility flag
        }
        
        async request(args) {
            const { method, params } = args;
            const requestId = Date.now() + Math.random();
            
            // Store request in global queue for renderer to poll
            if (!window.__omegaEVMQueue) {
                window.__omegaEVMQueue = [];
            }
            window.__omegaEVMQueue.push({
                type: 'OMEGA_EVM_REQUEST',
                method: method,
                params: params || [],
                id: requestId
            });
            
            // Poll for response
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const pollInterval = setInterval(() => {
                    // Check for response
                    if (!window.__omegaEVMResponses) {
                        window.__omegaEVMResponses = {};
                    }
                    
                    if (window.__omegaEVMResponses[requestId]) {
                        clearInterval(pollInterval);
                        const response = window.__omegaEVMResponses[requestId];
                        delete window.__omegaEVMResponses[requestId];
                        
                        if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve(response.result);
                        }
                    } else if (Date.now() - startTime > 30000) {
                        clearInterval(pollInterval);
                        reject(new Error('Request timeout'));
                    }
                }, 50);
            });
        }
        
        async enable() {
            return this.request({ method: 'eth_requestAccounts' });
        }
        
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        }
        
        removeListener(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        }
        
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        }
    }
    
    const provider = new OmegaEVMProvider();
    
    // EIP-1193 standard - MUST be set before dApps check
    window.ethereum = provider;
    
    // MetaMask detection flags
    window.ethereum.isMetaMask = true;
    window.ethereum._metamask = provider;
    
    // Legacy web3 compatibility
    if (!window.web3) {
        window.web3 = {
            currentProvider: provider,
            eth: {
                accounts: [],
                getAccounts: () => provider.request({ method: 'eth_accounts' })
            }
        };
    }
    
    // Emit connect event if already has accounts
    if (provider.selectedAddress) {
        provider.emit('connect', { chainId: provider.chainId });
    }
})();
`;

function injectEVMProvider(webview) {
    // Initialize request queue
    webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(evmProviderScript).catch(() => {});
        
        // Initialize queues
        webview.executeJavaScript(`
            window.__omegaEVMQueue = window.__omegaEVMQueue || [];
            window.__omegaEVMResponses = window.__omegaEVMResponses || {};
        `).catch(() => {});
    });
    
    // Poll for requests from webview
    const pollInterval = setInterval(async () => {
        try {
            const queue = await webview.executeJavaScript('window.__omegaEVMQueue || []').catch(() => []);
            if (queue.length > 0) {
                // Clear queue
                await webview.executeJavaScript('window.__omegaEVMQueue = []').catch(() => {});
                
                // Process each request
                for (const request of queue) {
                    await handleEVMRequest(webview, request);
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }, 100);
    
    webview.addEventListener('destroyed', () => {
        clearInterval(pollInterval);
    });
}

async function handleEVMRequest(webview, request) {
    try {
        let response;
        
        switch (request.method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
                const evmAddress = await window.electronAPI.walletGetEvmAddress();
                if (!evmAddress) {
                    response = { error: 'Wallet not unlocked. Please unlock Omega Wallet first.' };
                } else {
                    response = { result: [evmAddress] };
                }
                break;
                
            case 'eth_chainId':
                response = { result: '0x1' }; // Ethereum mainnet
                break;
                
            case 'eth_getBalance':
                const address = request.params[0];
                const chainId = parseInt(request.params[1] || '0x1', 16);
                const balance = await window.electronAPI.walletGetEvmBalance(chainId);
                // Convert balance to hex (wei)
                const balanceWei = BigInt(Math.floor(parseFloat(balance) * 1e18)).toString(16);
                response = { result: '0x' + balanceWei };
                break;
                
            case 'eth_sendTransaction':
                const tx = request.params[0];
                // Convert value from hex wei to ether string
                const valueHex = tx.value || '0x0';
                const valueWei = BigInt(valueHex);
                const valueEth = (Number(valueWei) / 1e18).toString();
                const txChainId = parseInt(tx.chainId || '0x1', 16);
                const txHash = await window.electronAPI.walletSendEvmTransaction(
                    tx.to,
                    valueEth,
                    tx.data || '0x',
                    txChainId
                );
                response = { result: txHash };
                break;
                
            case 'eth_sign':
            case 'personal_sign':
                const message = request.params[0] || request.params[1];
                const signature = await window.electronAPI.walletSignEvmMessage(message);
                response = { result: signature };
                break;
                
            case 'eth_signTransaction':
                const signedTx = await window.electronAPI.walletSignEvmTransaction(request.params[0]);
                response = { result: signedTx };
                break;
                
            default:
                response = { error: 'Method not supported: ' + request.method };
        }
        
        // Send response back to webview via response queue
        if (!response.error) {
            webview.executeJavaScript(`
                if (!window.__omegaEVMResponses) window.__omegaEVMResponses = {};
                window.__omegaEVMResponses[${JSON.stringify(request.id)}] = ${JSON.stringify(response)};
            `).catch(() => {});
        } else {
            webview.executeJavaScript(`
                if (!window.__omegaEVMResponses) window.__omegaEVMResponses = {};
                window.__omegaEVMResponses[${JSON.stringify(request.id)}] = ${JSON.stringify(response)};
            `).catch(() => {});
        }
    } catch (error) {
        const errorResponse = { type: 'OMEGA_EVM_RESPONSE', error: error.message, id: request.id };
        webview.executeJavaScript(`
            window.postMessage(${JSON.stringify(errorResponse)}, '*');
        `);
    }
}

// Listen for messages from all webviews
window.addEventListener('message', async (event) => {
    // Find the webview that sent this message
    if (event.data && event.data.type === 'OMEGA_WALLET_REQUEST') {
        const webviews = document.querySelectorAll('webview');
        for (const webview of webviews) {
            // Check if message came from this webview (approximate check)
            await handleWalletRequest(webview, event.data);
            break; // Handle first matching for now
        }
    } else if (event.data && event.data.type === 'OMEGA_EVM_REQUEST') {
        const webviews = document.querySelectorAll('webview');
        for (const webview of webviews) {
            await handleEVMRequest(webview, event.data);
            break;
        }
    }
});

