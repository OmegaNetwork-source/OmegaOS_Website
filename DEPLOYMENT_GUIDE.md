# Omega Network Smart Contract Deployment Guide

## Overview
This guide will help you deploy the Omega OS smart contracts to Omega Network using Remix IDE.

## Prerequisites
1. **Remix IDE**: Go to https://remix.ethereum.org
2. **Omega Network RPC**: You'll need the RPC endpoint for Omega Network
3. **Wallet**: MetaMask or compatible wallet connected to Omega Network
4. **Omega Tokens**: Some tokens for gas fees and testing

## Step 1: Deploy Identity Registry Contract

### 1.1 Open Remix IDE
- Go to https://remix.ethereum.org
- Create a new file: `OmegaIdentityRegistry.sol`
- Copy the contents from `contracts/OmegaIdentityRegistry.sol`

### 1.2 Compile
- Go to "Solidity Compiler" tab
- Set compiler version to `0.8.20` or higher
- Click "Compile OmegaIdentityRegistry.sol"
- Check for any errors

### 1.3 Deploy
- Go to "Deploy & Run Transactions" tab
- Select "Injected Provider - MetaMask" (or your wallet)
- Make sure you're connected to **Omega Network**
- Select "OmegaIdentityRegistry" from contract dropdown
- Click "Deploy"
- Confirm transaction in MetaMask
- **Copy the contract address** - you'll need this!

### 1.4 Verify Deployment
- In Remix, expand the deployed contract
- Try calling `hasIdentity` with your wallet address
- Should return `false` (no identity yet)

## Step 2: Deploy Document Sync Contract

### 2.1 Create File
- Create `OmegaDocumentSync.sol` in Remix
- Copy contents from `contracts/OmegaDocumentSync.sol`

### 2.2 Compile & Deploy
- Compile with version `0.8.20`
- Deploy (same process as Step 1)
- **Copy the contract address**

## Step 3: Deploy Licensing Contract

### 3.1 Create File
- Create `OmegaLicensing.sol` in Remix
- Copy contents from `contracts/OmegaLicensing.sol`

### 3.2 Compile & Deploy
- Compile with version `0.8.20`
- Deploy (same process as Step 1)
- **Copy the contract address**
- Note: The deployer becomes the owner (can set prices)

### 3.3 Set Prices (Optional)
- After deployment, you can call `setPrice` to adjust license prices
- Example: `setPrice("omega-os-pro", 100000000000000000000)` = 100 tokens

## Step 4: Update Omega OS Configuration

### 4.1 Update identity-manager.js

Open `identity-manager.js` and update these values:

```javascript
// Update these with your deployed contract addresses
this.identityContractAddress = '0x...'; // From Step 1
this.licensingContractAddress = '0x...'; // From Step 3
this.syncContractAddress = '0x...'; // From Step 2

// Update RPC endpoint
this.omegaNetworkRpc = 'https://rpc.omeganetwork.io'; // Your Omega Network RPC
this.omegaNetworkChainId = 8888; // Your Omega Network Chain ID
```

### 4.2 Create Contract ABIs

You'll need to create ABI files for the contracts. In Remix:
1. After compiling, go to "Solidity Compiler" tab
2. Click "ABI" button next to each contract
3. Copy the ABI JSON
4. Save as:
   - `contracts/IdentityRegistry.abi.json`
   - `contracts/DocumentSync.abi.json`
   - `contracts/Licensing.abi.json`

## Step 5: Update identity-manager.js to Use Contracts

We need to update `identity-manager.js` to actually call the smart contracts instead of mock implementations.

### 5.1 Add ABI Loading

```javascript
// At the top of identity-manager.js
const IDENTITY_ABI = require('./contracts/IdentityRegistry.abi.json');
const SYNC_ABI = require('./contracts/DocumentSync.abi.json');
const LICENSING_ABI = require('./contracts/Licensing.abi.json');
```

### 5.2 Update registerIdentityOnChain

Replace the mock implementation with:

```javascript
async registerIdentityOnChain(omegaId, address, deviceFingerprint) {
    try {
        if (!this.wallet || !this.provider) {
            throw new Error('Provider not initialized');
        }
        
        const identityContract = new ethers.Contract(
            this.identityContractAddress,
            IDENTITY_ABI,
            this.wallet
        );
        
        const tx = await identityContract.registerIdentity(omegaId, deviceFingerprint);
        await tx.wait();
        
        console.log('Identity registered on Omega Network:', tx.hash);
        return true;
    } catch (error) {
        console.error('Failed to register identity on chain:', error);
        return false;
    }
}
```

### 5.3 Update syncDocumentHash

Replace with:

```javascript
async syncDocumentHash(documentId, documentHash, metadata = {}) {
    try {
        if (!this.wallet || !this.provider) {
            throw new Error('Provider not initialized');
        }
        
        if (!this.identity) {
            throw new Error('Identity not initialized');
        }
        
        const syncContract = new ethers.Contract(
            this.syncContractAddress,
            SYNC_ABI,
            this.wallet
        );
        
        const tx = await syncContract.syncDocument(
            documentId,
            documentHash,
            this.identity.omegaId,
            metadata.name || documentId,
            metadata.type || 'unknown'
        );
        
        await tx.wait();
        
        return {
            success: true,
            txHash: tx.hash,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Failed to sync document:', error);
        return { success: false, error: error.message };
    }
}
```

### 5.4 Update checkLicense

Replace with:

```javascript
async checkLicense(appName) {
    try {
        if (!this.provider) {
            return { hasLicense: false, reason: 'Provider not initialized' };
        }
        
        if (!this.identity) {
            return { hasLicense: false, reason: 'Identity not initialized' };
        }
        
        const licensingContract = new ethers.Contract(
            this.licensingContractAddress,
            LICENSING_ABI,
            this.provider
        );
        
        const [hasLicense, expiresAt] = await licensingContract.hasLicense(
            this.identity.omegaId,
            appName
        );
        
        return {
            hasLicense: hasLicense,
            appName: appName,
            omegaId: this.identity.omegaId,
            expiresAt: expiresAt.toNumber()
        };
    } catch (error) {
        console.error('Failed to check license:', error);
        return { hasLicense: false, reason: error.message };
    }
}
```

### 5.5 Update purchaseLicense

Replace with:

```javascript
async purchaseLicense(appName, price) {
    try {
        if (!this.wallet || !this.provider) {
            throw new Error('Provider not initialized');
        }
        
        if (!this.identity) {
            throw new Error('Identity not initialized');
        }
        
        const licensingContract = new ethers.Contract(
            this.licensingContractAddress,
            LICENSING_ABI,
            this.wallet
        );
        
        // Duration: 0 = lifetime license
        const tx = await licensingContract.purchaseLicense(
            this.identity.omegaId,
            appName,
            0, // Lifetime license
            { value: ethers.parseEther(price.toString()) }
        );
        
        await tx.wait();
        
        return {
            success: true,
            txHash: tx.hash,
            appName: appName
        };
    } catch (error) {
        console.error('Failed to purchase license:', error);
        throw error;
    }
}
```

## Step 6: Test the Integration

1. **Start Omega OS**
2. **Unlock your wallet**
3. **Open Omega Identity app**
4. **Click "Initialize Identity"**
5. **Check Remix/blockchain explorer** - you should see the transaction
6. **Save a document in Word/Sheets** - should sync automatically
7. **Check license status** in Identity app

## Troubleshooting

### Contract deployment fails
- Check you have enough Omega tokens for gas
- Verify you're on the correct network (Omega Network)
- Check compiler version matches (0.8.20)

### Transactions fail
- Check contract addresses are correct
- Verify RPC endpoint is working
- Check wallet has enough tokens

### Identity not registering
- Check wallet is unlocked
- Verify contract address in identity-manager.js
- Check console for error messages

## Next Steps

After deployment:
1. Test all three contracts
2. Update contract addresses in production
3. Consider adding events monitoring
4. Set up license prices appropriately
5. Consider adding upgradeability if needed

