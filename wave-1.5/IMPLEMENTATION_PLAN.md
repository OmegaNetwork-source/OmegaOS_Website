# Implementation Plan: Anti-Bot Protection for Wave 1.5

## Quick Implementation (1-2 hours)

### 1. Add CAPTCHA to Frontend
- **File**: `wave-1.5/index.html`
- **Action**: Add hCaptcha or reCAPTCHA before claim button
- **Effort**: 30 minutes
- **Effectiveness**: Blocks basic bots

### 2. Add Wallet Age Check (On-Chain)
- **File**: `wave-1.5/contracts/ClaimDistributor15Secure.sol` (already created)
- **Action**: Deploy new secure contract instead of basic one
- **Effort**: 1 hour
- **Effectiveness**: High - prevents fresh wallet creation

## Medium Implementation (4-8 hours)

### 3. Backend API for IP Rate Limiting
- **New File**: `wave-1.5/backend/rate-limit.js` (Node.js API)
- **Action**: Create simple Express API that tracks IP addresses
- **Features**:
  - Track claims per IP (max 2 per IP)
  - Return verification token
  - Frontend calls API before allowing claim
- **Effort**: 4-6 hours
- **Effectiveness**: Medium - slows down bots

### 4. Transaction History Verification
- **File**: Backend API extension
- **Action**: Query blockchain for wallet transaction count
- **Features**:
  - Check wallet has 3+ transactions
  - Verify transactions are legitimate (not just self-transfers)
- **Effort**: 2-4 hours
- **Effectiveness**: High - shows wallet is "real"

## Advanced Implementation (1-2 weeks)

### 5. Twitter Verification Integration
- **New File**: `wave-1.5/backend/twitter-verify.js`
- **Action**: Integrate Twitter API
- **Features**:
  - Verify Twitter account age (30+ days)
  - Verify follower count (10+ followers)
  - Link Twitter to wallet address
  - Store verification on-chain or in database
- **Effort**: 1-2 weeks
- **Effectiveness**: Very High

## Recommended Immediate Action

**Option 1: Quick Fix (Today)**
1. Deploy `ClaimDistributor15Secure.sol` with wallet age requirement (7 days)
2. Add CAPTCHA to frontend
3. Monitor and adjust settings as needed

**Option 2: Balanced Approach (This Week)**
1. Deploy secure contract
2. Add CAPTCHA
3. Create simple backend API for IP rate limiting
4. Add transaction count check via backend

**Option 3: Maximum Security (2 Weeks)**
1. All of Option 2
2. Add Twitter verification
3. Implement merkle tree whitelist if needed

## Code Examples

### Frontend CAPTCHA Integration
```html
<!-- Add before claim button -->
<div id="hcaptcha-container"></div>
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>
```

### Backend Rate Limiting (Express.js)
```javascript
const express = require('express');
const app = express();

const ipClaims = new Map();
const MAX_CLAIMS_PER_IP = 2;

app.post('/verify-claim', (req, res) => {
  const ip = req.ip;
  const count = ipClaims.get(ip) || 0;
  
  if (count >= MAX_CLAIMS_PER_IP) {
    return res.json({ allowed: false, reason: 'IP limit exceeded' });
  }
  
  ipClaims.set(ip, count + 1);
  res.json({ allowed: true, token: generateToken() });
});
```

### Transaction Count Check
```javascript
// Using ethers.js
async function getTransactionCount(address) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const txCount = await provider.getTransactionCount(address);
  return txCount;
}
```

## Testing Strategy

1. **Test with fresh wallet**: Should be rejected
2. **Test with old wallet**: Should be accepted
3. **Test rate limiting**: Multiple claims from same IP
4. **Test CAPTCHA**: Verify it blocks automated requests
5. **Monitor on-chain**: Track claim patterns

## Monitoring & Adjustments

- Monitor claim patterns daily
- Track wallet ages of claimers
- Adjust `minWalletAgeDays` if too strict/loose
- Adjust `maxClaimsPerBlock` based on network capacity
- Consider disabling certain checks if legitimate users are blocked
