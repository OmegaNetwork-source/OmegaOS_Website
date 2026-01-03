// Omega Wallet Standalone App
let currentWindowId = null;
let hotWalletMode = false; // Cold storage by default

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
    
    // Setup hot wallet toggle
    setupHotWalletToggle();
    
    // Setup modals and new UI elements
    setupWalletModals();
    setupAssetsList();
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
            await window.electronAPI.walletLoad(password);
            document.getElementById('loginPassword').value = '';
            loadWalletDashboard();
        } catch (error) {
            alert('Failed to unlock wallet: ' + error.message);
        }
    });
    
    // Network selector change handler
    document.getElementById('walletNetworkSelect')?.addEventListener('change', async () => {
        await updateWalletDisplay();
    });
    
    // Refresh balance (only in hot mode)
    document.getElementById('refreshBalanceBtn')?.addEventListener('click', async () => {
        if (hotWalletMode) {
            await refreshWalletBalance();
        }
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
        } else if (network === 'omega' || network === 'evm' || network === 'bsc') {
            const evmAddress = await window.electronAPI.walletGetEvmAddress();
            if (evmAddress) {
                navigator.clipboard.writeText(evmAddress);
                alert('Address copied to clipboard!');
            }
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
                if (chain === 'solana') {
                    const signature = await window.electronAPI.walletSendSol(toAddress, amount);
                    alert(`Transaction sent! Signature: ${signature}`);
                } else {
                    const txHash = await window.electronAPI.walletSendEvmTransaction(toAddress, amount.toString(), '0x', chainId);
                    alert(`Transaction sent! Hash: ${txHash}`);
                }
                document.getElementById('sendToAddress').value = '';
                document.getElementById('sendAmount').value = '';
                document.getElementById('sendModal').style.display = 'none';
                await refreshWalletBalance();
            } catch (error) {
                alert(`Failed to send ${chainName}: ` + error.message);
            }
        }
    });
    
    // Export private key
    document.getElementById('exportPrivateKeyBtn')?.addEventListener('click', async () => {
        const password = prompt('Enter your wallet password to export private key:');
        if (!password) return;
        
        try {
            // We need to get the private key - this requires wallet to be loaded
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                await window.electronAPI.walletLoad(password);
            }
            
            // Get the encrypted wallet data and decrypt it
            const result = await window.electronAPI.walletExportPrivateKey(password);
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
            alert('Failed to export private key: ' + error.message);
        }
    });
    
    // Export private key
    document.getElementById('exportPrivateKeyBtn')?.addEventListener('click', async () => {
        const password = prompt('Enter your wallet password to export private key:');
        if (!password) return;
        
        try {
            // We need to get the private key - this requires wallet to be loaded
            const isLoaded = await window.electronAPI.walletIsLoaded();
            if (!isLoaded) {
                await window.electronAPI.walletLoad(password);
            }
            
            // Get the encrypted wallet data and decrypt it
            const result = await window.electronAPI.walletExportPrivateKey(password);
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
            alert('Failed to export private key: ' + error.message);
        }
    });
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
    
    await updateWalletDisplay();
}

function setupHotWalletToggle() {
    const toggle = document.getElementById('hotWalletToggle');
    const modeDescription = document.getElementById('modeDescription');
    const hotModeWarning = document.getElementById('hotModeWarning');
    const balanceAmount = document.getElementById('walletBalance');
    const refreshBtn = document.getElementById('refreshBalanceBtn');
    const sendSection = document.getElementById('sendTransactionSection');
    
    toggle?.addEventListener('change', async (e) => {
        hotWalletMode = e.target.checked;
        
        // Enable/disable network access
        if (window.electronAPI && window.electronAPI.walletToggleNetwork) {
            await window.electronAPI.walletToggleNetwork(hotWalletMode);
        }
        
        if (hotWalletMode) {
            // Enable hot wallet mode
            modeDescription.textContent = 'Hot Wallet Mode';
            hotModeWarning.style.display = 'block';
            refreshBtn.style.display = 'flex';
            
            // Update toggle styling
            const toggleSpan = toggle.nextElementSibling;
            toggleSpan.style.backgroundColor = 'rgba(34, 197, 94, 0.5)';
            toggleSpan.querySelector('span').style.transform = 'translateX(20px)';
            
            // Load balance
            await refreshWalletBalance();
        } else {
            // Disable hot wallet mode (back to cold storage)
            modeDescription.textContent = 'Cold Storage Mode';
            hotModeWarning.style.display = 'none';
            refreshBtn.style.display = 'none';
            
            // Update toggle styling
            const toggleSpan = toggle.nextElementSibling;
            toggleSpan.style.backgroundColor = 'rgba(100, 116, 139, 0.5)';
            toggleSpan.querySelector('span').style.transform = 'translateX(0)';
            
            // Clear balance display
            document.getElementById('walletBalance').textContent = '--';
            document.getElementById('assetsList').innerHTML = '';
        }
        
        await updateWalletDisplay();
    });
}

async function updateWalletDisplay() {
    const network = document.getElementById('walletNetworkSelect').value;
    const balanceLabel = document.getElementById('walletBalanceLabel');
    const address = document.getElementById('walletAddress');
    const refreshBtn = document.getElementById('refreshBalanceBtn');
    
    if (network === 'solana') {
        balanceLabel.textContent = 'Total Balance';
        const publicKey = await window.electronAPI.walletGetPublicKey();
        if (publicKey) {
            // Show shortened address
            address.textContent = publicKey.substring(0, 8) + '...' + publicKey.substring(publicKey.length - 8);
        } else {
            address.textContent = 'Wallet not loaded';
        }
        if (hotWalletMode) {
            refreshBtn.style.display = 'flex';
            await refreshWalletBalance();
        } else {
            refreshBtn.style.display = 'none';
            document.getElementById('walletBalance').textContent = '--';
        }
    } else if (network === 'omega' || network === 'evm' || network === 'bsc') {
        balanceLabel.textContent = 'Total Balance';
        const evmAddress = await window.electronAPI.walletGetEvmAddress();
        if (evmAddress) {
            // Show shortened address
            address.textContent = evmAddress.substring(0, 8) + '...' + evmAddress.substring(evmAddress.length - 8);
        } else {
            address.textContent = 'Wallet not loaded';
        }
        if (hotWalletMode) {
            refreshBtn.style.display = 'flex';
            await refreshWalletBalance();
        } else {
            refreshBtn.style.display = 'none';
            document.getElementById('walletBalance').textContent = '--';
        }
    }
}

async function refreshWalletBalance() {
    if (!hotWalletMode) {
        const balanceAmount = document.getElementById('walletBalance');
        balanceAmount.textContent = '--';
        return;
    }
    
    const network = document.getElementById('walletNetworkSelect').value;
    const balanceAmount = document.getElementById('walletBalance');
    
    try {
        if (network === 'solana') {
            const balance = await window.electronAPI.walletGetBalance();
            balanceAmount.textContent = balance.toFixed(4) + ' SOL';
            updateAssetsList('solana', balance);
        } else if (network === 'omega') {
            // Omega Network uses chain ID 1313161768
            const omegaBalance = await window.electronAPI.walletGetEvmBalance(1313161768);
            balanceAmount.textContent = parseFloat(omegaBalance).toFixed(4) + ' OMEGA';
            updateAssetsList('omega', parseFloat(omegaBalance));
        } else if (network === 'bsc') {
            // BSC uses chain ID 56
            const bscBalance = await window.electronAPI.walletGetEvmBalance(56);
            balanceAmount.textContent = parseFloat(bscBalance).toFixed(4) + ' BNB';
            updateAssetsList('bsc', parseFloat(bscBalance));
        } else {
            const evmBalance = await window.electronAPI.walletGetEvmBalance(1);
            balanceAmount.textContent = parseFloat(evmBalance).toFixed(4) + ' ETH';
            updateAssetsList('evm', parseFloat(evmBalance));
        }
    } catch (error) {
        balanceAmount.textContent = 'Error';
        console.error('Error refreshing balance:', error);
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
    
    assetsList.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    ${icon}
                </div>
                <div>
                    <div style="font-weight: 600; color: rgba(255, 255, 255, 0.95); font-size: 15px;">${name}</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6);">${symbol}</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: rgba(255, 255, 255, 0.95); font-size: 15px;">${balance.toFixed(4)}</div>
                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6);">${symbol}</div>
            </div>
        </div>
    `;
}

function setupAssetsList() {
    // Assets list will be populated dynamically
}

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
        if (address && address !== 'N/A') {
            navigator.clipboard.writeText(address);
            alert('Address copied to clipboard!');
        }
    });
    
    // Settings Modal
    document.getElementById('walletSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'flex';
    });
    
    document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
    });
    
    // Close modals on background click
    ['sendModal', 'receiveModal', 'settingsModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

