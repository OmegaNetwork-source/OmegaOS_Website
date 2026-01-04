const { ethers } = require('ethers');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Omega OS Identity Manager
 * Manages decentralized OS identity on Omega Network blockchain
 */
class OmegaIdentityManager {
    constructor() {
        // Omega Network RPC - Aurora-based network
        // RPC URL: https://0x4e454228.rpc.aurora-cloud.dev/
        this.omegaNetworkRpc = process.env.OMEGA_NETWORK_RPC || 'https://0x4e454228.rpc.aurora-cloud.dev/';
        this.omegaNetworkChainId = parseInt(process.env.OMEGA_NETWORK_CHAIN_ID || '1313161768'); // Omega Network Chain ID
        
        // Smart contract addresses (deployed on Omega Network)
        this.identityContractAddress = process.env.OMEGA_IDENTITY_CONTRACT || '0xe8d01934A917bA9565c0bA8286995D15F7B19F0C';
        this.licensingContractAddress = process.env.OMEGA_LICENSING_CONTRACT || '0x7DfD4E9A0a433e60D7B60AfdDd5cFCCAE7898108';
        this.syncContractAddress = process.env.OMEGA_SYNC_CONTRACT || '0x4d4c6D91971ac65a161A0B8d9aC8A49091037aD7';
        
        // Load ABIs
        try {
            this.identityABI = require('./contracts/IdentityRegistry.abi.json');
        } catch (error) {
            console.warn('Failed to load Identity Registry ABI:', error);
            this.identityABI = null;
        }
        
        try {
            this.licensingABI = require('./contracts/Licensing.abi.json');
        } catch (error) {
            console.warn('Licensing ABI not available yet:', error);
            this.licensingABI = null;
        }
        
        try {
            this.syncABI = require('./contracts/DocumentSync.abi.json');
        } catch (error) {
            console.warn('Failed to load Document Sync ABI:', error);
            this.syncABI = null;
        }
        
        // Initialize provider
        this.provider = null;
        this.wallet = null;
        
        // Identity storage
        const app = require('electron').app || { getPath: () => process.env.APPDATA || os.homedir() };
        this.identityPath = path.join(app.getPath('userData'), 'isolated-env', 'identity');
        this.ensureIdentityDirectory();
        
        // Load identity if exists
        this.identity = null;
        this.loadIdentity();
    }
    
    ensureIdentityDirectory() {
        if (!fs.existsSync(this.identityPath)) {
            fs.mkdirSync(this.identityPath, { recursive: true });
        }
    }
    
    /**
     * Initialize provider with wallet
     */
    async initializeProvider(evmWallet) {
        try {
            this.provider = new ethers.JsonRpcProvider(this.omegaNetworkRpc);
            this.wallet = evmWallet.connect(this.provider);
            return true;
        } catch (error) {
            console.error('Failed to initialize Omega Network provider:', error);
            return false;
        }
    }
    
    /**
     * Generate or load OS identity
     */
    async createOrLoadIdentity(evmWallet) {
        try {
            // Check if identity already exists
            const identityFile = path.join(this.identityPath, 'identity.json');
            
            if (fs.existsSync(identityFile)) {
                const identityData = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
                this.identity = identityData;
                
                // Initialize provider with wallet
                await this.initializeProvider(evmWallet);
                
                return {
                    omegaId: identityData.omegaId,
                    address: identityData.address,
                    createdAt: identityData.createdAt,
                    exists: true
                };
            }
            
            // Create new identity
            await this.initializeProvider(evmWallet);
            const address = await evmWallet.getAddress();
            
            // Generate unique Omega ID (hash of address + device fingerprint)
            const deviceFingerprint = this.getDeviceFingerprint();
            const omegaIdHash = crypto.createHash('sha256')
                .update(address + deviceFingerprint + Date.now())
                .digest('hex');
            const omegaId = 'omega://' + omegaIdHash.substring(0, 16);
            
            // Register identity on Omega Network
            const registered = await this.registerIdentityOnChain(omegaId, address, deviceFingerprint);
            
            if (!registered) {
                throw new Error('Failed to register identity on Omega Network');
            }
            
            // Save identity locally
            this.identity = {
                omegaId: omegaId,
                address: address,
                deviceFingerprint: deviceFingerprint,
                createdAt: Date.now(),
                registered: true
            };
            
            fs.writeFileSync(identityFile, JSON.stringify(this.identity, null, 2));
            
            return {
                omegaId: omegaId,
                address: address,
                createdAt: this.identity.createdAt,
                exists: false
            };
        } catch (error) {
            console.error('Failed to create/load identity:', error);
            throw error;
        }
    }
    
    /**
     * Get device fingerprint (privacy-preserving)
     */
    getDeviceFingerprint() {
        // Create a hash of system info without exposing personal data
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            // Don't include hostname, username, or other identifying info
        };
        return crypto.createHash('sha256')
            .update(JSON.stringify(systemInfo))
            .digest('hex')
            .substring(0, 16);
    }
    
    /**
     * Register identity on Omega Network blockchain
     */
    async registerIdentityOnChain(omegaId, address, deviceFingerprint) {
        try {
            if (!this.wallet || !this.provider) {
                throw new Error('Provider not initialized');
            }
            
            if (!this.identityABI) {
                throw new Error('Identity Registry ABI not loaded');
            }
            
            // Create contract instance
            const identityContract = new ethers.Contract(
                this.identityContractAddress,
                this.identityABI,
                this.wallet
            );
            
            // Check if identity already exists
            const hasIdentity = await identityContract.hasIdentity(address);
            if (hasIdentity) {
                console.log('Identity already exists for this address');
                return true;
            }
            
            // Check if Omega ID is available
            const isAvailable = await identityContract.isOmegaIdAvailable(omegaId);
            if (!isAvailable) {
                throw new Error('Omega ID already taken');
            }
            
            // Register identity
            console.log('Registering identity on Omega Network...', { omegaId, address, deviceFingerprint });
            const tx = await identityContract.registerIdentity(omegaId, deviceFingerprint);
            
            console.log('Transaction sent, waiting for confirmation...', tx.hash);
            await tx.wait();
            
            console.log('Identity registered successfully!', tx.hash);
            return true;
        } catch (error) {
            console.error('Failed to register identity on chain:', error);
            throw error;
        }
    }
    
    /**
     * Get current identity
     */
    getIdentity() {
        return this.identity;
    }
    
    /**
     * Check if identity exists
     */
    hasIdentity() {
        return this.identity !== null;
    }
    
    /**
     * Load identity from disk
     */
    loadIdentity() {
        try {
            const identityFile = path.join(this.identityPath, 'identity.json');
            if (fs.existsSync(identityFile)) {
                this.identity = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
            }
        } catch (error) {
            console.error('Failed to load identity:', error);
        }
    }
    
    /**
     * Sync document hash to Omega Network
     */
    async syncDocumentHash(documentId, documentHash, metadata = {}) {
        try {
            if (!this.wallet || !this.provider) {
                throw new Error('Provider not initialized. Please unlock your wallet.');
            }
            
            if (!this.identity) {
                throw new Error('Identity not initialized. Please register your Omega OS identity first.');
            }
            
            if (!this.syncContractAddress || this.syncContractAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Document Sync contract not deployed. Please deploy the contract first.');
            }
            
            if (!this.syncABI) {
                throw new Error('Document Sync ABI not loaded');
            }
            
            // Create contract instance
            const syncContract = new ethers.Contract(
                this.syncContractAddress,
                this.syncABI,
                this.wallet
            );
            
            // Extract metadata
            const fileName = metadata.name || documentId;
            const documentType = metadata.type || 'file';
            
            // Call syncDocument function
            console.log('Syncing document to Omega Network...', { 
                omegaId: this.identity.omegaId, 
                documentId, 
                documentHash,
                fileName,
                documentType
            });
            
            const tx = await syncContract.syncDocument(
                documentId,
                documentHash,
                this.identity.omegaId,
                fileName,
                documentType
            );
            
            console.log('Document sync transaction sent, waiting for confirmation...', tx.hash);
            const receipt = await tx.wait();
            
            console.log('Document synced successfully!', tx.hash);
            return {
                success: true,
                txHash: tx.hash,
                timestamp: Date.now(),
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Failed to sync document:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get synced documents for this identity
     */
    async getSyncedDocuments() {
        try {
            if (!this.identity) {
                return [];
            }
            
            if (!this.provider) {
                console.warn('Provider not initialized, cannot fetch synced documents');
                return [];
            }
            
            if (!this.syncContractAddress || this.syncContractAddress === '0x0000000000000000000000000000000000000000') {
                console.warn('Document Sync contract not deployed');
                return [];
            }
            
            if (!this.syncABI) {
                console.warn('Document Sync ABI not loaded');
                return [];
            }
            
            // Create read-only contract instance
            const syncContract = new ethers.Contract(
                this.syncContractAddress,
                this.syncABI,
                this.provider
            );
            
            // Get all document IDs for this Omega ID
            const documentIds = await syncContract.getDocuments(this.identity.omegaId);
            
            // Fetch details for each document
            const documents = [];
            for (const docId of documentIds) {
                try {
                    const doc = await syncContract.getDocument(docId);
                    documents.push({
                        documentId: docId,
                        documentHash: doc.documentHash,
                        fileName: doc.fileName,
                        documentType: doc.documentType,
                        timestamp: Number(doc.timestamp) * 1000, // Convert to milliseconds
                        exists: doc.exists
                    });
                } catch (err) {
                    console.warn(`Failed to fetch document ${docId}:`, err);
                }
            }
            
            // Sort by timestamp (newest first)
            documents.sort((a, b) => b.timestamp - a.timestamp);
            
            return documents;
        } catch (error) {
            console.error('Failed to get synced documents:', error);
            return [];
        }
    }
    
    /**
     * Check if user has active license (Omega OS Pro)
     */
    async checkLicense() {
        try {
            if (!this.identity) {
                return { 
                    hasLicense: false, 
                    licenseType: 'None',
                    reason: 'Identity not initialized' 
                };
            }
            
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                return { 
                    hasLicense: false, 
                    licenseType: 'None',
                    reason: 'Licensing contract not deployed' 
                };
            }
            
            if (!this.provider) {
                return { 
                    hasLicense: false, 
                    licenseType: 'None',
                    reason: 'Provider not initialized' 
                };
            }
            
            if (!this.licensingABI) {
                return { 
                    hasLicense: false, 
                    licenseType: 'None',
                    reason: 'Licensing ABI not loaded' 
                };
            }
            
            // Create read-only contract instance
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.provider
            );
            
            // Check for active license
            const [hasLicense, licenseType, expiryTime] = await licensingContract.hasActiveLicense(
                this.identity.omegaId
            );
            
            return {
                hasLicense,
                licenseType: licenseType === 1 ? 'Staked' : licenseType === 2 ? 'Purchased' : 'None',
                expiryTime: expiryTime > 0 ? Number(expiryTime) * 1000 : null, // Convert to milliseconds
                omegaId: this.identity.omegaId
            };
        } catch (error) {
            console.error('Failed to check license:', error);
            return { 
                hasLicense: false, 
                licenseType: 'None',
                reason: error.message 
            };
        }
    }
    
    /**
     * Get license details
     */
    async getLicenseDetails() {
        try {
            if (!this.identity) {
                return null;
            }
            
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                return null;
            }
            
            if (!this.provider || !this.licensingABI) {
                return null;
            }
            
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.provider
            );
            
            const [licenseType, stakedAmount, purchaseAmount, startTime, expiryTime, isActive] = 
                await licensingContract.getLicense(this.identity.omegaId);
            
            return {
                licenseType: licenseType === 1 ? 'Staked' : licenseType === 2 ? 'Purchased' : 'None',
                stakedAmount: stakedAmount.toString(),
                purchaseAmount: purchaseAmount.toString(),
                startTime: Number(startTime) * 1000,
                expiryTime: expiryTime > 0 ? Number(expiryTime) * 1000 : null,
                isActive
            };
        } catch (error) {
            console.error('Failed to get license details:', error);
            return null;
        }
    }
    
    /**
     * Get pricing information
     */
    async getLicensePricing() {
        try {
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                return {
                    stakingAmount: ethers.parseEther('1000').toString(), // Default: 1000 OMEGA
                    purchaseAmount: ethers.parseEther('10000').toString(), // Default: 10000 OMEGA
                    stakingPeriod: 30 * 24 * 60 * 60 // 30 days in seconds
                };
            }
            
            if (!this.provider || !this.licensingABI) {
                return {
                    stakingAmount: ethers.parseEther('1000').toString(),
                    purchaseAmount: ethers.parseEther('10000').toString(),
                    stakingPeriod: 30 * 24 * 60 * 60
                };
            }
            
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.provider
            );
            
            const [stakingAmount, purchaseAmount, stakingPeriod] = await Promise.all([
                licensingContract.stakingAmount(),
                licensingContract.purchaseAmount(),
                licensingContract.stakingPeriod()
            ]);
            
            return {
                stakingAmount: stakingAmount.toString(),
                purchaseAmount: purchaseAmount.toString(),
                stakingPeriod: Number(stakingPeriod)
            };
        } catch (error) {
            console.error('Failed to get license pricing:', error);
            return {
                stakingAmount: ethers.parseEther('1000').toString(),
                purchaseAmount: ethers.parseEther('10000').toString(),
                stakingPeriod: 30 * 24 * 60 * 60
            };
        }
    }
    
    /**
     * Stake tokens for 30-day license
     */
    async stakeForLicense() {
        try {
            if (!this.wallet || !this.provider) {
                throw new Error('Provider not initialized. Please unlock your wallet.');
            }
            
            if (!this.identity) {
                throw new Error('Identity not initialized. Please register your Omega OS identity first.');
            }
            
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Licensing contract not deployed.');
            }
            
            if (!this.licensingABI) {
                throw new Error('Licensing ABI not loaded');
            }
            
            // Get staking amount
            const pricing = await this.getLicensePricing();
            const stakingAmount = BigInt(pricing.stakingAmount);
            
            // Create contract instance
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.wallet
            );
            
            console.log('Staking for license...', { 
                omegaId: this.identity.omegaId, 
                stakingAmount: ethers.formatEther(stakingAmount) + ' OMEGA'
            });
            
            // Call stakeForLicense function
            const tx = await licensingContract.stakeForLicense(
                this.identity.omegaId,
                { value: stakingAmount }
            );
            
            console.log('Staking transaction sent, waiting for confirmation...', tx.hash);
            const receipt = await tx.wait();
            
            console.log('License staked successfully!', tx.hash);
            return {
                success: true,
                txHash: tx.hash,
                timestamp: Date.now(),
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Failed to stake for license:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Purchase lifetime license
     */
    async purchaseLicense() {
        try {
            if (!this.wallet || !this.provider) {
                throw new Error('Provider not initialized. Please unlock your wallet.');
            }
            
            if (!this.identity) {
                throw new Error('Identity not initialized. Please register your Omega OS identity first.');
            }
            
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Licensing contract not deployed.');
            }
            
            if (!this.licensingABI) {
                throw new Error('Licensing ABI not loaded');
            }
            
            // Get purchase amount
            const pricing = await this.getLicensePricing();
            const purchaseAmount = BigInt(pricing.purchaseAmount);
            
            // Create contract instance
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.wallet
            );
            
            console.log('Purchasing lifetime license...', { 
                omegaId: this.identity.omegaId, 
                purchaseAmount: ethers.formatEther(purchaseAmount) + ' OMEGA'
            });
            
            // Call purchaseLicense function
            const tx = await licensingContract.purchaseLicense(
                this.identity.omegaId,
                { value: purchaseAmount }
            );
            
            console.log('Purchase transaction sent, waiting for confirmation...', tx.hash);
            const receipt = await tx.wait();
            
            console.log('License purchased successfully!', tx.hash);
            return {
                success: true,
                txHash: tx.hash,
                timestamp: Date.now(),
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Failed to purchase license:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Withdraw staked tokens (after license expires)
     */
    async withdrawStake() {
        try {
            if (!this.wallet || !this.provider) {
                throw new Error('Provider not initialized. Please unlock your wallet.');
            }
            
            if (!this.identity) {
                throw new Error('Identity not initialized.');
            }
            
            if (!this.licensingContractAddress || this.licensingContractAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Licensing contract not deployed.');
            }
            
            if (!this.licensingABI) {
                throw new Error('Licensing ABI not loaded');
            }
            
            const licensingContract = new ethers.Contract(
                this.licensingContractAddress,
                this.licensingABI,
                this.wallet
            );
            
            console.log('Withdrawing staked tokens...', { omegaId: this.identity.omegaId });
            
            const tx = await licensingContract.withdrawStake(this.identity.omegaId);
            console.log('Withdrawal transaction sent, waiting for confirmation...', tx.hash);
            const receipt = await tx.wait();
            
            console.log('Stake withdrawn successfully!', tx.hash);
            return {
                success: true,
                txHash: tx.hash,
                timestamp: Date.now(),
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Failed to withdraw stake:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Authenticate using identity (secure login)
     */
    async authenticate(message) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not initialized');
            }
            
            if (!this.identity) {
                throw new Error('Identity not initialized');
            }
            
            // Sign message with wallet
            const signature = await this.wallet.signMessage(message);
            
            return {
                success: true,
                omegaId: this.identity.omegaId,
                address: this.identity.address,
                signature: signature,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Authentication failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Verify authentication signature
     */
    async verifySignature(message, signature, address) {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }
}

module.exports = OmegaIdentityManager;


