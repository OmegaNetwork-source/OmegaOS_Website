const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { ethers } = require('ethers');
const bs58 = require('bs58');
const CryptoJS = require('crypto-js');
const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OmegaWallet {
    constructor() {
        // Use devnet for testing - change to mainnet-beta for production
        this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        // Always start with wallet unloaded - require password on startup
        this.keypair = null;
        this.evmWallet = null;
        this.currentWalletId = null; // Track currently loaded wallet ID
        // ISOLATED: Store wallet in browser-specific directory (separate from desktop app)
        // Browser wallet stored at: userData/isolated-env/browser-wallet
        // Desktop app wallet stored at: userData/isolated-env/wallet
        const app = require('electron').app || { getPath: () => process.env.APPDATA || os.homedir() };
        const isolatedPath = path.join(app.getPath('userData'), 'isolated-env', 'browser-wallet');
        this.walletPath = isolatedPath;
        this.ensureWalletDirectory();
    }
    
    setNetwork(network) {
        if (network === 'mainnet') {
            this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        } else if (network === 'devnet') {
            this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        }
    }

    ensureWalletDirectory() {
        if (!fs.existsSync(this.walletPath)) {
            fs.mkdirSync(this.walletPath, { recursive: true });
        }
    }

    async createWallet(password, secretKeyBase64 = null) {
        try {
            // Create primary multi-network wallet (backward compatibility)
            const storage = this.loadWalletsStorage();
            
            // Check if primary wallet already exists
            const existingPrimary = storage.wallets.find(w => w.id === 'primary');
            if (existingPrimary) {
                throw new Error('Primary wallet already exists. Use createWalletForNetwork for additional wallets.');
            }
            
            let keypair;
            let secretKey;
            
            if (secretKeyBase64) {
                // Import existing wallet
                const secretKeyBuffer = Buffer.from(secretKeyBase64, 'base64');
                keypair = Keypair.fromSecretKey(secretKeyBuffer);
                secretKey = secretKeyBase64;
            } else {
                // Generate new wallet
                keypair = Keypair.generate();
                secretKey = Buffer.from(keypair.secretKey).toString('base64');
            }
            
            const publicKey = keypair.publicKey.toString();
            
            // Encrypt secret key
            const encrypted = CryptoJS.AES.encrypt(secretKey, password).toString();
            
            // Also create EVM wallet from same seed
            const evmWallet = ethers.Wallet.createRandom();
            const evmEncrypted = CryptoJS.AES.encrypt(evmWallet.privateKey, password).toString();
            
            // Save wallet in new format
            const                 walletData = {
                    id: 'primary',
                    network: 'multi',
                    name: 'Account 1',
                    publicKey: publicKey,
                    encryptedSecretKey: encrypted,
                    evmAddress: evmWallet.address,
                    encryptedEvmPrivateKey: evmEncrypted,
                    createdAt: Date.now()
                };
            
            storage.wallets.push(walletData);
            storage.currentWalletIds = {
                solana: 'primary',
                omega: 'primary',
                evm: 'primary',
                bsc: 'primary'
            };
            
            this.saveWalletsStorage(storage);
            
            // Also save in old format for backward compatibility
            const walletFile = path.join(this.walletPath, 'wallet.json');
            const oldFormatData = {
                publicKey: publicKey,
                encryptedSecretKey: encrypted,
                evmAddress: evmWallet.address,
                encryptedEvmPrivateKey: evmEncrypted,
                createdAt: Date.now()
            };
            fs.writeFileSync(walletFile, JSON.stringify(oldFormatData, null, 2));
            
            this.keypair = keypair;
            this.evmWallet = evmWallet;
            this.currentWalletId = 'primary';
            
            return {
                publicKey: publicKey,
                secretKey: secretKey, // Only return once on creation/import
                evmAddress: evmWallet.address
            };
        } catch (error) {
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    async loadWallet(password, network = null) {
        try {
            const storage = this.loadWalletsStorage();
            
            // If no wallets exist, check old format
            if (storage.wallets.length === 0) {
                const walletFile = path.join(this.walletPath, 'wallet.json');
                if (fs.existsSync(walletFile)) {
                    // This will trigger migration in loadWalletsStorage, but we need to handle it here
                    const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
                    
                    // Decrypt secret key
                    const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
                    const secretKey = decrypted.toString(CryptoJS.enc.Utf8);
                    
                    if (!secretKey) {
                        throw new Error('Invalid password');
                    }

                    const secretKeyBuffer = Buffer.from(secretKey, 'base64');
                    this.keypair = Keypair.fromSecretKey(secretKeyBuffer);
                    
                    // Load EVM wallet if exists
                    if (walletData.encryptedEvmPrivateKey) {
                        const evmDecrypted = CryptoJS.AES.decrypt(walletData.encryptedEvmPrivateKey, password);
                        const evmPrivateKey = evmDecrypted.toString(CryptoJS.enc.Utf8);
                        if (evmPrivateKey) {
                            this.evmWallet = new ethers.Wallet(evmPrivateKey);
                        }
                    }
                    
                    this.currentWalletId = 'primary';
                    
                    return {
                        publicKey: this.keypair.publicKey.toString(),
                        evmAddress: this.evmWallet ? this.evmWallet.address : null
                    };
                }
                return null;
            }
            
            // Use network-specific wallet or default to primary (Account 1)
            const targetNetwork = network || 'omega'; // Default to omega as per requirement
            
            // If no wallet is currently loaded (this.currentWalletId is null), always default to primary (Account 1)
            // This ensures Account 1 loads first on app startup
            let walletId = null;
            
            if (this.currentWalletId === null) {
                // First load after app start - always use primary (Account 1) if it exists
                const primaryWallet = storage.wallets.find(w => w.id === 'primary');
                if (primaryWallet) {
                    walletId = 'primary';
                } else if (storage.wallets.length > 0) {
                    // If no primary, use first wallet (sorted by creation date)
                    const sortedWallets = storage.wallets.sort((a, b) => {
                        const aTime = a.createdAt || 0;
                        const bTime = b.createdAt || 0;
                        return aTime - bTime;
                    });
                    walletId = sortedWallets[0].id;
                } else {
                    throw new Error('No wallets found');
                }
                // Set it as current for this network
                storage.currentWalletIds[targetNetwork] = walletId;
                this.saveWalletsStorage(storage);
            } else {
                // Wallet is already loaded - use the stored current wallet ID for this network
                walletId = storage.currentWalletIds[targetNetwork];
                
                // If no wallet ID set for this network, use primary
                if (!walletId) {
                    const primaryWallet = storage.wallets.find(w => w.id === 'primary');
                    if (primaryWallet) {
                        walletId = 'primary';
                    } else if (storage.wallets.length > 0) {
                        const sortedWallets = storage.wallets.sort((a, b) => {
                            const aTime = a.createdAt || 0;
                            const bTime = b.createdAt || 0;
                            return aTime - bTime;
                        });
                        walletId = sortedWallets[0].id;
                    } else {
                        throw new Error('No wallets found');
                    }
                    storage.currentWalletIds[targetNetwork] = walletId;
                    this.saveWalletsStorage(storage);
                }
            }
            
            // Load the wallet
            const result = await this.loadWalletById(password, walletId, targetNetwork);
            
            // Ensure currentWalletId is set
            this.currentWalletId = walletId;
            
            // Verify wallet is loaded
            if (!this.keypair && !this.evmWallet) {
                throw new Error('Failed to load wallet - no keys loaded');
            }
            
            return result;
        } catch (error) {
            throw new Error(`Failed to load wallet: ${error.message}`);
        }
    }

    async getBalance() {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const balance = await this.connection.getBalance(this.keypair.publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async sendSol(toAddress, amount) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const toPublicKey = new PublicKey(toAddress);
            const lamports = amount * LAMPORTS_PER_SOL;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.keypair.publicKey,
                    toPubkey: toPublicKey,
                    lamports: lamports,
                })
            );

            const signature = await this.connection.sendTransaction(
                transaction,
                [this.keypair]
            );

            await this.connection.confirmTransaction(signature, 'confirmed');
            return signature;
        } catch (error) {
            throw new Error(`Failed to send SOL: ${error.message}`);
        }
    }

    getPublicKey() {
        if (!this.keypair) {
            return null;
        }
        return this.keypair.publicKey.toString();
    }

    async signTransaction(transaction) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            transaction.partialSign(this.keypair);
            return transaction;
        } catch (error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
    }

    async signMessage(message) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const messageBytes = new TextEncoder().encode(message);
            const signature = await this.keypair.sign(messageBytes);
            return bs58.encode(signature);
        } catch (error) {
            throw new Error(`Failed to sign message: ${error.message}`);
        }
    }

    hasWallet() {
        const walletsFile = this.getWalletsFile();
        const oldWalletFile = path.join(this.walletPath, 'wallet.json');
        // Check for either new format (wallets.json) or old format (wallet.json)
        return fs.existsSync(walletsFile) || fs.existsSync(oldWalletFile);
    }

    // Get wallet storage file path
    getWalletsFile() {
        return path.join(this.walletPath, 'wallets.json');
    }

    // Load wallets storage (supports both old single wallet and new multi-wallet format)
    loadWalletsStorage() {
        const walletsFile = this.getWalletsFile();
        const oldWalletFile = path.join(this.walletPath, 'wallet.json');
        
        // If wallets.json exists, use it
        if (fs.existsSync(walletsFile)) {
            try {
                return JSON.parse(fs.readFileSync(walletsFile, 'utf8'));
            } catch (error) {
                console.error('Error loading wallets.json:', error);
                return { wallets: [], currentWalletIds: {} };
            }
        }
        
        // If old wallet.json exists, migrate it
        if (fs.existsSync(oldWalletFile)) {
            try {
                const oldWallet = JSON.parse(fs.readFileSync(oldWalletFile, 'utf8'));
                // Migrate to new format
                const migrated = {
                    wallets: [{
                        id: 'primary',
                        network: 'multi', // Supports both Solana and EVM
                        name: 'Account 1',
                        publicKey: oldWallet.publicKey,
                        encryptedSecretKey: oldWallet.encryptedSecretKey,
                        evmAddress: oldWallet.evmAddress,
                        encryptedEvmPrivateKey: oldWallet.encryptedEvmPrivateKey,
                        createdAt: oldWallet.createdAt || Date.now()
                    }],
                    currentWalletIds: {
                        solana: 'primary',
                        omega: 'primary',
                        evm: 'primary',
                        bsc: 'primary'
                    }
                };
                fs.writeFileSync(walletsFile, JSON.stringify(migrated, null, 2));
                return migrated;
            } catch (error) {
                console.error('Error migrating wallet:', error);
            }
        }
        
        return { wallets: [], currentWalletIds: {} };
    }

    // Save wallets storage
    saveWalletsStorage(data) {
        const walletsFile = this.getWalletsFile();
        fs.writeFileSync(walletsFile, JSON.stringify(data, null, 2));
    }

    // Generate unique wallet ID
    generateWalletId() {
        return 'wallet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Create a new wallet for a specific network
    async createWalletForNetwork(password, network, name = null) {
        try {
            const storage = this.loadWalletsStorage();
            
            let walletData;
            const walletId = this.generateWalletId();
            let privateKey = null;
            
            // Generate wallet name if not provided (like MetaMask: Account 1, Account 2, etc.)
            if (!name) {
                const allWallets = storage.wallets;
                // Find highest account number
                let maxAccountNum = 0;
                allWallets.forEach(w => {
                    const match = w.name?.match(/^Account (\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxAccountNum) maxAccountNum = num;
                    }
                });
                name = `Account ${maxAccountNum + 1}`;
            }
            
            if (network === 'solana') {
                // Generate Solana wallet
                const keypair = Keypair.generate();
                const secretKey = Buffer.from(keypair.secretKey).toString('base64');
                const encrypted = CryptoJS.AES.encrypt(secretKey, password).toString();
                privateKey = bs58.encode(Buffer.from(secretKey, 'base64'));
                
                walletData = {
                    id: walletId,
                    network: 'solana',
                    name: name,
                    publicKey: keypair.publicKey.toString(),
                    encryptedSecretKey: encrypted,
                    createdAt: Date.now()
                };
            } else {
                // Generate EVM wallet (for omega, evm, bsc)
                const evmWallet = ethers.Wallet.createRandom();
                const encrypted = CryptoJS.AES.encrypt(evmWallet.privateKey, password).toString();
                privateKey = evmWallet.privateKey;
                
                walletData = {
                    id: walletId,
                    network: network,
                    name: name,
                    address: evmWallet.address,
                    encryptedPrivateKey: encrypted,
                    createdAt: Date.now()
                };
            }
            
            storage.wallets.push(walletData);
            
            // Don't auto-switch - user can switch manually
            
            this.saveWalletsStorage(storage);
            
            return {
                id: walletId,
                publicKey: walletData.publicKey || walletData.address,
                address: walletData.address || walletData.publicKey,
                privateKey: privateKey
            };
        } catch (error) {
            throw new Error(`Failed to create wallet for ${network}: ${error.message}`);
        }
    }

    // Get all wallets for a network
    getWalletsForNetwork(network) {
        const storage = this.loadWalletsStorage();
        const filtered = storage.wallets.filter(w => {
            if (network === 'solana') {
                return w.network === 'solana' || w.network === 'multi';
            } else {
                return w.network === network || w.network === 'multi';
            }
        });
        
        // Remove duplicates by ID
        const uniqueWallets = [];
        const seenIds = new Set();
        filtered.forEach(w => {
            if (!seenIds.has(w.id)) {
                seenIds.add(w.id);
                uniqueWallets.push(w);
            }
        });
        
        return uniqueWallets.map(w => {
            // Clean up wallet names - ensure they're readable
            let cleanName = w.name;
            if (!cleanName || cleanName === 'primary' || cleanName.includes('wallet_') || cleanName === w.id) {
                // Don't set a fallback name here - let the UI handle it
                cleanName = w.name || null;
            }
            return {
                id: w.id,
                name: cleanName,
                address: w.publicKey || w.address,
                createdAt: w.createdAt
            };
        });
    }
    
    // Update wallet name
    updateWalletName(walletId, name) {
        const storage = this.loadWalletsStorage();
        const wallet = storage.wallets.find(w => w.id === walletId);
        if (wallet) {
            wallet.name = name;
            this.saveWalletsStorage(storage);
            return true;
        }
        return false;
    }
    
    // Delete a wallet
    deleteWallet(walletId) {
        const storage = this.loadWalletsStorage();
        const initialLength = storage.wallets.length;
        storage.wallets = storage.wallets.filter(w => w.id !== walletId);
        
        // Remove from currentWalletIds if it's set for any network
        Object.keys(storage.currentWalletIds).forEach(network => {
            if (storage.currentWalletIds[network] === walletId) {
                delete storage.currentWalletIds[network];
            }
        });
        
        this.saveWalletsStorage(storage);
        return storage.wallets.length < initialLength;
    }
    
    // Clean up duplicate wallets - keep only primary and one other wallet per network type
    cleanupDuplicateWallets() {
        const storage = this.loadWalletsStorage();
        const walletsToKeep = new Set();
        
        // Always keep primary wallet
        const primaryWallet = storage.wallets.find(w => w.id === 'primary');
        if (primaryWallet) {
            walletsToKeep.add('primary');
        }
        
        // Keep one EVM wallet (if not primary) and one Solana wallet (if not primary)
        const evmWallets = storage.wallets.filter(w => 
            w.id !== 'primary' && (w.network === 'omega' || w.network === 'evm' || w.network === 'bsc' || w.network === 'multi')
        );
        const solanaWallets = storage.wallets.filter(w => 
            w.id !== 'primary' && (w.network === 'solana' || w.network === 'multi')
        );
        
        // Keep the oldest EVM wallet (if exists)
        if (evmWallets.length > 0) {
            evmWallets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            walletsToKeep.add(evmWallets[0].id);
        }
        
        // Keep the oldest Solana wallet (if exists and different from EVM)
        if (solanaWallets.length > 0) {
            solanaWallets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const oldestSolana = solanaWallets[0];
            if (!walletsToKeep.has(oldestSolana.id)) {
                walletsToKeep.add(oldestSolana.id);
            }
        }
        
        // Remove all wallets not in the keep list
        const walletsToDelete = storage.wallets.filter(w => !walletsToKeep.has(w.id));
        walletsToDelete.forEach(w => {
            // Remove from currentWalletIds
            Object.keys(storage.currentWalletIds).forEach(network => {
                if (storage.currentWalletIds[network] === w.id) {
                    // Set to primary if available, otherwise remove
                    if (primaryWallet) {
                        storage.currentWalletIds[network] = 'primary';
                    } else {
                        delete storage.currentWalletIds[network];
                    }
                }
            });
        });
        
        storage.wallets = storage.wallets.filter(w => walletsToKeep.has(w.id));
        this.saveWalletsStorage(storage);
        
        return { deleted: walletsToDelete.length, kept: storage.wallets.length };
    }

    // Get current wallet ID for a network
    getCurrentWalletId(network) {
        const storage = this.loadWalletsStorage();
        return storage.currentWalletIds[network] || null;
    }

    // Set current wallet for a network
    setCurrentWalletId(network, walletId) {
        const storage = this.loadWalletsStorage();
        storage.currentWalletIds[network] = walletId;
        this.saveWalletsStorage(storage);
    }

    // Load a specific wallet by ID and network
    async loadWalletById(password, walletId, network) {
        try {
            const storage = this.loadWalletsStorage();
            const walletData = storage.wallets.find(w => w.id === walletId);
            
            if (!walletData) {
                throw new Error('Wallet not found');
            }
            
            // Clear previous wallet state before loading new one
            this.keypair = null;
            this.evmWallet = null;
            
            // Verify network compatibility
            if (network === 'solana' && walletData.network !== 'solana' && walletData.network !== 'multi') {
                throw new Error('Wallet not compatible with Solana network');
            }
            if (network !== 'solana' && walletData.network !== network && walletData.network !== 'multi') {
                throw new Error(`Wallet not compatible with ${network} network`);
            }
            
            // For multi-network wallets, always load both Solana and EVM keys
            // For single-network wallets, only load the relevant key
            if (walletData.network === 'multi') {
                // Multi-network wallet - load both
                if (walletData.encryptedSecretKey) {
                    const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
                    const secretKey = decrypted.toString(CryptoJS.enc.Utf8);
                    
                    if (!secretKey) {
                        throw new Error('Invalid password');
                    }
                    
                    const secretKeyBuffer = Buffer.from(secretKey, 'base64');
                    this.keypair = Keypair.fromSecretKey(secretKeyBuffer);
                }
                
                const encryptedKey = walletData.encryptedPrivateKey || walletData.encryptedEvmPrivateKey;
                if (encryptedKey) {
                    const decrypted = CryptoJS.AES.decrypt(encryptedKey, password);
                    const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
                    
                    if (!privateKey) {
                        throw new Error('Invalid password');
                    }
                    
                    this.evmWallet = new ethers.Wallet(privateKey);
                }
            } else if (walletData.network === 'solana') {
                // Solana-only wallet
                if (walletData.encryptedSecretKey) {
                    const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
                    const secretKey = decrypted.toString(CryptoJS.enc.Utf8);
                    
                    if (!secretKey) {
                        throw new Error('Invalid password');
                    }
                    
                    const secretKeyBuffer = Buffer.from(secretKey, 'base64');
                    this.keypair = Keypair.fromSecretKey(secretKeyBuffer);
                }
            } else {
                // EVM-only wallet (omega, evm, bsc)
                const encryptedKey = walletData.encryptedPrivateKey || walletData.encryptedEvmPrivateKey;
                if (encryptedKey) {
                    const decrypted = CryptoJS.AES.decrypt(encryptedKey, password);
                    const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
                    
                    if (!privateKey) {
                        throw new Error('Invalid password');
                    }
                    
                    this.evmWallet = new ethers.Wallet(privateKey);
                }
            }
            
            // Set current wallet ID
            this.currentWalletId = walletId;
            
            // Verify at least one key is loaded
            if (!this.keypair && !this.evmWallet) {
                throw new Error('Failed to load wallet keys - check password and wallet data');
            }
            
            // Debug logging
            console.log(`[Wallet] Loaded wallet ${walletId} for network ${network}:`, {
                hasKeypair: !!this.keypair,
                hasEvmWallet: !!this.evmWallet,
                walletNetwork: walletData.network,
                publicKey: this.keypair ? this.keypair.publicKey.toString() : null,
                evmAddress: this.evmWallet ? this.evmWallet.address : null
            });
            
            return {
                publicKey: this.keypair ? this.keypair.publicKey.toString() : (walletData.publicKey || null),
                evmAddress: this.evmWallet ? this.evmWallet.address : (walletData.evmAddress || walletData.address || null)
            };
        } catch (error) {
            throw new Error(`Failed to load wallet: ${error.message}`);
        }
    }

    isLoaded() {
        // Wallet is loaded if either keypair (Solana) or evmWallet (EVM) is loaded
        return this.keypair !== null || this.evmWallet !== null;
    }

    async exportPrivateKey(password) {
        if (!this.currentWalletId) {
            throw new Error('Wallet not loaded');
        }

        try {
            const storage = this.loadWalletsStorage();
            const walletData = storage.wallets.find(w => w.id === this.currentWalletId);
            
            if (!walletData) {
                throw new Error('Wallet data not found');
            }
            
            // Decrypt secret key (Solana)
            let solanaPrivateKey = null;
            let solanaPrivateKeyBase58 = null;
            if (walletData.encryptedSecretKey) {
                const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
                solanaPrivateKey = decrypted.toString(CryptoJS.enc.Utf8);
                
                if (!solanaPrivateKey) {
                    throw new Error('Invalid password');
                }
                
                // Convert to Base58 format for Solana
                solanaPrivateKeyBase58 = bs58.encode(Buffer.from(solanaPrivateKey, 'base64'));
            }

            // Decrypt EVM private key if exists
            let evmPrivateKey = null;
            if (walletData.encryptedEvmPrivateKey) {
                const evmDecrypted = CryptoJS.AES.decrypt(walletData.encryptedEvmPrivateKey, password);
                evmPrivateKey = evmDecrypted.toString(CryptoJS.enc.Utf8);
                
                if (!evmPrivateKey && walletData.encryptedEvmPrivateKey) {
                    throw new Error('Invalid password');
                }
            }

            return {
                solanaPrivateKey: solanaPrivateKey,
                evmPrivateKey: evmPrivateKey,
                solanaPrivateKeyBase58: solanaPrivateKeyBase58
            };
        } catch (error) {
            throw new Error(`Failed to export private key: ${error.message}`);
        }
    }

    // EVM Methods
    getEvmAddress() {
        if (!this.evmWallet) {
            return null;
        }
        return this.evmWallet.address;
    }

    getEvmWallet() {
        if (!this.evmWallet) {
            return null;
        }
        return this.evmWallet;
    }

    async getEvmBalance(chainId = 1) {
        if (!this.evmWallet) {
            throw new Error('EVM wallet not loaded');
        }

        try {
            // Default to Ethereum mainnet, but support other chains
            const rpcUrls = {
                1: 'https://eth.llamarpc.com', // Ethereum mainnet
                5: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Goerli testnet
                137: 'https://polygon-rpc.com', // Polygon
                56: 'https://bsc-dataseed.binance.org', // BSC
                42161: 'https://arb1.arbitrum.io/rpc', // Arbitrum
                10: 'https://mainnet.optimism.io', // Optimism
                1313161768: 'https://0x4e454228.rpc.aurora-cloud.dev/', // Omega Network
            };

            const rpcUrl = rpcUrls[chainId] || rpcUrls[1];
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const balance = await provider.getBalance(this.evmWallet.address);
            return ethers.formatEther(balance);
        } catch (error) {
            throw new Error(`Failed to get EVM balance: ${error.message}`);
        }
    }

    async signEvmTransaction(transaction) {
        if (!this.evmWallet) {
            throw new Error('EVM wallet not loaded');
        }

        try {
            // transaction should be a serialized transaction object
            return await this.evmWallet.signTransaction(transaction);
        } catch (error) {
            throw new Error(`Failed to sign EVM transaction: ${error.message}`);
        }
    }

    async signEvmMessage(message) {
        if (!this.evmWallet) {
            throw new Error('EVM wallet not loaded');
        }

        try {
            const messageStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
            return await this.evmWallet.signMessage(messageStr);
        } catch (error) {
            throw new Error(`Failed to sign EVM message: ${error.message}`);
        }
    }

    async sendEvmTransaction(to, value, data = '0x', chainId = 1) {
        if (!this.evmWallet) {
            throw new Error('EVM wallet not loaded');
        }

        try {
            const rpcUrls = {
                1: 'https://eth.llamarpc.com',
                5: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
                137: 'https://polygon-rpc.com',
                56: 'https://bsc-dataseed.binance.org',
                42161: 'https://arb1.arbitrum.io/rpc',
                10: 'https://mainnet.optimism.io',
                1313161768: 'https://0x4e454228.rpc.aurora-cloud.dev/', // Omega Network
            };

            const rpcUrl = rpcUrls[chainId] || rpcUrls[1];
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const wallet = this.evmWallet.connect(provider);

            const tx = {
                to: to,
                value: ethers.parseEther(value.toString()),
                data: data,
            };

            const txResponse = await wallet.sendTransaction(tx);
            return txResponse.hash;
        } catch (error) {
            throw new Error(`Failed to send EVM transaction: ${error.message}`);
        }
    }
}

module.exports = OmegaWallet;

