# Verify OmegaLicensing Contract on Block Explorer

Verifying your contract on the block explorer allows you to interact with it directly through a web interface, making it easy to withdraw tokens and manage the contract.

## Contract Details

- **Contract Address**: `0x7DfD4E9A0a433e60D7B60AfdDd5cFCCAE7898108`
- **Network**: Omega Network
- **Chain ID**: `1313161768`
- **Explorer**: https://explorer.omeganetwork.co/

## Step 1: Go to Block Explorer

1. Navigate to: https://explorer.omeganetwork.co/
2. Search for your contract address: `0x7DfD4E9A0a433e60D7B60AfdDd5cFCCAE7898108`
3. Click on the contract address

## Step 2: Verify Contract

1. Click on the **"Contract"** tab
2. Click **"Verify and Publish"** button
3. Fill in the verification form:

### Verification Settings:
- **Compiler Type**: Solidity (Single file) or Standard JSON Input
- **Compiler Version**: `0.8.20` (or the exact version you used)
- **License**: MIT
- **Optimization**: Check if you enabled optimization during compilation
  - If yes, set **Optimization Runs** to the value you used (usually 200)

### Contract Source Code:

**Option A: Single File (Easier)**
- Copy the entire contents of `contracts/OmegaLicensing.sol`
- Paste it into the "Contract Source Code" field

**Option B: Standard JSON Input (More Accurate)**
- In Remix, go to "Solidity Compiler" tab
- Click "Compilation Details"
- Copy the entire JSON from "Standard JSON Input"
- Paste it into the verification form

4. Click **"Verify and Publish"**

## Step 3: Wait for Verification

- The explorer will verify your contract (usually takes 30 seconds to 2 minutes)
- Once verified, you'll see a green checkmark ✅
- The contract will show as "Verified"

## Step 4: Interact with Contract

Once verified, you can interact with the contract directly:

### View Functions (No Transaction Needed):
- `owner()` - See contract owner address
- `treasury()` - See treasury address (if set)
- `stakingAmount()` - See current staking price
- `purchaseAmount()` - See current purchase price
- `stakingPeriod()` - See staking period in seconds
- `getBalance()` - See contract balance
- `hasActiveLicense(string omegaId)` - Check if user has license
- `getLicense(string omegaId)` - Get license details

### Write Functions (Require Transaction):
- `withdraw(uint256 amount)` - Withdraw tokens to owner wallet
- `setStakingAmount(uint256 newAmount)` - Update staking price
- `setPurchaseAmount(uint256 newAmount)` - Update purchase price
- `setStakingPeriod(uint256 newPeriod)` - Update staking period
- `setTreasury(address newTreasury)` - Set treasury address
- `transferOwnership(address newOwner)` - Transfer ownership

## Step 5: Withdraw Tokens

1. Go to the **"Contract"** tab on the verified contract page
2. Click **"Write Contract"**
3. Connect your wallet (the owner wallet)
4. Find the `withdraw` function
5. Enter the amount to withdraw:
   - **Amount**: Enter the amount in wei (1 OMEGA = 10^18 wei)
   - Example: To withdraw 10,000 OMEGA, enter: `10000000000000000000000`
   - Or click "Read Contract" → `getBalance()` to see total balance, then withdraw all
6. Click **"Write"** or **"Transact"**
7. Confirm the transaction in your wallet
8. Wait for confirmation

## Tips

### Withdraw All Tokens:
1. First, check balance: `getBalance()` → Copy the value
2. Then call `withdraw()` with that exact value

### Format Amounts:
- **1 OMEGA** = `1000000000000000000` (1 * 10^18)
- **1,000 OMEGA** = `1000000000000000000000` (1000 * 10^18)
- **10,000 OMEGA** = `10000000000000000000000` (10000 * 10^18)

### Security:
- Only the owner wallet can call `withdraw()`
- Make sure you're connected with the owner wallet
- Double-check the amount before confirming

## Troubleshooting

**"Contract not verified"**
- Make sure you used the exact compiler version
- Check if optimization was enabled/disabled correctly
- Try Standard JSON Input instead of single file

**"Function not found"**
- Make sure contract is verified
- Refresh the page
- Check that you're on the "Write Contract" tab

**"Insufficient balance"**
- Check contract balance using `getBalance()`
- Make sure you're not trying to withdraw more than available

**"Only owner can call"**
- Make sure you're connected with the owner wallet
- Check `owner()` to see the current owner address

## Alternative: Use Remix

If verification fails or you prefer Remix:
1. Open Remix IDE
2. Connect to Omega Network
3. Load the contract ABI
4. Connect at address: `0x7DfD4E9A0a433e60D7B60AfdDd5cFCCAE7898108`
5. Call `withdraw()` function

## Next Steps After Verification

Once verified, you can:
- ✅ Easily withdraw tokens through the explorer
- ✅ Update pricing settings
- ✅ Monitor contract activity
- ✅ View all transactions and events
- ✅ Share contract with others (transparent and auditable)

