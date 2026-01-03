// Preload script for webviews - injects Omega Wallet providers BEFORE page loads
// This ensures window.ethereum and window.solana are available when dApps check for them

const { contextBridge, ipcRenderer } = require('electron');

// Solana Provider
(function() {
    if (window.solana && window.solana.isOmega) return;
    
    class OmegaSolanaProvider {
        constructor() {
            this.isConnected = false;
            this.publicKey = null;
            this.listeners = {};
            this.isPhantom = true;
            this.isOmega = true;
        }
        
        async connect(opts) {
            const requestId = Date.now() + Math.random();
            
            // Use IPC to communicate with main process
            const response = await ipcRenderer.invoke('omega-wallet-request', {
                type: 'OMEGA_WALLET_REQUEST',
                action: 'connect',
                id: requestId
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const pubKey = { toString: () => response.publicKey, toBase58: () => response.publicKey };
            this.publicKey = pubKey;
            this.isConnected = true;
            this.emit('connect', { publicKey: this.publicKey });
            return { publicKey: this.publicKey };
        }
        
        async disconnect() {
            this.isConnected = false;
            this.publicKey = null;
            this.emit('disconnect');
        }
        
        async signTransaction(transaction) {
            if (!this.isConnected) throw new Error('Wallet not connected');
            
            const serialized = transaction.serialize({ requireAllSignatures: false });
            const base64 = btoa(String.fromCharCode(...serialized));
            const requestId = Date.now() + Math.random();
            
            const response = await ipcRenderer.invoke('omega-wallet-request', {
                type: 'OMEGA_WALLET_REQUEST',
                action: 'signTransaction',
                data: base64,
                id: requestId
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const signed = Uint8Array.from(atob(response.data), c => c.charCodeAt(0));
            const Transaction = window.solanaWeb3?.Transaction;
            if (Transaction) {
                return Transaction.from(signed);
            } else {
                return { serialize: () => signed };
            }
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
            
            const messageStr = typeof message === 'string' ? message : new TextDecoder(encoding).decode(message);
            const requestId = Date.now() + Math.random();
            
            const response = await ipcRenderer.invoke('omega-wallet-request', {
                type: 'OMEGA_WALLET_REQUEST',
                action: 'signMessage',
                data: messageStr,
                id: requestId
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            return { signature: Uint8Array.from(atob(response.data), c => c.charCodeAt(0)) };
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

// EVM Provider (MetaMask-compatible)
(function() {
    if (window.ethereum && window.ethereum.isOmega) return;
    
    class OmegaEVMProvider {
        constructor() {
            this.isConnected = false;
            this.selectedAddress = null;
            this.chainId = '0x1';
            this.listeners = {};
            this.isOmega = true;
            this.isMetaMask = true;
            this._metamask = this;
        }
        
        async request(args) {
            const { method, params } = args;
            const requestId = Date.now() + Math.random();
            
            const response = await ipcRenderer.invoke('omega-evm-request', {
                type: 'OMEGA_EVM_REQUEST',
                method: method,
                params: params || [],
                id: requestId
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            return response.result;
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
    window.ethereum = provider;
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
})();


