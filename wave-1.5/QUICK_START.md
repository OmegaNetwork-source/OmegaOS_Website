# Quick Start Guide - Wave 1.5 Anti-Bot Setup

## ✅ What's Been Done

1. **✅ Contract Updated**: `ClaimDistributor15.sol` now has anti-bot protections
2. **✅ Frontend Updated**: CAPTCHA and backend API integration added
3. **✅ Backend Created**: API server with IP rate limiting and wallet verification
4. **✅ Dependencies Installed**: Backend npm packages installed

## ⏳ Current Status

### Contract Deployment
- **Transaction Hash**: `0x222b4306ccf818af58481dfa61f3bedfab39c98d6d059a11af25da3e232d0cf0`
- **Status**: Pending confirmation
- **Check Status**: `node check-deployment.js`
- **Explorer**: https://explorer.omeganetwork.co/tx/0x222b4306ccf818af58481dfa61f3bedfab39c98d6d059a11af25da3e232d0cf0

## 🚀 Next Steps

### 1. Wait for Contract Deployment

The contract deployment transaction has been sent. Check status:
```bash
node check-deployment.js
```

Or monitor continuously:
```powershell
.\monitor-deployment.ps1
```

### 2. Once Contract is Deployed

Update the contract address in `index.html`:
```bash
node update-contract-address.js <contract_address>
```

Or manually edit `index.html` line 470:
```javascript
const CONTRACT_ADDRESS = "0x..."; // Replace with deployed address
```

### 3. Start Backend API

```powershell
# Windows
.\start-backend.ps1

# Or manually:
cd backend
npm start
```

The API will run on `http://localhost:3000`

### 4. Configure Frontend

Edit `index.html`:

1. **Update API URL** (line ~480):
   ```javascript
   const API_BASE_URL = 'https://your-api-domain.com'; // For production
   ```

2. **Get hCaptcha Key**:
   - Go to https://www.hcaptcha.com/
   - Sign up and create a site
   - Get your site key
   - Update in `index.html` (line ~510):
   ```javascript
   const siteKey = 'YOUR_REAL_HCAPTCHA_SITE_KEY';
   ```

### 5. Deploy Frontend

Upload `index.html` to your web hosting.

## 📋 Configuration Summary

### Contract Settings (After Deployment)
- Wallet age: 7 days (adjustable by owner)
- Minimum balance: 0.01 ETH (adjustable by owner)
- Rate limit: 10 claims per block (adjustable by owner)

### Backend Settings
- Max claims per IP: 2
- Min transaction count: 3
- Port: 3000 (configurable via .env)

### Frontend Settings
- API URL: Update for production
- hCaptcha: Get real key from hcaptcha.com

## 🧪 Testing

### Test Backend
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

### Test Contract
```javascript
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const [eligible, reason] = await contract.checkEligibility(walletAddress);
console.log(eligible, reason);
```

## 📞 Support

If the contract deployment is taking too long:
1. Check the transaction on explorer
2. Try redeploying if transaction failed
3. Check network status

For issues:
- Check `DEPLOYMENT_STATUS.md` for current status
- Review `SETUP_GUIDE.md` for detailed instructions
- See `IMPLEMENTATION_SUMMARY.md` for what was implemented
