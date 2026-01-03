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
        this.keypair = null;
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
            
            // Save wallet
            const walletData = {
                publicKey: publicKey,
                encryptedSecretKey: encrypted,
                evmAddress: evmWallet.address,
                encryptedEvmPrivateKey: evmEncrypted,
                createdAt: Date.now()
            };
            
            const walletFile = path.join(this.walletPath, 'wallet.json');
            fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));
            
            this.keypair = keypair;
            this.evmWallet = evmWallet;
            return {
                publicKey: publicKey,
                secretKey: secretKey, // Only return once on creation/import
                evmAddress: evmWallet.address
            };
        } catch (error) {
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    async loadWallet(password) {
        try {
            const walletFile = path.join(this.walletPath, 'wallet.json');
            if (!fs.existsSync(walletFile)) {
                return null;
            }

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
            
            return {
                publicKey: this.keypair.publicKey.toString(),
                evmAddress: this.evmWallet ? this.evmWallet.address : null
            };
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
        const walletFile = path.join(this.walletPath, 'wallet.json');
        return fs.existsSync(walletFile);
    }

    isLoaded() {
        return this.keypair !== null;
    }

    async exportPrivateKey(password) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const walletFile = path.join(this.walletPath, 'wallet.json');
            if (!fs.existsSync(walletFile)) {
                throw new Error('Wallet file not found');
            }

            const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
            
            // Decrypt secret key
            const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
            const secretKey = decrypted.toString(CryptoJS.enc.Utf8);
            
            if (!secretKey) {
                throw new Error('Invalid password');
            }

            // Decrypt EVM private key if exists
            let evmPrivateKey = null;
            if (walletData.encryptedEvmPrivateKey) {
                const evmDecrypted = CryptoJS.AES.decrypt(walletData.encryptedEvmPrivateKey, password);
                evmPrivateKey = evmDecrypted.toString(CryptoJS.enc.Utf8);
            }

            return {
                solanaPrivateKey: secretKey,
                evmPrivateKey: evmPrivateKey,
                // Also return in Base58 format for Solana
                solanaPrivateKeyBase58: bs58.encode(Buffer.from(secretKey, 'base64'))
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
                1313161768: 'https://0x4e454228.rpc.aurora-c.omeganetwork.co', // Omega Network
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

