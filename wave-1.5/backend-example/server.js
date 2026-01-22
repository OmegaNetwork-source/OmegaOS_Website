/**
 * Simple Backend API for Anti-Bot Protection
 * 
 * This is a basic example. For production, add:
 * - Database persistence (Redis/PostgreSQL)
 * - Rate limiting middleware
 * - Authentication/API keys
 * - Error handling
 * - Logging
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

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
 * Verify if an IP can make a claim
 */
app.post('/api/verify-ip', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const count = ipClaims.get(ip) || 0;
  
  if (count >= MAX_CLAIMS_PER_IP) {
    return res.json({ 
      allowed: false, 
      reason: 'Maximum claims per IP address exceeded',
      remaining: 0
    });
  }
  
  const remaining = MAX_CLAIMS_PER_IP - count;
  res.json({ 
    allowed: true, 
    remaining,
    token: generateVerificationToken(ip)
  });
});

/**
 * Verify wallet transaction count
 */
app.post('/api/verify-wallet', async (req, res) => {
  const { address } = req.body;
  
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  
  try {
    // Get transaction count (nonce = number of transactions)
    const txCount = await provider.getTransactionCount(address, 'latest');
    
    if (txCount < MIN_TRANSACTION_COUNT) {
      return res.json({
        eligible: false,
        reason: `Wallet must have at least ${MIN_TRANSACTION_COUNT} transactions`,
        transactionCount: txCount,
        required: MIN_TRANSACTION_COUNT
      });
    }
    
    // Check wallet balance (optional)
    const balance = await provider.getBalance(address);
    const hasBalance = balance > ethers.parseEther('0.001'); // 0.001 ETH minimum
    
    res.json({
      eligible: true,
      transactionCount: txCount,
      hasBalance,
      balance: ethers.formatEther(balance)
    });
    
  } catch (error) {
    console.error('Error verifying wallet:', error);
    res.status(500).json({ error: 'Failed to verify wallet' });
  }
});

/**
 * Record a successful claim (call this after on-chain claim)
 */
app.post('/api/record-claim', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'];
  const { address, txHash } = req.body;
  
  // Increment IP claim count
  const currentCount = ipClaims.get(ip) || 0;
  ipClaims.set(ip, currentCount + 1);
  
  // Record wallet verification
  walletVerifications.set(address.toLowerCase(), {
    ip,
    txHash,
    timestamp: Date.now()
  });
  
  res.json({ success: true });
});

/**
 * Get claim statistics
 */
app.get('/api/stats', (req, res) => {
  res.json({
    totalIPs: ipClaims.size,
    totalWallets: walletVerifications.size,
    ipClaims: Object.fromEntries(ipClaims)
  });
});

/**
 * Reset IP claims (admin function - add auth in production)
 */
app.post('/api/admin/reset-ip', (req, res) => {
  const { ip } = req.body;
  if (ip) {
    ipClaims.delete(ip);
    res.json({ success: true, message: `Reset claims for IP: ${ip}` });
  } else {
    ipClaims.clear();
    res.json({ success: true, message: 'Reset all IP claims' });
  }
});

// Helper function to generate verification token
function generateVerificationToken(ip) {
  return Buffer.from(`${ip}-${Date.now()}`).toString('base64');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Anti-bot API server running on port ${PORT}`);
  console.log(`Max claims per IP: ${MAX_CLAIMS_PER_IP}`);
  console.log(`Min transaction count: ${MIN_TRANSACTION_COUNT}`);
});
