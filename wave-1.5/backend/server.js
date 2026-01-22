/**
 * Backend API for Anti-Bot Protection
 * 
 * Features:
 * - IP-based rate limiting (max 2 claims per IP)
 * - Wallet transaction count verification
 * - Claim recording and statistics
 * 
 * For production, add:
 * - Database persistence (Redis/PostgreSQL)
 * - Authentication/API keys
 * - Better error handling
 * - Logging
 * - Rate limiting middleware
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy for accurate IP detection (if behind reverse proxy)
app.set('trust proxy', true);

// In-memory storage (use Redis/DB in production)
const ipClaims = new Map();
const walletVerifications = new Map();

// Configuration
const MAX_CLAIMS_PER_IP = 2;
const MIN_TRANSACTION_COUNT = 3;
const RPC_URL = 'https://0x4e454228.rpc.aurora-cloud.dev';

// Provider for blockchain queries
const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        config: {
            maxClaimsPerIP: MAX_CLAIMS_PER_IP,
            minTransactionCount: MIN_TRANSACTION_COUNT
        }
    });
});

/**
 * Verify if an IP can make a claim
 */
app.post('/api/verify-ip', (req, res) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const count = ipClaims.get(ip) || 0;
        
        if (count >= MAX_CLAIMS_PER_IP) {
            return res.json({ 
                allowed: false, 
                reason: `Maximum ${MAX_CLAIMS_PER_IP} claims per IP address exceeded`,
                remaining: 0,
                currentCount: count
            });
        }
        
        const remaining = MAX_CLAIMS_PER_IP - count;
        res.json({ 
            allowed: true, 
            remaining,
            currentCount: count,
            maxAllowed: MAX_CLAIMS_PER_IP
        });
    } catch (error) {
        console.error('Error in verify-ip:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Verify wallet transaction count and eligibility
 */
app.post('/api/verify-wallet', async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address || !ethers.isAddress(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        
        const normalizedAddress = address.toLowerCase();
        
        // Get transaction count (nonce = number of transactions)
        const txCount = await provider.getTransactionCount(normalizedAddress, 'latest');
        
        if (txCount < MIN_TRANSACTION_COUNT) {
            return res.json({
                eligible: false,
                reason: `Wallet must have at least ${MIN_TRANSACTION_COUNT} transactions. Current: ${txCount}`,
                transactionCount: txCount,
                required: MIN_TRANSACTION_COUNT
            });
        }
        
        // Check wallet balance (optional check)
        const balance = await provider.getBalance(normalizedAddress);
        const hasBalance = balance > ethers.parseEther('0.001'); // 0.001 ETH minimum
        
        res.json({
            eligible: true,
            transactionCount: txCount,
            hasBalance,
            balance: ethers.formatEther(balance),
            address: normalizedAddress
        });
        
    } catch (error) {
        console.error('Error verifying wallet:', error);
        res.status(500).json({ error: 'Failed to verify wallet: ' + error.message });
    }
});

/**
 * Record a successful claim (call this after on-chain claim)
 */
app.post('/api/record-claim', (req, res) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'];
        const { address, txHash } = req.body;
        
        if (!address || !txHash) {
            return res.status(400).json({ error: 'Missing address or txHash' });
        }
        
        // Increment IP claim count
        const currentCount = ipClaims.get(ip) || 0;
        ipClaims.set(ip, currentCount + 1);
        
        // Record wallet verification
        walletVerifications.set(address.toLowerCase(), {
            ip,
            txHash,
            timestamp: Date.now()
        });
        
        res.json({ 
            success: true,
            ip,
            address: address.toLowerCase(),
            txHash
        });
    } catch (error) {
        console.error('Error recording claim:', error);
        res.status(500).json({ error: 'Failed to record claim' });
    }
});

/**
 * Get claim statistics
 */
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalIPs: ipClaims.size,
            totalWallets: walletVerifications.size,
            ipClaims: Object.fromEntries(ipClaims),
            config: {
                maxClaimsPerIP: MAX_CLAIMS_PER_IP,
                minTransactionCount: MIN_TRANSACTION_COUNT
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * Reset IP claims (admin function - add auth in production)
 */
app.post('/api/admin/reset-ip', (req, res) => {
    try {
        const { ip, secret } = req.body;
        
        // Simple secret check (use proper auth in production)
        if (secret !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (ip) {
            ipClaims.delete(ip);
            res.json({ success: true, message: `Reset claims for IP: ${ip}` });
        } else {
            ipClaims.clear();
            res.json({ success: true, message: 'Reset all IP claims' });
        }
    } catch (error) {
        console.error('Error resetting IP:', error);
        res.status(500).json({ error: 'Failed to reset IP' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Anti-bot API server running on port ${PORT}`);
    console.log(`📊 Max claims per IP: ${MAX_CLAIMS_PER_IP}`);
    console.log(`📊 Min transaction count: ${MIN_TRANSACTION_COUNT}`);
    console.log(`🌐 RPC URL: ${RPC_URL}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   POST /api/verify-ip - Verify IP rate limit`);
    console.log(`   POST /api/verify-wallet - Verify wallet eligibility`);
    console.log(`   POST /api/record-claim - Record successful claim`);
    console.log(`   GET  /api/stats - Get statistics`);
    console.log(`   POST /api/admin/reset-ip - Reset IP claims (admin)`);
});
