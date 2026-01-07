// Omega Wallet 2 - Clean Implementation
let currentWindowId = null;
let hotWalletMode = true; // Hot wallet by default

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.getWindowId().then(id => {
            currentWindowId = id;
        });
    }

    setupWindowControls();
    checkWalletState();
    setupEventHandlers();
});

function setupWindowControls() {
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMinimize(currentWindowId);
        }
    });

    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMaximize(currentWindowId);
        }
    });

    document.getElementById('closeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowClose(currentWindowId);
        }
    });
}

async function checkWalletState() {
    try {
        const hasWallet = await window.electronAPI.walletHasWallet();
        const isLoaded = await window.electronAPI.walletIsLoaded();
        
        console.log('Wallet state check:', { hasWallet, isLoaded });
        
        if (!hasWallet) {
            alert('No wallet found. Please use the original Omega Wallet to create or import a wallet first.');
            return;
        }
        
        if (!isLoaded) {
            showWalletLogin();
        } else {
            await loadWalletDashboard();
        }
    } catch (error) {
        console.error('Error checking wallet state:', error);
        showWalletLogin();
    }
}

function showWalletLogin() {
    document.getElementById('walletLogin').style.display = 'block';
    document.getElementById('walletDashboard').style.display = 'none';
}

async function loadWalletDashboard() {
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'block';
    
    // Initialize hot wallet mode
    const toggle = document.getElementById('hotWalletToggle');
    if (toggle) {
        toggle.checked = hotWalletMode;
        updateToggleUI(hotWalletMode);
    }
    
    // Default to Omega network
    const networkSelect = document.getElementById('walletNetworkSelect');
    if (networkSelect) {
        networkSelect.value = 'omega';
    }
    
    await updateWalletDisplay();
}

function setupEventHandlers() {
    // Login
    document.getElementById('loginWalletBtn')?.addEventListener('click', async () => {
        const password = document.getElementById('loginPassword').value;
        
        if (!password) {
            alert('Please enter password');
            return;
        }
        
        try {
            await window.electronAPI.walletLoad(password);
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                throw new Error('Wallet failed to load');
            }
            
            document.getElementById('loginPassword').value = '';
            await loadWalletDashboard();
        } catch (error) {
            console.error('Wallet load error:', error);
            alert('Failed to unlock wallet: ' + error.message);
        }
    });
    
    // Settings Button
    document.getElementById('walletSettingsBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Sync toggle state
            const toggle = document.getElementById('hotWalletToggle');
            if (toggle) {
                toggle.checked = hotWalletMode;
                updateToggleUI(hotWalletMode);
            }
            modal.style.display = 'flex';
        }
    });
    
    // Close Settings Modal
    document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
    });
    
    // Export Private Key Button - SIMPLE AND DIRECT
    const exportBtn = document.getElementById('exportPrivateKeyBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Export button clicked');
            
            const password = prompt('Enter your wallet password to export private key:');
            if (!password) {
                console.log('Password prompt cancelled');
                return;
            }
            
            try {
                console.log('Checking wallet state...');
                const isLoaded = await window.electronAPI.walletIsLoaded();
                
                if (!isLoaded) {
                    console.log('Wallet not loaded, loading...');
                    await window.electronAPI.walletLoad(password);
                }
                
                console.log('Exporting private key...');
                const result = await window.electronAPI.walletExportPrivateKey(password);
                console.log('Export successful:', !!result);
                
                if (result) {
                    if (confirm('⚠️ WARNING: Private keys will be shown. Make sure no one can see your screen. Continue?')) {
                        let message = 'Your Private Keys:\n\n';
                        if (result.solanaPrivateKeyBase58) {
                            message += `Solana (Base58):\n${result.solanaPrivateKeyBase58}\n\n`;
                        }
                        if (result.solanaPrivateKey) {
                            message += `Solana (Base64):\n${result.solanaPrivateKey}\n\n`;
                        }
                        if (result.evmPrivateKey) {
                            message += `Ethereum Private Key:\n${result.evmPrivateKey}\n\n`;
                        }
                        message += '⚠️ Save these securely! Never share them with anyone.';
                        alert(message);
                    }
                } else {
                    alert('Failed to export private key. Make sure password is correct.');
                }
            } catch (error) {
                console.error('Export private key error:', error);
                alert('Failed to export private key: ' + error.message);
            }
        });
        console.log('Export button handler attached');
    } else {
        console.error('Export button not found!');
    }
    
    // Hot Wallet Toggle - SIMPLE AND DIRECT
    const toggle = document.getElementById('hotWalletToggle');
    if (toggle) {
        toggle.addEventListener('change', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle changed, new state:', toggle.checked);
            
            const newState = toggle.checked;
            const newMode = newState ? 'Hot Wallet Mode' : 'Cold Storage Mode';
            
            // Revert until password verified
            toggle.checked = !newState;
            
            const password = prompt(`Enter your wallet password to enable ${newMode}:`);
            if (!password) {
                console.log('Password prompt cancelled');
                return;
            }
            
            try {
                console.log('Verifying password...');
                await window.electronAPI.walletExportPrivateKey(password);
                console.log('Password verified');
                
                // Password verified - apply the change
                toggle.checked = newState;
                hotWalletMode = newState;
                
                // Enable/disable network access
                if (window.electronAPI && window.electronAPI.walletToggleNetwork) {
                    console.log('Toggling network:', hotWalletMode);
                    await window.electronAPI.walletToggleNetwork(hotWalletMode);
                }
                
                // Update UI
                updateToggleUI(hotWalletMode);
                await updateWalletDisplay();
                
                console.log('Toggle complete, mode:', hotWalletMode);
            } catch (error) {
                console.error('Password verification failed:', error);
                alert('Invalid password. Please try again.');
            }
        });
        console.log('Toggle handler attached');
    } else {
        console.error('Toggle not found!');
    }
    
    // Close modal on background click
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
    
    // Network selector
    document.getElementById('walletNetworkSelect')?.addEventListener('change', async () => {
        await updateWalletDisplay();
    });
}

function updateToggleUI(isHotMode) {
    const modeDescription = document.getElementById('modeDescription');
    const hotModeWarning = document.getElementById('hotModeWarning');
    
    if (modeDescription) {
        modeDescription.textContent = isHotMode ? 'Hot Wallet Mode' : 'Cold Storage Mode';
    }
    
    if (hotModeWarning) {
        hotModeWarning.style.display = isHotMode ? 'block' : 'none';
    }
}

async function updateWalletDisplay() {
    const networkSelect = document.getElementById('walletNetworkSelect');
    const network = networkSelect ? networkSelect.value : 'omega';
    const address = document.getElementById('walletAddress');
    const balance = document.getElementById('walletBalance');
    
    const isLoaded = await window.electronAPI.walletIsLoaded();
    if (!isLoaded) {
        if (address) address.textContent = 'Wallet not loaded';
        if (balance) balance.textContent = '--';
        return;
    }
    
    try {
        if (network === 'solana') {
            const publicKey = await window.electronAPI.walletGetPublicKey();
            if (address) {
                address.textContent = publicKey ? 
                    publicKey.substring(0, 8) + '...' + publicKey.substring(publicKey.length - 8) : 
                    'No Solana wallet';
            }
            if (hotWalletMode && publicKey) {
                const bal = await window.electronAPI.walletGetBalance();
                if (balance) balance.textContent = bal.toFixed(4) + ' SOL';
            } else if (balance) {
                balance.textContent = '--';
            }
        } else {
            const evmAddress = await window.electronAPI.walletGetEvmAddress();
            if (address) {
                address.textContent = evmAddress ? 
                    evmAddress.substring(0, 8) + '...' + evmAddress.substring(evmAddress.length - 8) : 
                    'No EVM wallet';
            }
            if (hotWalletMode && evmAddress) {
                let chainId = 1;
                if (network === 'omega') chainId = 1313161768;
                else if (network === 'bsc') chainId = 56;
                
                const bal = await window.electronAPI.walletGetEvmBalance(chainId);
                if (balance) {
                    const symbol = network === 'omega' ? 'OMEGA' : network === 'bsc' ? 'BNB' : 'ETH';
                    balance.textContent = parseFloat(bal).toFixed(4) + ' ' + symbol;
                }
            } else if (balance) {
                balance.textContent = '--';
            }
        }
    } catch (error) {
        console.error('Error updating wallet display:', error);
        if (address) address.textContent = 'Error loading wallet';
        if (balance) balance.textContent = 'Error';
    }
}

