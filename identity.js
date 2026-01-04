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

    // License action buttons
    document.getElementById('stakeLicenseBtn')?.addEventListener('click', async () => {
        await stakeForLicense();
    });

    document.getElementById('purchaseLicenseBtn')?.addEventListener('click', async () => {
        await purchaseLifetimeLicense();
    });

    // Load identity status on startup
    loadIdentityStatus();
    checkLicenseStatus();
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
            syncedDocumentsDiv.innerHTML = result.documents.map(doc => {
                const date = new Date(doc.timestamp);
                const typeIcon = doc.documentType === 'word' ? '📄' : 
                                doc.documentType === 'sheets' ? '📊' : 
                                doc.documentType === 'slides' ? '📽️' : '📁';
                return `
                <div class="document-item">
                    <div class="document-icon">${typeIcon}</div>
                    <div class="document-info">
                        <div class="document-name">${doc.fileName || doc.documentId}</div>
                        <div class="document-meta">
                            <span class="document-type">${doc.documentType || 'file'}</span>
                            <span class="document-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
                        </div>
                        <div class="document-hash">Hash: ${doc.documentHash.substring(0, 16)}...</div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            syncStatus.innerHTML = '<p>No synced documents yet. Documents will appear here when synced.</p>';
            syncedDocumentsDiv.innerHTML = '';
        }
    } catch (error) {
        syncStatus.innerHTML = '<p class="error">Error loading synced documents: ' + error.message + '</p>';
        syncedDocumentsDiv.innerHTML = '';
    }
}

async function checkLicenseStatus() {
    const licenseStatus = document.getElementById('licenseStatus');
    const licenseActions = document.getElementById('licenseActions');
    const licenseInfo = document.getElementById('licenseInfo');
    
    try {
        // Check if identity exists first
        const hasIdentity = await window.electronAPI.identityHasIdentity();
        if (!hasIdentity) {
            licenseStatus.innerHTML = '<p class="error">Please register your Omega OS identity first.</p>';
            licenseActions.style.display = 'none';
            licenseInfo.style.display = 'none';
            return;
        }
        
        // Get license status
        const result = await window.electronAPI.identityCheckLicense();
        const pricing = await window.electronAPI.identityGetLicensePricing();
        const details = await window.electronAPI.identityGetLicenseDetails();
        
        // Update pricing display
        if (pricing) {
            const stakingPrice = parseFloat(pricing.stakingAmount) / 1e18;
            const purchasePrice = parseFloat(pricing.purchaseAmount) / 1e18;
            document.getElementById('stakingPrice').textContent = `${stakingPrice.toLocaleString()} OMEGA`;
            document.getElementById('purchasePrice').textContent = `${purchasePrice.toLocaleString()} OMEGA`;
        }
        
        if (result.hasLicense) {
            // User has an active license
            licenseStatus.innerHTML = `
                <p class="success">✓ License Active</p>
                <p class="license-type">Type: ${result.licenseType}</p>
            `;
            licenseActions.style.display = 'none';
            
            // Show license details
            if (details) {
                let expiryText = 'Never (Lifetime)';
                if (details.expiryTime) {
                    const expiryDate = new Date(details.expiryTime);
                    const now = new Date();
                    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    expiryText = `${expiryDate.toLocaleDateString()} (${daysLeft} days remaining)`;
                }
                
                licenseInfo.innerHTML = `
                    <div class="license-details">
                        <h4>License Details</h4>
                        <p><strong>Type:</strong> ${details.licenseType}</p>
                        <p><strong>Started:</strong> ${new Date(details.startTime).toLocaleDateString()}</p>
                        <p><strong>Expires:</strong> ${expiryText}</p>
                        ${details.licenseType === 'Staked' ? `
                            <p><strong>Staked Amount:</strong> ${(parseFloat(details.stakedAmount) / 1e18).toLocaleString()} OMEGA</p>
                            <button id="withdrawStakeBtn" class="identity-btn secondary" style="margin-top: 10px;">
                                Withdraw Stake (After Expiry)
                            </button>
                        ` : ''}
                    </div>
                `;
                licenseInfo.style.display = 'block';
                
                // Add withdraw button listener if present
                const withdrawBtn = document.getElementById('withdrawStakeBtn');
                if (withdrawBtn) {
                    withdrawBtn.addEventListener('click', async () => {
                        await withdrawStake();
                    });
                }
            }
        } else {
            // No active license
            licenseStatus.innerHTML = `
                <p class="error">✗ Not Licensed</p>
                <p>Choose an option below to unlock Omega OS Pro</p>
            `;
            licenseActions.style.display = 'block';
            licenseInfo.style.display = 'none';
        }
    } catch (error) {
        licenseStatus.innerHTML = `<p class="error">Error checking license: ${error.message}</p>`;
        licenseActions.style.display = 'none';
        licenseInfo.style.display = 'none';
    }
}

async function stakeForLicense() {
    const stakeBtn = document.getElementById('stakeLicenseBtn');
    
    try {
        // Get pricing
        const pricing = await window.electronAPI.identityGetLicensePricing();
        const stakingAmount = parseFloat(pricing.stakingAmount) / 1e18;
        
        // Show confirmation
        const confirmMessage = `Stake ${stakingAmount.toLocaleString()} OMEGA tokens for a 30-day license?\n\n` +
            `Your tokens will be locked for 30 days. After the license expires, you can withdraw your staked tokens.\n\n` +
            `Make sure your wallet is unlocked and has enough Omega tokens.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        stakeBtn.disabled = true;
        stakeBtn.textContent = 'Staking...';
        
        const result = await window.electronAPI.identityStakeForLicense();
        
        if (result.success) {
            alert(`License staked successfully!\n\nTransaction: ${result.txHash}\n\nYour license is active for 30 days.`);
            await checkLicenseStatus(); // Refresh status
        } else {
            alert('Failed to stake for license: ' + (result.error || 'Unknown error'));
            stakeBtn.disabled = false;
            stakeBtn.textContent = 'Stake for License';
        }
    } catch (error) {
        alert('Error staking for license: ' + error.message);
        stakeBtn.disabled = false;
        stakeBtn.textContent = 'Stake for License';
    }
}

async function purchaseLifetimeLicense() {
    const purchaseBtn = document.getElementById('purchaseLicenseBtn');
    
    try {
        // Get pricing
        const pricing = await window.electronAPI.identityGetLicensePricing();
        const purchaseAmount = parseFloat(pricing.purchaseAmount) / 1e18;
        
        // Show confirmation
        const confirmMessage = `Purchase lifetime license for ${purchaseAmount.toLocaleString()} OMEGA tokens?\n\n` +
            `This is a one-time payment. You'll have access to Omega OS Pro forever.\n\n` +
            `Make sure your wallet is unlocked and has enough Omega tokens.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        purchaseBtn.disabled = true;
        purchaseBtn.textContent = 'Processing...';
        
        const result = await window.electronAPI.identityPurchaseLicense();
        
        if (result.success) {
            alert(`Lifetime license purchased successfully!\n\nTransaction: ${result.txHash}\n\nYou now have lifetime access to Omega OS Pro!`);
            await checkLicenseStatus(); // Refresh status
        } else {
            alert('Failed to purchase license: ' + (result.error || 'Unknown error'));
            purchaseBtn.disabled = false;
            purchaseBtn.textContent = 'Purchase License';
        }
    } catch (error) {
        alert('Error purchasing license: ' + error.message);
        purchaseBtn.disabled = false;
        purchaseBtn.textContent = 'Purchase License';
    }
}

async function withdrawStake() {
    const withdrawBtn = document.getElementById('withdrawStakeBtn');
    
    try {
        if (!confirm('Withdraw your staked tokens?\n\nThis will deactivate your license if it\'s still active. Make sure your license has expired first.')) {
            return;
        }
        
        if (withdrawBtn) {
            withdrawBtn.disabled = true;
            withdrawBtn.textContent = 'Withdrawing...';
        }
        
        const result = await window.electronAPI.identityWithdrawStake();
        
        if (result.success) {
            alert(`Stake withdrawn successfully!\n\nTransaction: ${result.txHash}\n\nYour tokens have been returned to your wallet.`);
            await checkLicenseStatus(); // Refresh status
        } else {
            alert('Failed to withdraw stake: ' + (result.error || 'Unknown error'));
            if (withdrawBtn) {
                withdrawBtn.disabled = false;
                withdrawBtn.textContent = 'Withdraw Stake (After Expiry)';
            }
        }
    } catch (error) {
        alert('Error withdrawing stake: ' + error.message);
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Withdraw Stake (After Expiry)';
        }
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


