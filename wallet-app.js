// Omega Wallet Standalone App
let currentWindowId = null;
let hotWalletMode = true; // Hot wallet by default

// Helper function to copy text to clipboard
async function copyToClipboard(text, label = 'Text') {
    try {
        // Try Electron clipboard API first (most reliable)
        if (window.electronAPI && window.electronAPI.clipboardWriteText) {
            const result = await window.electronAPI.clipboardWriteText(text);
            if (result.success) {
                return true;
            }
        }
        
        // Fallback: Try modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback: Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
            return true;
        }
        
        throw new Error('All copy methods failed');
    } catch (error) {
        console.error(`[WALLET] Failed to copy ${label}:`, error);
        return false;
    }
}

// Create a key display element with copy button
function createKeyDisplay(label, key, id) {
    const div = document.createElement('div');
    div.style.marginBottom = '20px';
    div.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">${label}</div>
        <div style="
            display: flex;
            gap: 8px;
            align-items: flex-start;
        ">
            <textarea 
                id="key-${id}" 
                readonly 
                style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.9);
                    resize: vertical;
                    min-height: 60px;
                    word-break: break-all;
                "
            >${key}</textarea>
            <button 
                class="copy-key-btn" 
                data-key="${id}"
                style="
                    padding: 8px 16px;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    color: rgba(59, 130, 246, 1);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                "
            >Copy</button>
        </div>
    `;
    
    // Add copy button handler
    const copyBtn = div.querySelector('.copy-key-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const textarea = div.querySelector(`#key-${id}`);
            if (textarea) {
                const success = await copyToClipboard(textarea.value, label);
                if (success) {
                    // Visual feedback
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    copyBtn.style.background = 'rgba(34, 197, 94, 0.2)';
                    copyBtn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                    copyBtn.style.color = 'rgba(34, 197, 94, 1)';
                    
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = 'rgba(59, 130, 246, 0.2)';
                        copyBtn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                        copyBtn.style.color = 'rgba(59, 130, 246, 1)';
                    }, 2000);
                } else {
                    alert('Failed to copy to clipboard');
                }
            }
        });
    }
    
    return div;
}

// Show export keys modal with copy buttons
function showExportKeysModal(keys) {
    const modal = document.getElementById('exportKeysModal');
    const content = document.getElementById('exportKeysContent');
    
    if (!modal || !content) {
        console.error('[WALLET] Export keys modal elements not found');
        alert('Error: Could not display private keys modal');
        return;
    }
    
    // Clear previous content
    content.innerHTML = '';
    
    // Add each key with copy button
    if (keys.solanaPrivateKeyBase58) {
        const keyDiv = createKeyDisplay('Solana (Base58)', keys.solanaPrivateKeyBase58, 'solana-base58');
        content.appendChild(keyDiv);
    }
    
    if (keys.solanaPrivateKey) {
        const keyDiv = createKeyDisplay('Solana (Base64)', keys.solanaPrivateKey, 'solana-base64');
        content.appendChild(keyDiv);
    }
    
    if (keys.evmPrivateKey) {
        const keyDiv = createKeyDisplay('EVM Private Key', keys.evmPrivateKey, 'evm');
        content.appendChild(keyDiv);
    }
    
    // Setup close handlers
    const closeBtn = document.getElementById('closeExportKeysBtn');
    const closeXBtn = document.getElementById('closeExportKeysModal');
    
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    if (closeXBtn) {
        closeXBtn.onclick = closeModal;
    }
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Show modal
    modal.style.display = 'flex';
}

// Text input prompt modal helper - for non-password text inputs (reuses password modal)
let textInputPromptHandlers = {
    submit: null,
    cancel: null,
    keypress: null
};

function showTextInputPrompt(title, message, defaultValue = '') {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('passwordPromptModal');
        const input = document.getElementById('passwordPromptInput');
        const titleEl = document.getElementById('passwordPromptTitle');
        const messageEl = document.getElementById('passwordPromptMessage');
        const submitBtn = document.getElementById('passwordPromptSubmit');
        const cancelBtn = document.getElementById('passwordPromptCancel');
        
        if (!modal || !input || !titleEl || !messageEl || !submitBtn || !cancelBtn) {
            console.error('[WALLET] Text input prompt modal elements not found');
            reject(new Error('Text input prompt modal not available'));
            return;
        }
        
        // Remove any existing listeners first
        if (textInputPromptHandlers.submit) {
            submitBtn.removeEventListener('click', textInputPromptHandlers.submit);
        }
        if (textInputPromptHandlers.cancel) {
            cancelBtn.removeEventListener('click', textInputPromptHandlers.cancel);
        }
        if (textInputPromptHandlers.keypress) {
            input.removeEventListener('keypress', textInputPromptHandlers.keypress);
        }
        
        // Reset modal state - change input type to text for non-password inputs
        titleEl.textContent = title;
        messageEl.textContent = message;
        input.type = 'text'; // Not password
        input.value = defaultValue;
        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';
        input.style.opacity = '1';
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus input after a short delay
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
        
        const cleanup = () => {
            modal.style.display = 'none';
            input.value = '';
            input.type = 'password'; // Reset to password for next use
            
            // Remove listeners
            if (textInputPromptHandlers.submit) {
                submitBtn.removeEventListener('click', textInputPromptHandlers.submit);
            }
            if (textInputPromptHandlers.cancel) {
                cancelBtn.removeEventListener('click', textInputPromptHandlers.cancel);
            }
            if (textInputPromptHandlers.keypress) {
                input.removeEventListener('keypress', textInputPromptHandlers.keypress);
            }
            
            // Clear handlers
            textInputPromptHandlers.submit = null;
            textInputPromptHandlers.cancel = null;
            textInputPromptHandlers.keypress = null;
        };
        
        const submitHandler = () => {
            const value = input.value.trim();
            cleanup();
            if (value) {
                resolve(value);
            } else {
                reject(new Error('No value provided'));
            }
        };
        
        const cancelHandler = () => {
            cleanup();
            reject(new Error('User cancelled'));
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitHandler();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelHandler();
            }
        };
        
        // Store handlers and add listeners
        textInputPromptHandlers.submit = submitHandler;
        textInputPromptHandlers.cancel = cancelHandler;
        textInputPromptHandlers.keypress = keyHandler;
        
        submitBtn.addEventListener('click', submitHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        input.addEventListener('keypress', keyHandler);
        
    });
}

// Store password prompt handlers to prevent duplicates
let passwordPromptHandlers = {
    submit: null,
    cancel: null,
    keypress: null
};

// Password prompt modal helper - replaces browser prompt() which doesn't work in Electron
function showPasswordPrompt(title, message) {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('passwordPromptModal');
        const input = document.getElementById('passwordPromptInput');
        const titleEl = document.getElementById('passwordPromptTitle');
        const messageEl = document.getElementById('passwordPromptMessage');
        const submitBtn = document.getElementById('passwordPromptSubmit');
        const cancelBtn = document.getElementById('passwordPromptCancel');
        
        if (!modal || !input || !titleEl || !messageEl || !submitBtn || !cancelBtn) {
            console.error('[WALLET] Password prompt modal elements not found');
            reject(new Error('Password prompt modal not available'));
            return;
        }
        
        // Remove any existing listeners first
        if (passwordPromptHandlers.submit) {
            submitBtn.removeEventListener('click', passwordPromptHandlers.submit);
        }
        if (passwordPromptHandlers.cancel) {
            cancelBtn.removeEventListener('click', passwordPromptHandlers.cancel);
        }
        if (passwordPromptHandlers.keypress) {
            input.removeEventListener('keypress', passwordPromptHandlers.keypress);
        }
        
        // Reset modal state
        titleEl.textContent = title;
        messageEl.textContent = message;
        input.value = '';
        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';
        input.style.opacity = '1';
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus input after a short delay to ensure modal is visible
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
        
        const cleanup = () => {
            modal.style.display = 'none';
            input.value = '';
            
            // Remove listeners
            if (passwordPromptHandlers.submit) {
                submitBtn.removeEventListener('click', passwordPromptHandlers.submit);
            }
            if (passwordPromptHandlers.cancel) {
                cancelBtn.removeEventListener('click', passwordPromptHandlers.cancel);
            }
            if (passwordPromptHandlers.keypress) {
                input.removeEventListener('keypress', passwordPromptHandlers.keypress);
            }
            
            // Clear handlers
            passwordPromptHandlers.submit = null;
            passwordPromptHandlers.cancel = null;
            passwordPromptHandlers.keypress = null;
        };
        
        const submitHandler = () => {
            const password = input.value.trim();
            cleanup();
            if (password) {
                resolve(password);
            } else {
                reject(new Error('No password provided'));
            }
        };
        
        const cancelHandler = () => {
            cleanup();
            reject(new Error('User cancelled'));
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitHandler();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelHandler();
            }
        };
        
        // Store handlers and add listeners
        passwordPromptHandlers.submit = submitHandler;
        passwordPromptHandlers.cancel = cancelHandler;
        passwordPromptHandlers.keypress = keyHandler;
        
        submitBtn.addEventListener('click', submitHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        input.addEventListener('keypress', keyHandler);
        
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.getWindowId().then(id => {
            currentWindowId = id;
        });
    }

    // Window controls
    setupWindowControls();
    
    // Initialize wallet
    checkWalletState();
    
    // Setup wallet buttons
    setupWalletButtons();
    
    // Setup modals and new UI elements (this will also setup toggle when modal opens)
    setupWalletModals();
    setupAssetsList();
    setupWalletTabs();
    
    // Listen for identity registration configuration
    if (window.electronAPI && window.electronAPI.onWalletConfigureForIdentity) {
        window.electronAPI.onWalletConfigureForIdentity(() => {
            configureWalletForIdentity();
        });
    }
    
    // Listen for app interaction notifications
    if (window.electronAPI && window.electronAPI.onWalletAppInteraction) {
        window.electronAPI.onWalletAppInteraction((data) => {
            if (data.type === 'app_interaction' && typeof addActivity === 'function') {
                addActivity({
                    type: 'app_interaction',
                    network: data.data.network || 'unknown',
                    action: data.data.action || 'App Interaction',
                    source: data.data.source || 'External App',
                    hash: data.data.hash || null,
                    to: data.data.to || null,
                    amount: data.data.amount || null,
                    symbol: data.data.symbol || '',
                    timestamp: Date.now()
                });
            }
        });
    }
});

// Configure wallet for identity registration (Omega Network + Hot Wallet Mode)
async function configureWalletForIdentity() {
    
    // Wait for wallet to be loaded
    const isLoaded = await window.electronAPI.walletIsLoaded();
    if (!isLoaded) {
        // Store flag to configure after login
        window.configureForIdentityAfterLoad = true;
        return;
    }
    
    // Set network to Omega
    const networkSelect = document.getElementById('walletNetworkSelect');
    if (networkSelect) {
        networkSelect.value = 'omega';
    }
    
    // Enable hot wallet mode (turn off cold storage)
    const hotWalletToggle = document.getElementById('hotWalletToggle');
    if (hotWalletToggle && !hotWalletToggle.checked) {
        hotWalletToggle.checked = true;
        hotWalletToggle.dispatchEvent(new Event('change'));
    }
    
    // Update display
    await updateWalletDisplay();
}

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

function setupWalletButtons() {
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
            const result = await window.electronAPI.walletLoad(password);
            
            // Verify wallet is actually loaded
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                throw new Error('Wallet failed to load after password entry');
            }
            
            document.getElementById('loginPassword').value = '';
            await loadWalletDashboard();
            
            // Configure for identity registration if needed
            if (window.configureForIdentityAfterLoad) {
                setTimeout(() => {
                    configureWalletForIdentity();
                    window.configureForIdentityAfterLoad = false;
                }, 500);
            }
        } catch (error) {
            console.error('Wallet load error:', error);
            alert('Failed to unlock wallet: ' + error.message);
        }
    });
    
    // Wallet selector change handler
    document.getElementById('walletSelector')?.addEventListener('change', async (e) => {
        const walletId = e.target.value;
        if (!walletId) return;
        
        const network = document.getElementById('walletNetworkSelect').value;
        const password = prompt('Enter your wallet password to switch wallets:');
        if (!password) {
            // Reset selector if password cancelled
            await updateWalletSelector();
            return;
        }
        
        try {
            // walletSetCurrentWallet already loads the wallet via loadWalletById
            // No need to call walletLoadByNetwork again - it would reload and might load wrong wallet
            await window.electronAPI.walletSetCurrentWallet(network, walletId, password);
            
            // Verify wallet is loaded
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                throw new Error('Wallet failed to load after switch');
            }
            
            // Update display to show new wallet
            await updateWalletDisplay();
        } catch (error) {
            console.error('Wallet switch error:', error);
            alert('Failed to switch wallet: ' + error.message);
            // Reset selector to current wallet
            await updateWalletSelector();
        }
    });
    
    // Network selector change handler
    const networkSelect = document.getElementById('walletNetworkSelect');
    if (networkSelect) {
        // Store previous network value before change
        let previousNetwork = networkSelect.value;
        
        networkSelect.addEventListener('change', async () => {
            // Wait a moment to ensure the value is fully set in the DOM
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Re-read the network value to ensure it's actually set
            const network = networkSelect.value;
            const isLoaded = await window.electronAPI.walletIsLoaded();
            
            // If wallet is loaded, reload it for the new network using the current wallet ID
            if (isLoaded) {
                let password;
                try {
                    password = await showPasswordPrompt(
                        'Switch Network',
                        'Enter your wallet password to switch networks:'
                    );
                } catch (error) {
                    // Reset selector if password cancelled
                    await updateWalletSelector();
                    return;
                }
                
                if (password) {
                    try {
                        // Get the currently loaded wallet ID from any network
                        let currentWalletId = await window.electronAPI.walletGetCurrentWalletId('omega') || 
                                             await window.electronAPI.walletGetCurrentWalletId('solana') ||
                                             await window.electronAPI.walletGetCurrentWalletId('evm') ||
                                             await window.electronAPI.walletGetCurrentWalletId('bsc') ||
                                             'primary';
                        
                        
                        // Load the current wallet for the new network - this will load the appropriate keys
                        const loadResult = await window.electronAPI.walletSetCurrentWallet(network, currentWalletId, password);
                        
                        // Verify wallet is actually loaded with the right keys
                        const isLoaded = await window.electronAPI.walletIsLoaded();
                        if (!isLoaded) {
                            throw new Error('Wallet failed to load after network switch');
                        }
                        
                        // For Solana, verify keypair is loaded
                        if (network === 'solana') {
                            const publicKey = await window.electronAPI.walletGetPublicKey();
                            if (!publicKey) {
                                console.warn('Warning: Solana network selected but no public key loaded');
                            }
                        }
                        
                        // For EVM networks, verify EVM wallet is loaded
                        if (network === 'omega' || network === 'evm' || network === 'bsc') {
                            const evmAddress = await window.electronAPI.walletGetEvmAddress();
                            if (!evmAddress) {
                                console.warn('Warning: EVM network selected but no EVM address loaded');
                            }
                        }
                        
                        // Small delay to ensure wallet state is fully updated
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Clear balance first to show we're switching networks
                        const balanceAmount = document.getElementById('walletBalance');
                        if (balanceAmount) {
                            balanceAmount.textContent = 'Loading...';
                        }
                        
                        // Force update display - this will show the correct address for the network
                        // Automatically refresh balance when switching networks
                        await updateWalletSelector();
                        await updateWalletDisplay(false); // Don't skip balance refresh - refresh automatically
                        
                        
                        // Automatically trigger refresh button click to refresh balance
                        // This ensures we use the exact same code path as manual refresh
                        if (hotWalletMode) {
                            // Wait longer to ensure network selector value is fully committed and UI is updated
                            await new Promise(resolve => setTimeout(resolve, 400));
                            
                            // Verify network value is set before triggering refresh
                            const verifyNetwork = networkSelect.value;
                            if (verifyNetwork !== network) {
                                console.warn('Network mismatch! Selector shows:', verifyNetwork, 'but expected:', network);
                            }
                            
                            // Force refresh - SIMPLIFY: just click the refresh button
                            setTimeout(() => {
                                const refreshBtn = document.getElementById('refreshBalanceBtn');
                                if (refreshBtn && refreshBtn.style.display !== 'none') {
                                    refreshBtn.click();
                                } else {
                                    // Fallback: direct call if button not available
                                    const currentNetwork = networkSelect.value;
                                    if (typeof refreshWalletBalance === 'function') {
                                        refreshWalletBalance(currentNetwork).catch(err => console.error('Refresh failed:', err));
                                    }
                                }
                            }, 800);
                        }
                        
                        // Update previous network for next change
                        previousNetwork = network;
                    } catch (error) {
                        console.error('Network switch error:', error);
                        alert('Failed to load wallet for network: ' + error.message);
                        // Revert network selection on error
                        networkSelect.value = previousNetwork;
                        await updateWalletSelector();
                    }
                } else {
                    // Reset network if password cancelled - revert to previous network
                    networkSelect.value = previousNetwork;
                    await updateWalletSelector();
                }
            } else {
                // Wallet not loaded - just update display
                previousNetwork = network;
                await updateWalletSelector();
        await updateWalletDisplay();
            }
    });
    }
    
    // Refresh balance (only in hot mode)
    document.getElementById('refreshBalanceBtn')?.addEventListener('click', async () => {
        if (hotWalletMode) {
            // Get current network and refresh balance directly
            // Add small delay to ensure network selector value is fully set
            await new Promise(resolve => setTimeout(resolve, 50));
            const networkSelect = document.getElementById('walletNetworkSelect');
            const network = networkSelect ? networkSelect.value : 'omega';
            const balanceAmount = document.getElementById('walletBalance');
            if (balanceAmount) {
                balanceAmount.textContent = 'Loading...';
            }
            // Refresh balance with current network
            await refreshWalletBalance(network);
        }
    });
    
    // Add Token Button - use a global click handler that checks for the button
    // Store handler to prevent duplicates
    let addTokenClickHandler = null;
    
    if (!document.addTokenHandlerAttached) {
        addTokenClickHandler = async function(e) {
            // Check if the clicked element or its parent has id="addTokenBtn"
            const clickedBtn = e.target.closest('#addTokenBtn');
            if (clickedBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                let tokenAddress, tokenSymbol, tokenName;
                
                try {
                    tokenAddress = await showTextInputPrompt(
                        'Add Token',
                        'Enter token contract address:'
                    );
                } catch (error) {
                    return;
                }
                
                if (tokenAddress && tokenAddress.trim()) {
                    try {
                        tokenSymbol = await showTextInputPrompt(
                            'Add Token',
                            'Enter token symbol (e.g., USDT):'
                        );
                    } catch (error) {
                        return;
                    }
                    
                    if (tokenSymbol && tokenSymbol.trim()) {
                        try {
                            tokenName = await showTextInputPrompt(
                                'Add Token',
                                'Enter token name (e.g., Tether USD):'
                            );
                        } catch (error) {
                            return;
                        }
                        
                        if (tokenName && tokenName.trim()) {
                            // Store custom token
                            const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]');
                            const network = document.getElementById('walletNetworkSelect')?.value || 'omega';
                            customTokens.push({
                                address: tokenAddress.trim(),
                                symbol: tokenSymbol.trim(),
                                name: tokenName.trim(),
                                network: network
                            });
                            localStorage.setItem('customTokens', JSON.stringify(customTokens));
                            alert('Token added! It will appear in your tokens list.');
                            // Refresh assets list
                            const currentNetwork = document.getElementById('walletNetworkSelect')?.value || 'omega';
                            const balance = parseFloat(document.getElementById('walletBalance')?.textContent?.replace(/[^\d.]/g, '') || '0');
                            if (typeof updateAssetsList === 'function') {
                                updateAssetsList(currentNetwork, balance);
                            }
                        }
                    }
                }
            }
        };
        
        document.addEventListener('click', addTokenClickHandler);
        document.addTokenHandlerAttached = true;
    }
    
    // Copy wallet address (from balance display)
    document.getElementById('copyWalletAddressBtn')?.addEventListener('click', async () => {
        const network = document.getElementById('walletNetworkSelect').value;
        let address = null;
        let networkName = '';
        
        if (network === 'solana') {
            address = await window.electronAPI.walletGetPublicKey();
            networkName = 'Solana';
        } else if (network === 'omega' || network === 'evm' || network === 'bsc') {
            address = await window.electronAPI.walletGetEvmAddress();
            networkName = network === 'omega' ? 'Omega Network' : network === 'bsc' ? 'BSC' : 'Ethereum';
        }
        
        if (!address) {
            alert('No address available to copy');
            return;
        }
        
        try {
            // Try Electron clipboard API first (most reliable)
            if (window.electronAPI && window.electronAPI.clipboardWriteText) {
                const result = await window.electronAPI.clipboardWriteText(address);
                if (result.success) {
                    // Show visual feedback
                    const btn = document.getElementById('copyWalletAddressBtn');
                    const originalBg = btn.style.background;
                    btn.style.background = 'rgba(34, 197, 94, 0.3)';
                    setTimeout(() => {
                        btn.style.background = originalBg;
                    }, 500);
                    return;
                }
            }
            
            // Fallback: Try modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(address);
                const btn = document.getElementById('copyWalletAddressBtn');
                const originalBg = btn.style.background;
                btn.style.background = 'rgba(34, 197, 94, 0.3)';
                setTimeout(() => {
                    btn.style.background = originalBg;
                }, 500);
                return;
            }
            
            // Fallback: Create a temporary textarea element and copy from it
            const textarea = document.createElement('textarea');
            textarea.value = address;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (successful) {
                    const btn = document.getElementById('copyWalletAddressBtn');
                    const originalBg = btn.style.background;
                    btn.style.background = 'rgba(34, 197, 94, 0.3)';
                    setTimeout(() => {
                        btn.style.background = originalBg;
                    }, 500);
                } else {
                    throw new Error('execCommand copy failed');
                }
            } catch (e) {
                document.body.removeChild(textarea);
                throw e;
            }
        } catch (error) {
            console.error('Clipboard copy error:', error);
            alert('Failed to copy address: ' + (error.message || 'Unknown error'));
        }
    });
    
    // Send transaction (only in hot mode) - moved to modal handler
    document.getElementById('sendChain')?.addEventListener('change', (e) => {
        const chain = e.target.value;
        const addressInput = document.getElementById('sendToAddress');
        const amountUnit = document.getElementById('sendAmountUnit');
        
        if (chain === 'solana') {
            addressInput.placeholder = 'Enter Solana address';
            amountUnit.textContent = 'SOL';
        } else if (chain === 'omega') {
            addressInput.placeholder = 'Enter Omega Network address';
            amountUnit.textContent = 'OMEGA';
        } else if (chain === 'bsc') {
            addressInput.placeholder = 'Enter BSC address';
            amountUnit.textContent = 'BNB';
        } else {
            addressInput.placeholder = 'Enter Ethereum address';
            amountUnit.textContent = 'ETH';
        }
    });
    
    document.getElementById('sendTransactionBtn')?.addEventListener('click', async () => {
        if (!hotWalletMode) {
            alert('Please enable Hot Wallet Mode to send transactions.');
            return;
        }
        
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
        
        let chainName, chainId;
        if (chain === 'solana') {
            chainName = 'SOL';
        } else if (chain === 'omega') {
            chainName = 'OMEGA';
            chainId = 1313161768;
        } else if (chain === 'bsc') {
            chainName = 'BNB';
            chainId = 56;
        } else {
            chainName = 'ETH';
            chainId = 1;
        }
        
        const shortAddress = toAddress.substring(0, 8) + '...' + toAddress.substring(toAddress.length - 8);
        
        if (confirm(`Send ${amount} ${chainName} to ${shortAddress}?`)) {
            try {
                let txHash, txType;
                if (chain === 'solana') {
                    txHash = await window.electronAPI.walletSendSol(toAddress, amount);
                    txType = 'send';
                    alert(`Transaction sent! Signature: ${txHash}`);
                } else {
                    txHash = await window.electronAPI.walletSendEvmTransaction(toAddress, amount.toString(), '0x', chainId);
                    txType = 'send';
                    alert(`Transaction sent! Hash: ${txHash}`);
                }
                
                // Add to activity
                addActivity({
                    type: txType,
                    network: chain,
                    hash: txHash,
                    to: toAddress,
                    amount: amount,
                    symbol: chainName,
                    timestamp: Date.now()
                });
                
                document.getElementById('sendToAddress').value = '';
                document.getElementById('sendAmount').value = '';
                document.getElementById('sendModal').style.display = 'none';
                await refreshWalletBalance();
            } catch (error) {
                // Improve error message display
                let errorMessage = error.message;
                if (errorMessage.includes('insufficient funds')) {
                    errorMessage = 'Insufficient funds. Make sure you have enough balance to cover the transaction amount and gas fees.';
                } else if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
                    errorMessage = 'Insufficient funds. Make sure you have enough balance to cover the transaction amount and gas fees.';
                }
                alert(`Failed to send ${chainName}: ${errorMessage}`);
            }
        }
    });
    
}

// Wallet Functions
async function checkWalletState() {
    try {
    const hasWallet = await window.electronAPI.walletHasWallet();
    const isLoaded = await window.electronAPI.walletIsLoaded();
        
    
    if (!hasWallet) {
        showWalletSetup();
    } else {
            // Always show login if wallet exists - wallet should never be loaded on startup
            // This ensures password is always required
            showWalletLogin();
        }
    } catch (error) {
        console.error('Error checking wallet state:', error);
        showWalletSetup();
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

// Helper function to update toggle UI
function updateHotWalletToggleUI(toggle, isHotMode) {
    const modeDescription = document.getElementById('modeDescription');
    const hotModeWarning = document.getElementById('hotModeWarning');
    const refreshBtn = document.getElementById('refreshBalanceBtn');
    
    if (isHotMode) {
        // Enable hot wallet mode
        if (modeDescription) modeDescription.textContent = 'Hot Wallet Mode';
        if (hotModeWarning) hotModeWarning.style.display = 'block';
        if (refreshBtn) refreshBtn.style.display = 'flex';
        
        // Update toggle styling
        const toggleSpan = toggle.nextElementSibling;
        if (toggleSpan) {
            toggleSpan.style.backgroundColor = 'rgba(34, 197, 94, 0.5)';
            const innerSpan = toggleSpan.querySelector('span');
            if (innerSpan) innerSpan.style.transform = 'translateX(20px)';
        }
    } else {
        // Disable hot wallet mode (back to cold storage)
        if (modeDescription) modeDescription.textContent = 'Cold Storage Mode';
        if (hotModeWarning) hotModeWarning.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'none';
        
        // Update toggle styling
        const toggleSpan = toggle.nextElementSibling;
        if (toggleSpan) {
            toggleSpan.style.backgroundColor = 'rgba(100, 116, 139, 0.5)';
            const innerSpan = toggleSpan.querySelector('span');
            if (innerSpan) innerSpan.style.transform = 'translateX(0)';
        }
        
        // Clear balance display
        const balanceEl = document.getElementById('walletBalance');
        if (balanceEl) balanceEl.textContent = '--';
        const assetsList = document.getElementById('assetsList');
        if (assetsList) assetsList.innerHTML = '';
    }
}

async function loadWalletDashboard() {
    document.getElementById('walletSetup').style.display = 'none';
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'block';
    
    // Clean up duplicate wallets on first load
    try {
        const cleanupResult = await window.electronAPI.walletCleanupDuplicates();
        if (cleanupResult && cleanupResult.deleted > 0) {
        }
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
    }
    
    // Add token button uses event delegation on tokensTab, so no re-attachment needed
    
    // Default to Omega network (unless configured for identity registration)
    const networkSelect = document.getElementById('walletNetworkSelect');
    if (networkSelect && !window.configureForIdentityAfterLoad) {
        networkSelect.value = 'omega';
    }
    
    // Sync toggle with current hotWalletMode state (don't force it - respect user's choice)
    const hotWalletToggle = document.getElementById('hotWalletToggle');
    if (hotWalletToggle) {
        // Sync checkbox with the actual state variable (don't force it to true)
        hotWalletToggle.checked = hotWalletMode;
        // Update UI to match the state
        updateHotWalletToggleUI(hotWalletToggle, hotWalletMode);
        // Ensure network matches the state
        if (window.electronAPI && window.electronAPI.walletToggleNetwork) {
            await window.electronAPI.walletToggleNetwork(hotWalletMode);
        }
    }
    
    // Ensure wallet selector is updated first
    await updateWalletSelector();
    
    // Check if wallet is actually loaded
    const isLoaded = await window.electronAPI.walletIsLoaded();
    if (!isLoaded) {
        // Wallet not loaded - show login again
        showWalletLogin();
        return;
    }
    
    await updateWalletDisplay();
    
    // Configure for identity registration if needed (after dashboard loads)
    if (window.configureForIdentityAfterLoad) {
        setTimeout(() => {
            configureWalletForIdentity();
            window.configureForIdentityAfterLoad = false;
        }, 300);
    }
}

// Store toggle handlers to prevent duplicates
let hotWalletToggleClickHandler = null;
let hotWalletToggleLabelHandler = null;

// Setup toggle when settings modal opens (not on page load)
function setupHotWalletToggle() {
    const toggle = document.getElementById('hotWalletToggle');
    if (!toggle) {
        console.warn('[WALLET] Toggle not found');
        return;
    }
    
    const label = toggle.closest('label');
    if (!label) {
        console.warn('[WALLET] Toggle label not found');
        return;
    }
    
    
    // Remove existing listeners if they exist
    if (hotWalletToggleClickHandler) {
        toggle.removeEventListener('click', hotWalletToggleClickHandler);
    }
    if (hotWalletToggleLabelHandler && label) {
        label.removeEventListener('click', hotWalletToggleLabelHandler, true);
    }
    
    // Sync with current state
    toggle.checked = hotWalletMode;
    updateHotWalletToggleUI(toggle, hotWalletMode);
    
    // Ensure checkbox is properly positioned and clickable
    // (HTML should already have this, but ensure it's set)
    if (!toggle.style.position || toggle.style.position === 'static') {
        toggle.style.position = 'absolute';
        toggle.style.width = '44px';
        toggle.style.height = '24px';
        toggle.style.opacity = '0';
        toggle.style.cursor = 'pointer';
        toggle.style.zIndex = '2';
        toggle.style.top = '0';
        toggle.style.left = '0';
        toggle.style.margin = '0';
        toggle.style.padding = '0';
    }
    
    // Intercept CLICK (not change) to prevent the checkbox from toggling until password is verified
    hotWalletToggleClickHandler = async function(e) {
        e.preventDefault(); // Prevent default checkbox toggle
        e.stopPropagation();
        
        // Calculate what the new state WOULD be
        // Read from the actual variable, not the checkbox (checkbox might be out of sync)
        const currentState = hotWalletMode;
        const newState = !currentState;
        const newMode = newState ? 'Hot Wallet Mode' : 'Cold Storage Mode';
        
        // Show password prompt BEFORE allowing the toggle
        let password;
        try {
            password = await showPasswordPrompt(
                `Enable ${newMode}`,
                `Enter your wallet password to enable ${newMode}:`
            );
        } catch (error) {
            // User cancelled or no password
            return;
        }
        
        try {
            // Ensure wallet is loaded first
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                await window.electronAPI.walletLoad(password);
            }
            
            // Verify password
            await window.electronAPI.walletExportPrivateKey(password);
            
            // Password verified - NOW allow the toggle to change
            hotWalletMode = newState;
            toggle.checked = newState;
            
            // Toggle network
            if (window.electronAPI && window.electronAPI.walletToggleNetwork) {
                await window.electronAPI.walletToggleNetwork(hotWalletMode);
            }
            
            // Update UI
            updateHotWalletToggleUI(toggle, hotWalletMode);
            await updateWalletDisplay();
        } catch (error) {
            console.error('[WALLET] Password verification failed:', error);
            console.error('[WALLET] Error details:', error.message, error.stack);
            alert('Invalid password. Please try again.');
            // Keep toggle in original state on error
            toggle.checked = currentState;
            updateHotWalletToggleUI(toggle, currentState);
        }
    };
    
    // Attach click handler to checkbox - use capture phase to catch it early
    toggle.addEventListener('click', hotWalletToggleClickHandler, true);
    
    // Also handle clicks on the label to ensure it works
    hotWalletToggleLabelHandler = function(e) {
        // Don't interfere if clicking directly on the checkbox
        if (e.target === toggle) {
            return;
        }
        // For clicks on label or span, manually trigger checkbox click
        e.preventDefault();
        e.stopPropagation();
        toggle.click();
    };
    label.addEventListener('click', hotWalletToggleLabelHandler, true); // Use capture phase
}

// Update wallet selector dropdown
async function updateWalletSelector() {
    const network = document.getElementById('walletNetworkSelect').value;
    const walletSelector = document.getElementById('walletSelector');
    
    if (!walletSelector) return;
    
    try {
        const wallets = await window.electronAPI.walletGetWalletsForNetwork(network);
        const currentWalletId = await window.electronAPI.walletGetCurrentWalletId(network);
        
        walletSelector.innerHTML = '<option value="">Select Account</option>';
        
        // Sort wallets by creation date for consistent ordering
        // Primary wallet should always be first
        wallets.sort((a, b) => {
            // Primary wallet always first
            if (a.id === 'primary') return -1;
            if (b.id === 'primary') return 1;
            // Then by creation date
            if (a.createdAt && b.createdAt) {
                return a.createdAt - b.createdAt;
            }
            return 0;
        });
        
        // Build a map of valid account names to avoid duplicates
        const validNames = new Set();
        wallets.forEach(w => {
            if (w.name && /^Account \d+$/.test(w.name)) {
                validNames.add(w.name);
            }
        });
        
        wallets.forEach((wallet, index) => {
            const option = document.createElement('option');
            option.value = wallet.id;
            
            // Clean up name display
            let displayName = wallet.name;
            
            // Check if name is invalid (contains wallet ID, equals ID, or is malformed)
            const isInvalidName = !displayName || 
                                  displayName === 'primary' || 
                                  displayName.includes('wallet_') ||
                                  displayName.startsWith('Wallet wallet_') ||
                                  displayName === wallet.id ||
                                  !/^Account \d+$/.test(displayName);
            
            if (isInvalidName) {
                // Assign sequential account number
                let accountNum = 1;
                if (wallet.id === 'primary') {
                    displayName = 'Account 1';
                } else {
                    // Find first unused account number
                    while (validNames.has(`Account ${accountNum}`)) {
                        accountNum++;
                    }
                    displayName = `Account ${accountNum}`;
                    validNames.add(displayName);
                }
            }
            
            option.textContent = displayName;
            if (wallet.id === currentWalletId) {
                option.selected = true;
            }
            walletSelector.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating wallet selector:', error);
        walletSelector.innerHTML = '<option value="">Error loading wallets</option>';
    }
}

async function updateWalletDisplay(skipBalanceRefresh = false) {
    const networkSelect = document.getElementById('walletNetworkSelect');
    const network = networkSelect ? networkSelect.value : 'omega';
    const balanceLabel = document.getElementById('walletBalanceLabel');
    const address = document.getElementById('walletAddress');
    const refreshBtn = document.getElementById('refreshBalanceBtn');
    const balanceAmount = document.getElementById('walletBalance');
    
    
    // Update wallet selector first
    await updateWalletSelector();
    
    // CRITICAL: Re-read network value AFTER selector update to ensure we have the latest value
    // This is important because the network might have changed during selector update
    const currentNetworkSelect = document.getElementById('walletNetworkSelect');
    const networkToUse = currentNetworkSelect ? currentNetworkSelect.value : network;
    
    // Check if wallet is loaded
    const isLoaded = await window.electronAPI.walletIsLoaded();
    if (!isLoaded) {
        if (address) address.textContent = 'Wallet not loaded';
        if (refreshBtn) refreshBtn.style.display = 'none';
        if (balanceAmount) balanceAmount.textContent = '--';
        return;
    }
    
    try {
        // Get current wallet ID to verify we're showing the right wallet
        const currentWalletId = await window.electronAPI.walletGetCurrentWalletId(networkToUse);
        
        if (networkToUse === 'solana') {
            if (balanceLabel) balanceLabel.textContent = 'Total Balance';
        const publicKey = await window.electronAPI.walletGetPublicKey();
            
            // Force clear and set Solana address - use innerHTML to ensure it's cleared
            if (address) {
                // Clear the element completely
                address.innerHTML = '';
                address.textContent = '';
                
        if (publicKey) {
                    // Show shortened Solana public key (not EVM address)
                    const shortened = publicKey.substring(0, 8) + '...' + publicKey.substring(publicKey.length - 8);
                    address.textContent = shortened;
        } else {
                    address.textContent = 'Solana wallet not available for this account';
                }
        }
        if (hotWalletMode) {
                if (refreshBtn) refreshBtn.style.display = 'flex';
                if (publicKey) {
                    // Only refresh balance if not skipped (e.g., during network switch)
                    if (!skipBalanceRefresh) {
                        // Pass network value to ensure correct network balance is fetched
                        await refreshWalletBalance(networkToUse);
                    }
        } else {
                    if (balanceAmount) balanceAmount.textContent = '--';
                }
            } else {
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (balanceAmount) balanceAmount.textContent = '--';
            }
        } else if (networkToUse === 'omega' || networkToUse === 'evm' || networkToUse === 'bsc') {
            if (balanceLabel) balanceLabel.textContent = 'Total Balance';
        const evmAddress = await window.electronAPI.walletGetEvmAddress();
            
            // Force clear and set EVM address - use innerHTML to ensure it's cleared
            if (address) {
                // Clear the element completely
                address.innerHTML = '';
                address.textContent = '';
                
        if (evmAddress) {
                    // Show shortened EVM address
                    const shortened = evmAddress.substring(0, 8) + '...' + evmAddress.substring(evmAddress.length - 8);
                    address.textContent = shortened;
        } else {
                    address.textContent = 'EVM wallet not available for this account';
                    // Clear balance if no EVM wallet
                    if (balanceAmount) balanceAmount.textContent = '--';
                }
        }
        if (hotWalletMode) {
                if (refreshBtn) refreshBtn.style.display = 'flex';
                if (evmAddress) {
                    // Only refresh balance if not skipped (e.g., during network switch)
                    if (!skipBalanceRefresh) {
                        // Pass network value to ensure correct network balance is fetched
                        await refreshWalletBalance(networkToUse);
                    }
        } else {
                    if (balanceAmount) balanceAmount.textContent = '--';
                }
            } else {
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (balanceAmount) balanceAmount.textContent = '--';
            }
        }
    } catch (error) {
        console.error('Error updating wallet display:', error);
        if (address) address.textContent = 'Error loading wallet';
        if (balanceAmount) balanceAmount.textContent = 'Error';
    }
}

async function refreshWalletBalance(networkOverride = null) {
    // Use provided network or re-read network value to ensure we have the latest
    const networkSelect = document.getElementById('walletNetworkSelect');
    const network = networkOverride || (networkSelect ? networkSelect.value : 'omega');
        const balanceAmount = document.getElementById('walletBalance');
    
    if (!hotWalletMode) {
        if (balanceAmount) balanceAmount.textContent = '--';
        return;
    }
    
    if (!balanceAmount) {
        console.error('[Balance] Balance amount element not found!');
        return;
    }
    
    // Ensure we're using the correct network value - prioritize override
    const finalNetwork = networkOverride !== null ? networkOverride : network;
    
    try {
        if (finalNetwork === 'solana') {
            try {
            const balance = await window.electronAPI.walletGetBalance();
                const balanceText = balance.toFixed(4) + ' SOL';
                balanceAmount.textContent = balanceText;
            updateAssetsList('solana', balance);
            } catch (error) {
                console.error('[Balance] Error fetching Solana balance:', error);
                balanceAmount.textContent = 'Error';
                // Check if wallet is loaded
                const publicKey = await window.electronAPI.walletGetPublicKey();
                if (!publicKey) {
                    balanceAmount.textContent = 'Wallet not loaded';
                }
            }
        } else if (finalNetwork === 'omega') {
            // Omega Network uses chain ID 1313161768
            try {
                const omegaBalance = await window.electronAPI.walletGetEvmBalance(1313161768);
                const balanceNum = parseFloat(omegaBalance);
                if (isNaN(balanceNum)) {
                    throw new Error('Invalid balance response');
                }
                const balanceText = balanceNum.toFixed(4) + ' OMEGA';
                balanceAmount.textContent = balanceText;
                updateAssetsList('omega', balanceNum);
            } catch (error) {
                console.error('[Balance] Error fetching Omega balance:', error);
                balanceAmount.textContent = 'Error';
                console.error('Failed to fetch Omega balance. Make sure you have network access enabled (Hot Wallet Mode). Error: ' + error.message);
            }
        } else if (finalNetwork === 'bsc') {
            // BSC uses chain ID 56
            try {
            const bscBalance = await window.electronAPI.walletGetEvmBalance(56);
                const balanceNum = parseFloat(bscBalance);
                if (isNaN(balanceNum)) {
                    throw new Error('Invalid balance response');
                }
                const balanceText = balanceNum.toFixed(4) + ' BNB';
                balanceAmount.textContent = balanceText;
                updateAssetsList('bsc', balanceNum);
            } catch (error) {
                console.error('[Balance] Error fetching BSC balance:', error);
                balanceAmount.textContent = 'Error';
            }
        } else if (finalNetwork === 'evm') {
            // Ethereum mainnet uses chain ID 1
            try {
                const evmBalance = await window.electronAPI.walletGetEvmBalance(1);
                const balanceNum = parseFloat(evmBalance);
                if (isNaN(balanceNum)) {
                    throw new Error('Invalid balance response');
                }
                const balanceText = balanceNum.toFixed(4) + ' ETH';
                balanceAmount.textContent = balanceText;
                updateAssetsList('evm', balanceNum);
            } catch (error) {
                console.error('[Balance] Error fetching Ethereum balance:', error);
                balanceAmount.textContent = 'Error';
            }
        } else {
            // Default to Ethereum for unknown EVM networks
            try {
            const evmBalance = await window.electronAPI.walletGetEvmBalance(1);
                const balanceNum = parseFloat(evmBalance);
                if (isNaN(balanceNum)) {
                    throw new Error('Invalid balance response');
        }
                const balanceText = balanceNum.toFixed(4) + ' ETH';
                balanceAmount.textContent = balanceText;
                updateAssetsList('evm', balanceNum);
    } catch (error) {
                console.error('[Balance] Error fetching default EVM balance:', error);
        balanceAmount.textContent = 'Error';
            }
        }
        
    } catch (error) {
        console.error('[Balance] Error refreshing balance:', error);
        if (balanceAmount) {
            balanceAmount.textContent = 'Error';
        }
        // Don't throw - just log the error so network switch can continue
    }
}

function updateAssetsList(network, balance) {
    const assetsList = document.getElementById('assetsList');
    if (!assetsList) return;
    
    let symbol, name, icon;
    if (network === 'solana') {
        symbol = 'SOL';
        name = 'Solana';
        icon = '◎';
    } else if (network === 'omega') {
        symbol = 'OMEGA';
        name = 'Omega Network';
        icon = 'Ω';
    } else if (network === 'bsc') {
        symbol = 'BNB';
        name = 'Binance Smart Chain';
        icon = '🔶';
    } else {
        symbol = 'ETH';
        name = 'Ethereum';
        icon = 'Ξ';
    }
    
    // Load custom tokens for this network
    const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]');
    const networkTokens = customTokens.filter(t => t.network === network);
    
    let html = `
        <div class="token-item">
            <div class="token-item-left">
                <div class="token-icon">${icon}</div>
                <div class="token-info">
                    <div class="token-name">${name}</div>
                    <div class="token-symbol">${symbol}</div>
                </div>
                </div>
            <div class="token-item-right">
                <div class="token-balance">${balance.toFixed(4)} ${symbol}</div>
                <div class="token-balance-usd">No conversion rate available</div>
            </div>
        </div>
    `;
    
    // Add custom tokens
    networkTokens.forEach(token => {
        html += `
            <div class="token-item">
                <div class="token-item-left">
                    <div class="token-icon">🪙</div>
                    <div class="token-info">
                        <div class="token-name">${token.name}</div>
                        <div class="token-symbol">${token.symbol}</div>
                    </div>
                </div>
                <div class="token-item-right">
                    <div class="token-balance">0.0000 ${token.symbol}</div>
                    <div class="token-balance-usd">No conversion rate available</div>
            </div>
        </div>
    `;
    });
    
    assetsList.innerHTML = html;
}

function setupAssetsList() {
    // Assets list will be populated dynamically
}

function setupWalletTabs() {
    // Tab switching
    document.querySelectorAll('.wallet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active state
            document.querySelectorAll('.wallet-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            // Show/hide content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const targetTab = document.getElementById(tabName + 'Tab');
            if (targetTab) {
                targetTab.style.display = 'block';
            }
            
            // Update activity list when activity tab is clicked
            if (tabName === 'activity') {
                updateActivityList();
            }
        });
    });
}

// Activity tracking functions
function addActivity(activity) {
    const activities = JSON.parse(localStorage.getItem('walletActivities') || '[]');
    activities.unshift(activity);
    // Keep only last 100 activities
    if (activities.length > 100) {
        activities.pop();
    }
    localStorage.setItem('walletActivities', JSON.stringify(activities));
    updateActivityList();
}

function updateActivityList() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    const activities = JSON.parse(localStorage.getItem('walletActivities') || '[]');
    
    if (activities.length === 0) {
        activityList.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: rgba(255, 255, 255, 0.5); font-size: 14px;">No transactions yet</div>';
        return;
    }
    
    activityList.innerHTML = activities.map(activity => {
        const date = new Date(activity.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        let typeLabel = activity.type === 'send' ? 'Sent' : activity.type === 'receive' ? 'Received' : activity.type === 'staking' ? 'Staking' : activity.type === 'app_interaction' ? (activity.action || 'App Interaction') : 'Transaction';
        let icon = activity.type === 'send' ? '↗' : activity.type === 'receive' ? '↙' : activity.type === 'staking' ? '🔒' : activity.type === 'app_interaction' ? '📱' : '↔';
        let color = activity.type === 'send' ? 'rgba(239, 68, 68, 0.8)' : activity.type === 'receive' ? 'rgba(34, 197, 94, 0.8)' : activity.type === 'staking' ? 'rgba(59, 130, 246, 0.8)' : activity.type === 'app_interaction' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(59, 130, 246, 0.8)';
        
        // Generate block explorer URL based on network and hash
        let explorerUrl = null;
        if (activity.hash) {
            const network = activity.network || 'omega';
            if (network === 'omega') {
                explorerUrl = `https://explorer.omeganetwork.co/tx/${activity.hash}`;
            } else if (network === 'evm' || network === 'ethereum') {
                explorerUrl = `https://etherscan.io/tx/${activity.hash}`;
            } else if (network === 'bsc') {
                explorerUrl = `https://bscscan.com/tx/${activity.hash}`;
            } else if (network === 'solana') {
                explorerUrl = `https://solscan.io/tx/${activity.hash}`;
            }
        }
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.02);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 20px;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9);">${typeLabel}</div>
                            ${activity.type === 'app_interaction' ? `<span style="font-size: 10px; padding: 2px 6px; background: rgba(168, 85, 247, 0.2); border-radius: 4px; color: rgba(168, 85, 247, 0.9);">App</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">${activity.network || 'Unknown'} • ${dateStr} ${timeStr}</div>
                        ${activity.source && activity.type === 'app_interaction' ? `<div style="font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 4px;">From: ${activity.source}</div>` : ''}
                        ${activity.to ? `<div style="font-size: 11px; color: rgba(255, 255, 255, 0.4); font-family: monospace; margin-top: 4px;">To: ${activity.to.substring(0, 8)}...${activity.to.substring(activity.to.length - 6)}</div>` : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    ${activity.amount ? `<div style="font-size: 14px; font-weight: 600; color: ${color};">${activity.type === 'send' ? '-' : '+'}${activity.amount} ${activity.symbol || ''}</div>` : ''}
                    ${activity.hash ? `
                        <div style="margin-top: 4px;">
                            ${explorerUrl ? `
                                <a href="#" class="tx-link" data-url="${explorerUrl}" style="font-size: 10px; color: rgba(59, 130, 246, 0.8); font-family: monospace; text-decoration: none; cursor: pointer; border-bottom: 1px dotted rgba(59, 130, 246, 0.5);">
                                    ${activity.hash.substring(0, 10)}...
                                </a>
                            ` : `
                                <div style="font-size: 10px; color: rgba(255, 255, 255, 0.3); font-family: monospace;">
                                    ${activity.hash.substring(0, 10)}...
                                </div>
                            `}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Attach click handlers to transaction links - copy URL to clipboard instead of opening browser
    activityList.querySelectorAll('.tx-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-url');
            if (url) {
                try {
                    // Try Electron clipboard API first (most reliable)
                    if (window.electronAPI && window.electronAPI.clipboardWriteText) {
                        const result = await window.electronAPI.clipboardWriteText(url);
                        if (result.success) {
                            alert('Transaction URL copied to clipboard!');
                            return;
                        }
                    }
                    
                    // Fallback: Try modern clipboard API
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                        alert('Transaction URL copied to clipboard!');
                        return;
                    }
                    
                    // Fallback: Create a temporary textarea element and copy from it
                    const textarea = document.createElement('textarea');
                    textarea.value = url;
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-999999px';
                    textarea.style.top = '-999999px';
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    
                    try {
                        const successful = document.execCommand('copy');
                        document.body.removeChild(textarea);
                        
                        if (successful) {
                            alert('Transaction URL copied to clipboard!');
                        } else {
                            throw new Error('execCommand copy failed');
                        }
                    } catch (e) {
                        document.body.removeChild(textarea);
                        throw e;
                    }
                } catch (error) {
                    console.error('Failed to copy transaction URL:', error);
                    alert('Failed to copy transaction URL: ' + (error.message || 'Unknown error'));
                }
            }
        });
    });
}

// Activity tracking works automatically - transactions are added when they happen
// Send transactions are automatically tracked when sent through the wallet
// Other transactions (receive, staking via DApps) would need blockchain monitoring to track automatically

function setupWalletModals() {
    // Send Modal
    document.getElementById('sendBtn')?.addEventListener('click', () => {
        if (!hotWalletMode) {
            alert('Please enable Hot Wallet Mode to send transactions.');
            return;
        }
        document.getElementById('sendModal').style.display = 'flex';
    });
    
    document.getElementById('closeSendModal')?.addEventListener('click', () => {
        document.getElementById('sendModal').style.display = 'none';
    });
    
    // Receive Modal
    document.getElementById('receiveBtn')?.addEventListener('click', async () => {
        const network = document.getElementById('walletNetworkSelect').value;
        const receiveAddress = document.getElementById('receiveAddress');
        
        if (network === 'solana') {
            const publicKey = await window.electronAPI.walletGetPublicKey();
            receiveAddress.textContent = publicKey || 'N/A';
        } else if (network === 'omega' || network === 'evm' || network === 'bsc') {
            const evmAddress = await window.electronAPI.walletGetEvmAddress();
            receiveAddress.textContent = evmAddress || 'N/A';
        }
        
        document.getElementById('receiveModal').style.display = 'flex';
    });
    
    document.getElementById('closeReceiveModal')?.addEventListener('click', () => {
        document.getElementById('receiveModal').style.display = 'none';
    });
    
    document.getElementById('copyReceiveAddressBtn')?.addEventListener('click', async () => {
        const address = document.getElementById('receiveAddress').textContent;
        if (!address || address === 'N/A') {
            alert('No address to copy');
            return;
        }
        
        try {
            // Try Electron clipboard API first (most reliable)
            if (window.electronAPI && window.electronAPI.clipboardWriteText) {
                const result = await window.electronAPI.clipboardWriteText(address);
                if (result.success) {
                    alert('Address copied to clipboard!');
                    return;
                }
            }
            
            // Fallback: Try modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(address);
                alert('Address copied to clipboard!');
                return;
            }
            
            // Fallback: Create a temporary textarea element and copy from it
            const textarea = document.createElement('textarea');
            textarea.value = address;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (successful) {
                    alert('Address copied to clipboard!');
                } else {
                    throw new Error('execCommand copy failed');
                }
            } catch (e) {
                document.body.removeChild(textarea);
                throw e;
            }
        } catch (error) {
            console.error('Clipboard copy error:', error);
            alert('Failed to copy address: ' + (error.message || 'Unknown error'));
        }
    });
    
    // Settings Modal - handler moved to attachExportButtonHandler section
    
    document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
    });
    
// Store export button handler to prevent duplicates
let exportButtonHandler = null;

    // Export Private Key from Settings - attach handler when modal opens
    function attachExportButtonHandler() {
        const exportBtn = document.getElementById('exportPrivateKeyBtn');
        if (!exportBtn) {
            console.warn('[WALLET] Export button not found');
            return;
        }
        
        
        // Remove existing listener if it exists
        if (exportButtonHandler) {
            exportBtn.removeEventListener('click', exportButtonHandler);
        }
        
        // Create and store handler
        exportButtonHandler = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            let password;
            try {
                password = await showPasswordPrompt(
                    'Export Private Key',
                    'Enter your wallet password to export private key:'
                );
            } catch (error) {
                return;
            }
            
            try {
                const isLoaded = await window.electronAPI.walletIsLoaded();
                if (!isLoaded) {
                    await window.electronAPI.walletLoad(password);
                }
                
                const result = await window.electronAPI.walletExportPrivateKey(password);
                if (result) {
                    // Show confirmation first
                    const confirmed = confirm('⚠️ WARNING: Private keys will be shown. Make sure no one can see your screen. Continue?');
                    if (!confirmed) {
                        return;
                    }
                    
                    // Show keys in custom modal
                    showExportKeysModal(result);
                } else {
                    alert('Failed to export private key. Make sure password is correct.');
                }
            } catch (error) {
                console.error('[WALLET] Export error:', error);
                alert('Failed to export private key: ' + error.message);
            }
        };
        
        // Attach handler using addEventListener
        exportBtn.addEventListener('click', exportButtonHandler);
        
    }
    
    // Attach handler when settings modal opens
    document.getElementById('walletSettingsBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (!modal) {
            console.error('[WALLET] Settings modal not found!');
            return;
        }
        modal.style.display = 'flex';
        
        // Setup handlers when modal is visible - use setTimeout to ensure DOM is fully ready
        setTimeout(() => {
            setupHotWalletToggle();
            attachExportButtonHandler();
        }, 50); // Small delay to ensure modal is fully rendered
    });
    
    // Import Wallet from Settings
    document.getElementById('importWalletBtnSettings')?.addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('importWalletModal').style.display = 'flex';
    });
    
    document.getElementById('closeImportWalletModal')?.addEventListener('click', () => {
        document.getElementById('importWalletModal').style.display = 'none';
    });
    
    document.getElementById('importWalletSubmitSettings')?.addEventListener('click', async () => {
        const privateKey = document.getElementById('importWalletPrivateKey').value.trim();
        const password = document.getElementById('importWalletPassword').value;
        
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
            alert('Wallet imported successfully!');
            document.getElementById('importWalletPrivateKey').value = '';
            document.getElementById('importWalletPassword').value = '';
            document.getElementById('importWalletModal').style.display = 'none';
            
            // Reload dashboard if wallet was already loaded
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (isLoaded) {
                await updateWalletDisplay();
            } else {
                // Wallet needs to be loaded
                showWalletLogin();
            }
        } catch (error) {
            alert('Failed to import wallet: ' + error.message);
        }
    });
    
    // Generate Wallet Modal
    document.getElementById('generateWalletBtn')?.addEventListener('click', () => {
        const network = document.getElementById('walletNetworkSelect').value;
        document.getElementById('generateWalletNetwork').value = network;
        // Reset form
        const nameField = document.getElementById('generateWalletName');
        if (nameField) nameField.value = '';
        document.getElementById('generateWalletPassword').value = '';
        document.getElementById('generateWalletForm').style.display = 'block';
        document.getElementById('generateWalletPrivateKeyDisplay').style.display = 'none';
        document.getElementById('generateWalletModal').style.display = 'flex';
    });
    
    document.getElementById('generateWalletSubmit')?.addEventListener('click', async () => {
        const network = document.getElementById('generateWalletNetwork').value;
        const password = document.getElementById('generateWalletPassword').value;
        const name = document.getElementById('generateWalletName')?.value.trim();
        
        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        try {
            const result = await window.electronAPI.walletCreateForNetwork(password, network, name || null);
            
            // Show private key
            document.getElementById('generateWalletPrivateKey').value = result.privateKey;
            document.getElementById('generateWalletForm').style.display = 'none';
            document.getElementById('generateWalletPrivateKeyDisplay').style.display = 'block';
            
            // Store wallet ID for switching after confirmation
            window.lastCreatedWalletId = result.id;
            window.lastCreatedWalletNetwork = network;
            window.lastCreatedWalletPassword = password;
        } catch (error) {
            alert('Failed to create wallet: ' + error.message);
        }
    });
    
    document.getElementById('generateWalletConfirm')?.addEventListener('click', async () => {
        try {
            // Don't auto-switch - just close modal and update selector
            // User can switch manually using the wallet selector
            
            // Clean up
            const nameField = document.getElementById('generateWalletName');
            if (nameField) nameField.value = '';
            document.getElementById('generateWalletPassword').value = '';
            document.getElementById('generateWalletForm').style.display = 'block';
            document.getElementById('generateWalletPrivateKeyDisplay').style.display = 'none';
            document.getElementById('generateWalletModal').style.display = 'none';
            delete window.lastCreatedWalletId;
            delete window.lastCreatedWalletNetwork;
            delete window.lastCreatedWalletPassword;
            
            // Update wallet selector to show new wallet
            await updateWalletSelector();
            await updateWalletDisplay();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
    
    document.getElementById('closeGenerateWalletModal')?.addEventListener('click', () => {
        // Reset form if closing
        const nameField = document.getElementById('generateWalletName');
        if (nameField) nameField.value = '';
        document.getElementById('generateWalletPassword').value = '';
        document.getElementById('generateWalletForm').style.display = 'block';
        document.getElementById('generateWalletPrivateKeyDisplay').style.display = 'none';
        document.getElementById('generateWalletModal').style.display = 'none';
        delete window.lastCreatedWalletId;
        delete window.lastCreatedWalletNetwork;
        delete window.lastCreatedWalletPassword;
    });
    
    // Close modals on background click (but not on child elements)
    ['sendModal', 'receiveModal', 'settingsModal', 'generateWalletModal', 'importWalletModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        modal?.addEventListener('click', (e) => {
            // Only close if clicking directly on the modal background, not on child elements
            if (e.target === modal && !e.target.closest('div[style*="background"]')) {
                modal.style.display = 'none';
            }
        });
    });
}

