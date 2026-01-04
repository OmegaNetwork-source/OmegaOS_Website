# Contract to Deploy

## Deploy This Contract First

**File:** `contracts/OmegaIdentityRegistry.sol`

This is the ONLY contract you need to deploy right now. It handles:
- Registering user identities
- Storing Omega IDs on blockchain
- Checking if identity exists

## Quick Deployment Steps

1. Go to https://remix.ethereum.org
2. Create file: `OmegaIdentityRegistry.sol`
3. Copy contents from `contracts/OmegaIdentityRegistry.sol`
4. Compile (Solidity 0.8.20+)
5. Deploy to Omega Network (Chain ID: 1313161768)
6. **Copy the contract address** (starts with `0x...`)

## After Deployment

Once you have the contract address, we'll update `identity-manager.js` to use it, and then users can register from the start menu!

See `DEPLOY_IDENTITY_ONLY.md` for detailed instructions.

