# Anti-Bot Strategies for Wave 1.5 Airdrop

## Current Problem
- Wave 1 was botted with script-generated wallets
- No restrictions on new/fresh wallets
- Anyone can create unlimited wallets and claim

## Recommended Solutions (Ranked by Effectiveness)

### 🥇 **Tier 1: On-Chain Verification (Most Effective)**

#### 1. **Wallet Age Requirement**
- **Implementation**: Check `block.number` when wallet first received ETH
- **Requirement**: Wallet must be at least X days old (e.g., 7-30 days)
- **Pros**: Prevents freshly created wallets, easy to implement
- **Cons**: Excludes genuinely new users
- **Bypass Difficulty**: High (requires waiting period)

#### 2. **Transaction History Requirement**
- **Implementation**: Require wallet to have made N transactions before claiming
- **Requirement**: Wallet must have at least 3-5 transactions on-chain
- **Pros**: Shows wallet is "real" and not just created for airdrop
- **Cons**: Excludes brand new users
- **Bypass Difficulty**: Medium (costs gas to create fake history)

#### 3. **Minimum Balance Requirement**
- **Implementation**: Wallet must hold minimum ETH/tokens before claiming
- **Requirement**: e.g., 0.01 ETH or some token balance
- **Pros**: Adds cost barrier for bots
- **Cons**: Excludes users without funds
- **Bypass Difficulty**: Low (bot can fund wallets)

#### 4. **Gas Cost Strategy**
- **Implementation**: Require users to pay gas (already required, but can increase)
- **Requirement**: Make claiming cost some gas (already does)
- **Pros**: Each claim costs money
- **Cons**: Hurts legitimate users too
- **Bypass Difficulty**: Low (bot can pay gas)

### 🥈 **Tier 2: Social Verification (Medium Effectiveness)**

#### 5. **Twitter Verification (Already Partially Implemented)**
- **Current**: Users tweet after claiming for Wave 2 eligibility
- **Enhancement**: Require Twitter verification BEFORE claiming
- **Implementation**: 
  - User connects Twitter account
  - Verify account age (e.g., 30+ days old)
  - Verify follower count (e.g., 10+ followers)
  - Store Twitter ID on-chain or in backend
- **Pros**: Harder to create fake Twitter accounts at scale
- **Cons**: Adds friction, requires backend/API
- **Bypass Difficulty**: Medium-High (requires real Twitter accounts)

#### 6. **Discord/Telegram Verification**
- **Implementation**: Require joining Discord/Telegram, verify membership
- **Pros**: Community building, harder to automate
- **Cons**: Requires backend, adds friction
- **Bypass Difficulty**: Medium

### 🥉 **Tier 3: Rate Limiting & Frontend Protection**

#### 7. **IP-Based Rate Limiting**
- **Implementation**: Backend tracks IP addresses, limit 1-2 claims per IP
- **Requirement**: Require backend API call before claim
- **Pros**: Simple to implement
- **Cons**: Easy to bypass with VPNs/proxies
- **Bypass Difficulty**: Low

#### 8. **CAPTCHA (hCaptcha/reCAPTCHA)**
- **Implementation**: Add CAPTCHA before claim button
- **Pros**: Blocks basic bots
- **Cons**: Can be solved by services, adds friction
- **Bypass Difficulty**: Low-Medium

#### 9. **Device Fingerprinting**
- **Implementation**: Track browser fingerprint, limit claims per device
- **Pros**: Harder to bypass than IP
- **Cons**: Privacy concerns, can be bypassed
- **Bypass Difficulty**: Medium

### 🏆 **Tier 4: Advanced On-Chain Solutions**

#### 10. **Merkle Tree Whitelist**
- **Implementation**: Pre-approve addresses, only whitelisted can claim
- **Requirement**: Manual review/approval process
- **Pros**: Most secure, full control
- **Cons**: Not scalable, requires manual work
- **Bypass Difficulty**: Very High (impossible if done right)

#### 11. **Referral System**
- **Implementation**: Require existing user to "vouch" for new user
- **Requirement**: New wallet must be referred by verified user
- **Pros**: Social proof, community growth
- **Cons**: Complex, requires referral tracking
- **Bypass Difficulty**: High

#### 12. **Gradual Release / Time-Locked Claims**
- **Implementation**: Limit claims per block/hour (e.g., max 10 claims/hour)
- **Requirement**: Add time-based restrictions
- **Pros**: Slows down bot farms
- **Cons**: Hurts legitimate users too
- **Bypass Difficulty**: Low (just wait)

#### 13. **Proof of Work / Puzzle**
- **Implementation**: Require solving on-chain puzzle before claim
- **Requirement**: Compute hash, costs gas
- **Pros**: Adds computational cost
- **Cons**: Complex, can be automated
- **Bypass Difficulty**: Low-Medium

## 🎯 **Recommended Combination Approach**

### **Option A: Balanced (Recommended)**
1. **Wallet Age**: Minimum 7 days old
2. **Transaction History**: At least 3 transactions
3. **CAPTCHA**: Frontend protection
4. **IP Rate Limiting**: Backend API (1-2 per IP)
5. **Twitter Verification**: Optional but encouraged (for Wave 2)

### **Option B: Strict (Maximum Security)**
1. **Merkle Tree Whitelist**: Pre-approved addresses only
2. **Twitter Verification**: Required, account must be 30+ days old
3. **Wallet Age**: 14+ days
4. **Transaction History**: 5+ transactions

### **Option C: Light (User-Friendly)**
1. **Wallet Age**: 3 days minimum
2. **CAPTCHA**: Frontend only
3. **IP Rate Limiting**: 2 per IP (via backend)

## 💡 **Implementation Priority**

**Quick Wins (Can implement immediately):**
- ✅ CAPTCHA on frontend
- ✅ IP rate limiting (requires backend)
- ✅ Wallet age check (on-chain)

**Medium-term:**
- Twitter verification integration
- Transaction history requirements
- Backend API for verification

**Long-term:**
- Merkle tree whitelist (if needed)
- Referral system
- Advanced fingerprinting

## 🔧 **Technical Implementation Notes**

### On-Chain Checks (Solidity)
```solidity
// Wallet age check (requires tracking first block)
mapping(address => uint256) public firstSeenBlock;
uint256 public constant MIN_BLOCKS_OLD = 7 * 24 * 60 * 60 / 2; // ~7 days

// Transaction count (requires external oracle or tracking)
// This is harder to do purely on-chain
```

### Backend API (Node.js/Python)
```javascript
// IP rate limiting
const claimsPerIP = new Map();
const MAX_CLAIMS_PER_IP = 2;

// Twitter verification
// Use Twitter API to verify account age/followers
```

### Frontend (JavaScript)
```javascript
// CAPTCHA integration
// hCaptcha or reCAPTCHA before claim button

// Device fingerprinting
// Use libraries like FingerprintJS
```

## 📊 **Cost-Benefit Analysis**

| Solution | Implementation Time | Effectiveness | User Friction | Cost |
|----------|-------------------|---------------|---------------|------|
| Wallet Age | 2-4 hours | High | Low | Free |
| Transaction History | 4-6 hours | High | Medium | Free |
| CAPTCHA | 1 hour | Medium | Low | Free/Low |
| IP Rate Limiting | 4-8 hours | Medium | Low | Low (backend) |
| Twitter Verification | 8-16 hours | High | Medium | Medium (API) |
| Merkle Whitelist | 2-4 hours | Very High | High | Free |
| Referral System | 16+ hours | High | Medium | Free |

## 🚀 **Recommended Next Steps**

1. **Immediate**: Add CAPTCHA to frontend
2. **This Week**: Implement wallet age + transaction history checks
3. **Next Week**: Add backend API for IP rate limiting
4. **Future**: Consider Twitter verification if botting continues
