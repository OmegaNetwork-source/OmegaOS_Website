// Omega Identity Manager UI
let currentWindowId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
    }

    // Window Controls
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

    // Initialize Identity Button
    document.getElementById('initializeIdentityBtn').addEventListener('click', async () => {
        await initializeIdentity();
    });

    // Test Login Button
    document.getElementById('testLoginBtn').addEventListener('click', async () => {
        await testAuthentication();
    });

    // Purchase Pro License Button
    document.getElementById('purchaseProBtn').addEventListener('click', async () => {
        await purchaseProLicense();
    });

    // Load identity status on startup
    loadIdentityStatus();
    checkLicenses();
});

async function loadIdentityStatus() {
    const identityInfo = document.getElementById('identityInfo');
    const initializeBtn = document.getElementById('initializeIdentityBtn');
    
    try {
        // Check if wallet is loaded first
        const walletLoaded = await window.electronAPI.walletIsLoaded();
        if (!walletLoaded) {
            identityInfo.innerHTML = '<p class="error">Please unlock your wallet first to use Omega Identity.</p>';
            return;
        }

        // Check if identity exists
        const hasIdentity = await window.electronAPI.identityHasIdentity();
        
        if (!hasIdentity) {
            identityInfo.innerHTML = '<p>No identity found. Click below to initialize your Omega Identity.</p>';
            initializeBtn.style.display = 'block';
            return;
        }

        // Load identity
        const result = await window.electronAPI.identityGet();
        
        if (result.success && result.identity) {
            const identity = result.identity;
            identityInfo.innerHTML = `
                <p><strong>Omega ID:</strong></p>
                <p class="omega-id">${identity.omegaId}</p>
                <p><strong>Wallet Address:</strong></p>
                <p class="address">${identity.address}</p>
                <p><strong>Created:</strong> ${new Date(identity.createdAt).toLocaleString()}</p>
            `;
            initializeBtn.style.display = 'none';
            
            // Load synced documents
            loadSyncedDocuments();
        } else {
            identityInfo.innerHTML = '<p class="error">Failed to load identity: ' + (result.error || 'Unknown error') + '</p>';
            initializeBtn.style.display = 'block';
        }
    } catch (error) {
        identityInfo.innerHTML = '<p class="error">Error loading identity: ' + error.message + '</p>';
        initializeBtn.style.display = 'block';
    }
}

async function initializeIdentity() {
    const identityInfo = document.getElementById('identityInfo');
    const initializeBtn = document.getElementById('initializeIdentityBtn');
    
    try {
        identityInfo.innerHTML = '<p class="loading">Initializing identity on Omega Network...</p>';
        initializeBtn.disabled = true;
        
        const result = await window.electronAPI.identityInitialize();
        
        if (result.success) {
            if (result.exists) {
                identityInfo.innerHTML = '<p class="success">Identity loaded successfully!</p>';
            } else {
                identityInfo.innerHTML = '<p class="success">Identity created and registered on Omega Network!</p>';
            }
            
            // Reload identity display
            setTimeout(() => {
                loadIdentityStatus();
            }, 1000);
        } else {
            identityInfo.innerHTML = '<p class="error">Failed to initialize identity: ' + (result.error || 'Unknown error') + '</p>';
            initializeBtn.disabled = false;
        }
    } catch (error) {
        identityInfo.innerHTML = '<p class="error">Error initializing identity: ' + error.message + '</p>';
        initializeBtn.disabled = false;
    }
}

async function loadSyncedDocuments() {
    const syncedDocumentsDiv = document.getElementById('syncedDocuments');
    const syncStatus = document.getElementById('syncStatus');
    
    try {
        const result = await window.electronAPI.identityGetSyncedDocuments();
        
        if (result.success && result.documents && result.documents.length > 0) {
            syncStatus.innerHTML = `<p>Found ${result.documents.length} synced document(s)</p>`;
            syncedDocumentsDiv.innerHTML = result.documents.map(doc => `
                <div class="document-item">
                    <div>
                        <div class="document-name">${doc.name || doc.documentId}</div>
                        <div class="document-hash">${doc.hash}</div>
                    </div>
                </div>
            `).join('');
        } else {
            syncStatus.innerHTML = '<p>No synced documents yet. Documents will appear here when synced.</p>';
            syncedDocumentsDiv.innerHTML = '';
        }
    } catch (error) {
        syncStatus.innerHTML = '<p class="error">Error loading synced documents: ' + error.message + '</p>';
    }
}

async function checkLicenses() {
    const proLicenseStatus = document.getElementById('proLicenseStatus');
    const purchaseProBtn = document.getElementById('purchaseProBtn');
    
    try {
        const result = await window.electronAPI.identityCheckLicense('omega-os-pro');
        
        if (result.hasLicense) {
            proLicenseStatus.textContent = '✓ Active';
            proLicenseStatus.className = 'license-status active';
            purchaseProBtn.style.display = 'none';
        } else {
            proLicenseStatus.textContent = '✗ Not Licensed';
            proLicenseStatus.className = 'license-status inactive';
            purchaseProBtn.style.display = 'block';
        }
    } catch (error) {
        proLicenseStatus.textContent = 'Error checking license';
        proLicenseStatus.className = 'license-status inactive';
    }
}

async function purchaseProLicense() {
    const purchaseProBtn = document.getElementById('purchaseProBtn');
    const proLicenseStatus = document.getElementById('proLicenseStatus');
    
    try {
        purchaseProBtn.disabled = true;
        purchaseProBtn.textContent = 'Processing...';
        
        // Price in Omega tokens (example: 100 tokens)
        const price = 100;
        const result = await window.electronAPI.identityPurchaseLicense('omega-os-pro', price);
        
        if (result.success) {
            proLicenseStatus.textContent = '✓ Active';
            proLicenseStatus.className = 'license-status active';
            purchaseProBtn.style.display = 'none';
            alert('License purchased successfully! Transaction: ' + result.txHash);
        } else {
            alert('Failed to purchase license: ' + (result.error || 'Unknown error'));
            purchaseProBtn.disabled = false;
            purchaseProBtn.textContent = 'Purchase License';
        }
    } catch (error) {
        alert('Error purchasing license: ' + error.message);
        purchaseProBtn.disabled = false;
        purchaseProBtn.textContent = 'Purchase License';
    }
}

async function testAuthentication() {
    const loginResult = document.getElementById('loginResult');
    const testLoginBtn = document.getElementById('testLoginBtn');
    
    try {
        testLoginBtn.disabled = true;
        loginResult.style.display = 'none';
        
        const message = 'Omega OS Authentication - ' + Date.now();
        const result = await window.electronAPI.identityAuthenticate(message);
        
        if (result.success) {
            loginResult.className = 'login-result success';
            loginResult.innerHTML = `
                <strong>Authentication Successful!</strong><br>
                Omega ID: ${result.omegaId}<br>
                Address: ${result.address}<br>
                Signature: ${result.signature.substring(0, 20)}...<br>
                Timestamp: ${new Date(result.timestamp).toLocaleString()}
            `;
            loginResult.style.display = 'block';
        } else {
            loginResult.className = 'login-result error';
            loginResult.innerHTML = '<strong>Authentication Failed:</strong> ' + (result.error || 'Unknown error');
            loginResult.style.display = 'block';
        }
    } catch (error) {
        loginResult.className = 'login-result error';
        loginResult.innerHTML = '<strong>Error:</strong> ' + error.message;
        loginResult.style.display = 'block';
    } finally {
        testLoginBtn.disabled = false;
    }
}

