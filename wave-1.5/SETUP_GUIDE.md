# Wave 1.5 Anti-Bot Setup Guide

This guide walks you through setting up the complete anti-bot protection system for Wave 1.5.

## What's Been Implemented

✅ **On-Chain Protections** (Smart Contract):
- Wallet age requirement (7 days minimum)
- Minimum balance requirement (0.01 ETH)
- Rate limiting per block (max 10 claims per block)

✅ **Frontend Protections**:
- hCaptcha verification
- Backend API integration
- Eligibility checking before claim

✅ **Backend API**:
- IP rate limiting (max 2 claims per IP)
- Wallet transaction count verification (min 3 transactions)
- Claim recording and statistics

## Step 1: Deploy the Secure Contract

The contract has been updated with anti-bot protections. Deploy it using the existing deployment script:

```bash
cd wave-1.5
$env:PRIVATE_KEY="your_private_key"
npx hardhat run scripts/deploy.js --network omega
```

**Important**: After deployment, update `index.html` with the new contract address.

## Step 2: Set Up Backend API

1. Navigate to backend directory:
```bash
cd wave-1.5/backend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set environment variables:
```bash
# Windows PowerShell
$env:PORT=3000
$env:ADMIN_SECRET="your-secret-key"

# Linux/Mac
export PORT=3000
export ADMIN_SECRET="your-secret-key"
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The API will run on `http://localhost:3000` by default.

## Step 3: Configure Frontend

1. **Update API URL** in `index.html`:
   - Find the `API_BASE_URL` constant (around line 470)
   - Update it to your production API URL:
   ```javascript
   const API_BASE_URL = 'https://your-api-domain.com';
   ```

2. **Get hCaptcha Site Key**:
   - Sign up at https://www.hcaptcha.com/
   - Create a site and get your site key
   - Replace the test key in `index.html`:
   ```javascript
   const siteKey = 'YOUR_REAL_HCAPTCHA_SITE_KEY'; // Replace test key
   ```

3. **Update Contract Address** (if redeployed):
   - Update `CONTRACT_ADDRESS` in `index.html` with your deployed contract address

## Step 4: Deploy Frontend

Deploy `index.html` to your web hosting (e.g., GitHub Pages, Netlify, Vercel, or your own server).

## Step 5: Configure Contract Settings (Optional)

After deployment, you can adjust contract settings using owner functions:

```javascript
// Connect to contract with owner wallet
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ownerSigner);

// Adjust wallet age requirement (0 = disabled)
await contract.setMinWalletAgeDays(7);

// Adjust minimum balance (0 = disabled)
await contract.setMinimumBalance(ethers.parseEther("0.01"));

// Adjust rate limiting
await contract.setMaxClaimsPerBlock(10);

// Disable minimum balance requirement if needed
await contract.setRequireMinimumBalance(false);
```

## Testing

### Test On-Chain Eligibility

```javascript
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const [eligible, reason] = await contract.checkEligibility(walletAddress);
console.log(eligible, reason);
```

### Test Backend API

```bash
# Health check
curl http://localhost:3000/api/health

# Verify IP
curl -X POST http://localhost:3000/api/verify-ip

# Verify wallet
curl -X POST http://localhost:3000/api/verify-wallet \
  -H "Content-Type: application/json" \
  -d '{"address":"0x..."}'
```

## Monitoring

### Check Backend Statistics

```bash
curl http://localhost:3000/api/stats
```

### Check Contract Statistics

```javascript
const totalClaims = await contract.totalClaims();
console.log("Total claims:", totalClaims.toString());
```

## Troubleshooting

### CAPTCHA Not Working
- Check browser console for errors
- Verify hCaptcha site key is correct
- Ensure hCaptcha script is loaded

### Backend API Not Responding
- Check if server is running: `curl http://localhost:3000/api/health`
- Check CORS settings if frontend is on different domain
- Verify RPC URL is correct in `backend/server.js`

### Contract Rejects Claims
- Check wallet age: Must be 7+ days old (or adjust `minWalletAgeDays`)
- Check balance: Must have 0.01 ETH (or adjust `minimumBalance`)
- Check rate limit: Max 10 claims per block
- Use `checkEligibility()` function to see exact reason

### IP Rate Limiting Too Strict
- Adjust `MAX_CLAIMS_PER_IP` in `backend/server.js`
- Reset IP claims: `POST /api/admin/reset-ip` with admin secret

## Production Checklist

- [ ] Deploy secure contract
- [ ] Update contract address in frontend
- [ ] Deploy backend API to production server
- [ ] Update API_BASE_URL in frontend
- [ ] Get real hCaptcha site key and update frontend
- [ ] Configure environment variables on production server
- [ ] Set up database (Redis/PostgreSQL) for backend persistence
- [ ] Add authentication for admin endpoints
- [ ] Set up monitoring and alerts
- [ ] Test complete flow end-to-end
- [ ] Fund contract with tOmega tokens

## Security Notes

1. **Private Keys**: Never commit private keys to git
2. **Admin Secret**: Use strong, random admin secret
3. **CORS**: Configure CORS properly for production
4. **Rate Limiting**: Consider adding rate limiting middleware
5. **Database**: Use persistent storage in production (not in-memory)
6. **Monitoring**: Set up logging and monitoring

## Next Steps

If botting continues, consider:
- Twitter verification integration
- Merkle tree whitelist
- More strict wallet age requirements
- Additional on-chain checks
