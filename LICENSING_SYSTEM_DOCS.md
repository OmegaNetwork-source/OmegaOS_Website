# Omega OS Pro Licensing System

## Overview

The Omega OS Pro licensing system enables users to unlock premium features (Omega Productivity apps and AI) through two payment models:
1. **Staking Model**: Stake tokens for time-limited licenses (30 days, renewable)
2. **Purchase Model**: One-time payment for lifetime access

All licensing is managed on-chain via the Omega Network blockchain, ensuring transparency and decentralization.

## Architecture

### Smart Contract: `OmegaLicensing.sol`

The licensing contract is deployed on Omega Network and manages all license operations.

**Key Features:**
- Two license types: `Staked` (30-day renewable) and `Purchased` (lifetime)
- Owner-configurable pricing (staking amount, purchase amount, staking period)
- Automatic license expiry tracking for staked licenses
- Token withdrawal mechanism for expired staked licenses

**Contract Functions:**

#### User Functions
- `stakeForLicense(string omegaId)`: Stake tokens for 30-day license
  - Requires: Staking amount (default: 1,000 OMEGA)
  - Locks tokens for 30 days
  - Can be renewed by staking again (extends expiry from current time)
  
- `purchaseLicense(string omegaId)`: Purchase lifetime license
  - Requires: Purchase amount (default: 10,000 OMEGA)
  - One-time payment, no expiry
  
- `withdrawStake(string omegaId)`: Withdraw staked tokens
  - Only available after license expires
  - Returns locked tokens to user's wallet
  
- `hasActiveLicense(string omegaId)`: Check license status
  - Returns: `(hasLicense, licenseType, expiryTime)`
  
- `getLicense(string omegaId)`: Get full license details
  - Returns: License type, amounts, timestamps, active status

#### Owner Functions (Deployer Only)
- `setStakingAmount(uint256)`: Adjust staking price
- `setPurchaseAmount(uint256)`: Adjust purchase price
- `setStakingPeriod(uint256)`: Adjust license duration (in seconds)
- `withdraw(uint256)`: Withdraw contract balance
- `transferOwnership(address)`: Transfer contract ownership

### Backend Integration: `identity-manager.js`

The `OmegaIdentityManager` class handles all licensing operations:

**Methods:**
- `checkLicense()`: Queries contract for active license status
- `getLicenseDetails()`: Retrieves complete license information
- `getLicensePricing()`: Fetches current pricing from contract
- `stakeForLicense()`: Initiates staking transaction
- `purchaseLicense()`: Initiates purchase transaction
- `withdrawStake()`: Initiates withdrawal transaction

**Flow:**
1. User action triggers method call
2. Method initializes provider with user's wallet
3. Creates contract instance with ABI
4. Calls contract function with appropriate parameters
5. Waits for transaction confirmation
6. Returns result to frontend

### Frontend Integration: `identity.js` & `identity.html`

**UI Components:**
- **License Status Card**: Shows current license status (Active/Not Licensed)
- **License Actions**: Two options displayed when no license:
  - "Stake for License" button (shows current staking price)
  - "Purchase Lifetime License" button (shows current purchase price)
- **License Details**: Shows license information when active:
  - License type (Staked/Purchased)
  - Start date
  - Expiry date (or "Never" for lifetime)
  - Staked amount (for staking licenses)
  - Withdraw button (for expired staking licenses)

**User Flow:**
1. User opens Identity app
2. System checks license status via `checkLicenseStatus()`
3. If no license: Shows staking/purchase options with current prices
4. If active license: Shows license details and expiry information
5. User clicks action button → Confirmation dialog → Transaction sent
6. Wallet prompts for approval → Transaction confirmed on blockchain
7. UI updates to reflect new license status

### IPC Communication

**Main Process (`main.js`):**
- `identity-check-license`: Returns license status
- `identity-get-license-details`: Returns full license information
- `identity-get-license-pricing`: Returns current pricing
- `identity-stake-for-license`: Executes staking transaction
- `identity-purchase-license`: Executes purchase transaction
- `identity-withdraw-stake`: Executes withdrawal transaction

**Preload (`preload.js`):**
Exposes all licensing methods to renderer process via `window.electronAPI`:
- `identityCheckLicense()`
- `identityGetLicenseDetails()`
- `identityGetLicensePricing()`
- `identityStakeForLicense()`
- `identityPurchaseLicense()`
- `identityWithdrawStake()`

## License Types

### Staked License
- **Cost**: 1,000 OMEGA tokens (configurable by owner)
- **Duration**: 30 days (configurable by owner)
- **Renewal**: Stake again before expiry to extend license
- **Token Status**: Tokens are locked in contract during license period
- **Withdrawal**: Tokens can be withdrawn after license expires
- **Use Case**: Users who want temporary access or prefer lower upfront cost

### Purchased License
- **Cost**: 10,000 OMEGA tokens (configurable by owner)
- **Duration**: Lifetime (never expires)
- **Renewal**: Not required
- **Token Status**: Tokens are permanently transferred to contract
- **Withdrawal**: Not applicable (one-time payment)
- **Use Case**: Users who want permanent access and prefer one-time payment

## Pricing Configuration

The contract owner (deployer) can adjust all pricing parameters:

```solidity
// Example: Update staking amount to 2,000 OMEGA
setStakingAmount(2000000000000000000000); // 2000 * 10^18 wei

// Example: Update purchase amount to 20,000 OMEGA
setPurchaseAmount(20000000000000000000000); // 20000 * 10^18 wei

// Example: Update staking period to 60 days
setStakingPeriod(5184000); // 60 * 24 * 60 * 60 seconds
```

**Note**: All token amounts are in wei (1 OMEGA = 10^18 wei)

## License Lifecycle

### Staking License Flow
1. User clicks "Stake for License"
2. Confirmation dialog shows staking amount
3. User approves transaction in wallet
4. Contract locks tokens and sets expiry (current time + 30 days)
5. License is active for 30 days
6. User can renew by staking again (extends from current time)
7. After expiry, user can withdraw tokens or stake again

### Purchase License Flow
1. User clicks "Purchase Lifetime License"
2. Confirmation dialog shows purchase amount
3. User approves transaction in wallet
4. Contract transfers tokens (permanent)
5. License is active forever (no expiry)
6. No renewal needed

### Withdrawal Flow (Staking Only)
1. User's staking license expires
2. "Withdraw Stake" button appears in license details
3. User clicks button and confirms
4. Contract returns locked tokens to user's wallet
5. License status changes to "Not Licensed"

## Technical Details

### Contract Address
Stored in `identity-manager.js`:
```javascript
this.licensingContractAddress = '0x...'; // Deployed contract address
```

### ABI File
Contract ABI stored at: `contracts/Licensing.abi.json`

### Network Configuration
- **Network**: Omega Network
- **RPC URL**: `https://0x4e454228.rpc.aurora-cloud.dev/`
- **Chain ID**: `1313161768`
- **Currency**: OMEGA tokens

### Gas Requirements
- Staking transaction: ~100,000-200,000 gas
- Purchase transaction: ~100,000-200,000 gas
- Withdrawal transaction: ~80,000-150,000 gas
- Read operations: No gas (view functions)

## Security Considerations

1. **Owner Functions**: Only deployer wallet can adjust pricing
2. **Token Locking**: Staked tokens are held in contract (not transferable during license period)
3. **Expiry Enforcement**: License validity checked on-chain (cannot be bypassed)
4. **Withdrawal Protection**: Users cannot withdraw tokens while license is active
5. **Purchase Protection**: Users with active staking licenses must withdraw before purchasing lifetime license

## Error Handling

Common errors and solutions:
- **"Wallet not loaded"**: User must unlock wallet first
- **"Insufficient staking amount"**: User doesn't have enough OMEGA tokens
- **"License is still active"**: Cannot withdraw while license is active
- **"Please withdraw staked tokens first"**: Must withdraw before purchasing lifetime license
- **"Provider not initialized"**: Wallet connection issue, retry

## Integration with Omega OS

The licensing system integrates with:
- **Omega Identity**: Uses Omega ID to link licenses to users
- **Omega Wallet**: Handles all token transactions
- **Productivity Apps**: Check license status before allowing access
- **AI Features**: Require active license for AI functionality

## Future Enhancements

Potential improvements:
- License transfer between Omega IDs
- Family/team license sharing
- Discount codes/promotions
- License gifting
- Usage analytics
- Automatic renewal reminders

