# Deploy OmegaLicensing Contract

This guide will help you deploy the `OmegaLicensing` contract to Omega Network using Remix IDE.

## Contract Overview

The `OmegaLicensing` contract manages Omega OS Pro licenses with two options:
- **Staking**: Stake 1,000 OMEGA tokens for a 30-day license (renewable)
- **Purchase**: Purchase lifetime license for 10,000 OMEGA tokens

The deployer (owner) can adjust:
- Staking amount (default: 1,000 OMEGA)
- Purchase amount (default: 10,000 OMEGA)
- Staking period (default: 30 days)

## Step 1: Open Remix IDE

1. Go to https://remix.ethereum.org/
2. Create a new file called `OmegaLicensing.sol` in the `contracts` folder
3. Copy the entire contents of `contracts/OmegaLicensing.sol` into Remix

## Step 2: Configure Compiler

1. Click on the "Solidity Compiler" tab (left sidebar)
2. Set compiler version to `0.8.20` or higher
3. Click "Compile OmegaLicensing.sol"
4. Check for any compilation errors and fix them if needed

## Step 3: Configure Network

1. Click on "Deploy & Run Transactions" tab
2. In the "Environment" dropdown, select "Injected Provider - MetaMask" (or your wallet)
3. Make sure your wallet is connected to **Omega Network**
   - Network Name: Omega Network
   - RPC URL: `https://0x4e454228.rpc.aurora-cloud.dev/`
   - Chain ID: `1313161768`
   - Currency Symbol: OMEGA

## Step 4: Deploy Contract

1. In the "Contract" dropdown, select `OmegaLicensing`
2. You'll see three constructor parameters:
   - `_stakingAmount`: Amount in wei (1 OMEGA = 10^18 wei)
     - For 1,000 OMEGA: `1000000000000000000000` (1000 * 10^18)
   - `_purchaseAmount`: Amount in wei
     - For 10,000 OMEGA: `10000000000000000000000` (10000 * 10^18)
   - `_stakingPeriod`: Period in seconds
     - For 30 days: `2592000` (30 * 24 * 60 * 60)

3. Enter the values:
   ```
   _stakingAmount: 1000000000000000000000
   _purchaseAmount: 10000000000000000000000
   _stakingPeriod: 2592000
   ```

4. Click "Deploy"
5. Confirm the transaction in your wallet
6. Wait for deployment confirmation

## Step 5: Save Contract Address

1. After deployment, copy the contract address from Remix
2. Update `identity-manager.js`:
   ```javascript
   this.licensingContractAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
   ```

## Step 6: Get ABI

1. In Remix, go to "Solidity Compiler" tab
2. Click on "ABI" button below the contract name
3. Copy the entire ABI JSON
4. Save it as `contracts/Licensing.abi.json`

## Step 7: Update identity-manager.js

1. Open `identity-manager.js`
2. Find the line that loads the licensing ABI:
   ```javascript
   try {
       this.licensingABI = require('./contracts/Licensing.abi.json');
   } catch (error) {
       console.warn('Licensing ABI not available yet:', error);
       this.licensingABI = null;
   }
   ```

3. Make sure the ABI file path matches what you saved

## Step 8: Test the Contract

After deployment, you can test the contract functions:

1. **Check staking amount**: Call `stakingAmount()` - should return `1000000000000000000000`
2. **Check purchase amount**: Call `purchaseAmount()` - should return `10000000000000000000000`
3. **Check staking period**: Call `stakingPeriod()` - should return `2592000`
4. **Check owner**: Call `owner()` - should return your wallet address

## Owner Functions (Deployer Only)

As the contract owner, you can adjust pricing:

1. **Update staking amount**: Call `setStakingAmount(uint256 newAmount)`
   - Example: To set to 2,000 OMEGA, use `2000000000000000000000`

2. **Update purchase amount**: Call `setPurchaseAmount(uint256 newAmount)`
   - Example: To set to 20,000 OMEGA, use `20000000000000000000000`

3. **Update staking period**: Call `setStakingPeriod(uint256 newPeriod)`
   - Example: For 60 days, use `5184000` (60 * 24 * 60 * 60)

4. **Withdraw contract balance**: Call `withdraw(uint256 amount)`
   - Only the owner can withdraw collected tokens

## Important Notes

- **Token amounts are in wei**: 1 OMEGA = 10^18 wei
- **Staking period is in seconds**: 30 days = 2,592,000 seconds
- **Owner address**: The wallet that deploys the contract becomes the owner
- **Transfer ownership**: Use `transferOwnership(address newOwner)` to transfer ownership

## Troubleshooting

- **"Insufficient funds"**: Make sure you have enough OMEGA tokens for gas fees
- **"Contract not found"**: Verify the contract address is correct in `identity-manager.js`
- **"ABI not loaded"**: Check that `Licensing.abi.json` exists and is valid JSON
- **"Owner only" errors**: Make sure you're calling owner functions from the deployer wallet

## Next Steps

After deployment:
1. Update `identity-manager.js` with the contract address
2. Save the ABI file
3. Restart Omega OS
4. Test license staking/purchasing in the Identity app

