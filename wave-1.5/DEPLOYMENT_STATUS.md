# Deployment Status

## Current Status

### Contract Deployment
- **Transaction Hash**: `0x222b4306ccf818af58481dfa61f3bedfab39c98d6d059a11af25da3e232d0cf0`
- **Status**: ⏳ Pending confirmation
- **Deployer**: `0x84648D72E9e9882bd366df6898D66c93780FDb2a`
- **Network**: Omega Network (Chain ID: 1313161768)

### Next Steps

1. **Check Transaction Status**:
   ```bash
   node check-deployment.js
   ```

2. **Once Contract is Deployed**:
   - Update `index.html` with new contract address:
     ```bash
     node update-contract-address.js <contract_address>
     ```
   - Or manually update line 470 in `index.html`

3. **Start Backend**:
   ```bash
   # Windows
   .\start-backend.ps1
   
   # Linux/Mac
   ./start-backend.sh
   ```

4. **Configure Frontend**:
   - Update `API_BASE_URL` in `index.html` (line ~480)
   - Get hCaptcha site key from https://www.hcaptcha.com/
   - Update `siteKey` in `index.html` (line ~510)

## Contract Features

The new contract includes:
- ✅ Wallet age requirement (7 days)
- ✅ Minimum balance check (0.01 ETH)
- ✅ Rate limiting (10 claims per block)
- ✅ Eligibility checking function

## Backend Setup

Backend dependencies are installed. To start:
```bash
cd backend
npm start
```

The API will run on `http://localhost:3000` by default.
