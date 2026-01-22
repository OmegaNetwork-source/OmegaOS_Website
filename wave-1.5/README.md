# Wave 1.5 Airdrop

This is the Wave 1.5 airdrop claim system with **enhanced anti-bot protections** to prevent abuse.

## 🛡️ Anti-Bot Features

- **On-Chain Protections**:
  - Wallet age requirement (7 days minimum)
  - Minimum balance requirement (0.01 ETH)
  - Rate limiting per block (max 10 claims per block)
  
- **Frontend Protections**:
  - hCaptcha verification
  - Backend API integration
  
- **Backend Protections**:
  - IP rate limiting (max 2 claims per IP)
  - Wallet transaction count verification (min 3 transactions)

## Structure

- **`contracts/ClaimDistributor15.sol`** - Smart contract with anti-bot protections
- **`contracts/tOmega.sol`** - tOmega ERC20 token contract (same as Wave 1)
- **`index.html`** - Frontend claim page with CAPTCHA and API integration
- **`backend/`** - Backend API server for IP rate limiting and wallet verification
  - `server.js` - Express API server
  - `package.json` - Backend dependencies
  - `README.md` - Backend documentation

## Contract Details

### ClaimDistributor15
- **Functionality**: Enhanced version with anti-bot protections
  - Users can claim 1000 tOmega tokens once
  - Prevents double claiming via `hasClaimed` mapping
  - **Wallet age requirement**: 7 days minimum (configurable)
  - **Minimum balance**: 0.01 ETH required (configurable)
  - **Rate limiting**: Max 10 claims per block
  - Owner can adjust settings and withdraw leftover tokens
- **tOmega Token Address**: `0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51` (same as Wave 1)
- **Claim Amount**: 1000 tOmega tokens per user

## Quick Start

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for complete setup instructions.

### Quick Deployment

1. **Deploy Contract**:
   ```bash
   cd wave-1.5
   $env:PRIVATE_KEY="your_private_key"
   npx hardhat run scripts/deploy.js --network omega
   ```

2. **Set Up Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Configure Frontend**:
   - Update `CONTRACT_ADDRESS` in `index.html`
   - Update `API_BASE_URL` in `index.html`
   - Get hCaptcha site key and update in `index.html`

4. **Deploy Frontend**:
   - Host `index.html` on your web server

## Differences from Wave 1

- **Contract Name**: `ClaimDistributor15` (vs `ClaimDistributor`)
- **Watermark**: "WAVE 1.5" (vs "WAVE 1")
- **Tweet Text**: References "Wave 1.5" in the tweet
- **Download Filename**: `omega-airdrop-claim-wave15.png` (vs `omega-airdrop-claim.png`)

## Network

- **Chain**: Omega Network (Chain ID: 1313161768)
- **RPC**: `https://0x4e454228.rpc.aurora-cloud.dev`

## Notes

- Users who claimed in Wave 1 can also claim in Wave 1.5 (separate contracts)
- The same tOmega token is used for both waves
- Each wave has its own `hasClaimed` mapping, so users can claim from both
