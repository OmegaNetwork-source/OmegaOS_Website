// Cookie Manager Script
let currentDomain = null;
let allCookies = [];
let allDomains = [];

// Window Controls
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (!window.electronAPI) {
        console.error('Electron API not available');
        return;
    }

    // Get window ID (can be null - main process will auto-detect)
    let currentWindowId = null;
    window.electronAPI.getWindowId().then(id => {
        currentWindowId = id;
    }).catch(err => {
        console.error('Error getting window ID:', err);
    });

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            try {
                // Can pass null - main process will auto-detect from sender
                window.electronAPI.appWindowMinimize(currentWindowId);
            } catch (error) {
                console.error('Error minimizing window:', error);
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            try {
                // Maximize toggles automatically (maximizes if not, unmaximizes if maximized)
                window.electronAPI.appWindowMaximize(currentWindowId);
            } catch (error) {
                console.error('Error toggling maximize:', error);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            try {
                window.electronAPI.appWindowClose(currentWindowId);
            } catch (error) {
                console.error('Error closing window:', error);
            }
        });
    }
}

// Load domains
async function loadDomains() {
    try {
        const result = await window.electronAPI.cookiesGetDomains();
        if (result.success) {
            allDomains = result.domains;
            renderDomains();
        } else {
            console.error('Failed to load domains:', result.error);
        }
    } catch (error) {
        console.error('Error loading domains:', error);
    }
}

// Render domains list
function renderDomains(filter = '') {
    const domainsList = document.getElementById('domainsList');
    const filterLower = filter.toLowerCase();
    
    const filteredDomains = allDomains.filter(domain => 
        domain.toLowerCase().includes(filterLower)
    );

    if (filteredDomains.length === 0) {
        domainsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍪</div>
                <div>No cookies found</div>
            </div>
        `;
        return;
    }

    domainsList.innerHTML = filteredDomains.map(domain => {
        const domainCookies = allCookies.filter(c => {
            const cookieDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
            return cookieDomain === domain;
        });
        
        return `
            <div class="domain-item" data-domain="${domain}">
                <div class="domain-info">
                    <div class="domain-name">${domain}</div>
                    <div class="domain-count">${domainCookies.length} cookie(s)</div>
                </div>
                <button class="cookie-btn secondary" onclick="loadDomainCookies('${domain}')">View</button>
                <button class="cookie-btn secondary" onclick="deleteDomain('${domain}')" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: rgba(239, 68, 68, 0.9);">Delete</button>
            </div>
        `;
    }).join('');
}

// Load cookies for a domain
async function loadDomainCookies(domain) {
    currentDomain = domain;
    try {
        const result = await window.electronAPI.cookiesGetAll(domain);
        if (result.success) {
            allCookies = result.cookies;
            renderCookies(result.cookies);
            document.getElementById('cookiesList').style.display = 'block';
        } else {
            console.error('Failed to load cookies:', result.error);
        }
    } catch (error) {
        console.error('Error loading cookies:', error);
    }
}

// Render cookies list
function renderCookies(cookies) {
    const cookiesList = document.getElementById('cookiesList');
    
    if (cookies.length === 0) {
        cookiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍪</div>
                <div>No cookies for ${currentDomain}</div>
            </div>
        `;
        return;
    }

    cookiesList.innerHTML = `
        <h3 style="margin-bottom: 16px; color: rgba(255, 255, 255, 0.9);">Cookies for ${currentDomain}</h3>
        ${cookies.map(cookie => {
            const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
            return `
                <div class="cookie-item">
                    <div class="cookie-info">
                        <div class="cookie-name">${cookie.name}</div>
                        <div class="cookie-details">
                            Path: ${cookie.path} | 
                            ${cookie.secure ? 'Secure' : 'Not Secure'} | 
                            ${cookie.httpOnly ? 'HTTP Only' : ''}
                            ${cookie.expirationDate ? `| Expires: ${new Date(cookie.expirationDate * 1000).toLocaleDateString()}` : '| Session Cookie'}
                        </div>
                    </div>
                    <div class="cookie-actions">
                        <button class="cookie-action-btn" onclick="deleteCookie('${url}', '${cookie.name}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// Delete a cookie
async function deleteCookie(url, name) {
    try {
        const result = await window.electronAPI.cookiesDelete(url, name);
        if (result.success) {
            if (currentDomain) {
                loadDomainCookies(currentDomain);
            }
            loadDomains();
        } else {
            alert('Failed to delete cookie: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting cookie:', error);
        alert('Error deleting cookie: ' + error.message);
    }
}

// Delete all cookies for a domain
async function deleteDomain(domain) {
    if (!confirm(`Delete all cookies for ${domain}?`)) return;
    
    try {
        const result = await window.electronAPI.cookiesDeleteDomain(domain);
        if (result.success) {
            alert(`Deleted ${result.deleted} cookie(s) for ${domain}`);
            loadDomains();
            if (currentDomain === domain) {
                document.getElementById('cookiesList').style.display = 'none';
                currentDomain = null;
            }
        } else {
            alert('Failed to delete cookies: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting domain cookies:', error);
        alert('Error deleting cookies: ' + error.message);
    }
}

// Clear all cookies
async function clearAllCookies() {
    if (!confirm('Delete ALL cookies? This cannot be undone.')) return;
    
    try {
        for (const domain of allDomains) {
            await window.electronAPI.cookiesDeleteDomain(domain);
        }
        alert('All cookies deleted');
        loadDomains();
        document.getElementById('cookiesList').style.display = 'none';
        currentDomain = null;
    } catch (error) {
        console.error('Error clearing all cookies:', error);
        alert('Error clearing cookies: ' + error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupWindowControls();
    
    // Load all cookies first to get counts
    try {
        const result = await window.electronAPI.cookiesGetAll();
        if (result.success) {
            allCookies = result.cookies;
        }
    } catch (error) {
        console.error('Error loading all cookies:', error);
    }
    
    await loadDomains();
    
    // Filter input
    document.getElementById('domainFilter').addEventListener('input', (e) => {
        renderDomains(e.target.value);
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadDomains();
        if (currentDomain) {
            await loadDomainCookies(currentDomain);
        }
    });
    
    // Clear all button
    document.getElementById('clearAllBtn').addEventListener('click', clearAllCookies);
});

// Make functions global for onclick handlers
window.loadDomainCookies = loadDomainCookies;
window.deleteCookie = deleteCookie;
window.deleteDomain = deleteDomain;


