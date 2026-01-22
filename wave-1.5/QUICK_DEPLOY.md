# Quick Deploy Guide

The automatic compilation is having issues. Here's the fastest way to deploy:

## Option 1: Use Remix (Recommended - 2 minutes)

1. Go to https://remix.ethereum.org
2. Click "Create new file" → Name it `ClaimDistributor15.sol`
3. Paste the contract from `contracts/ClaimDistributor15.sol`
4. In the Solidity Compiler tab:
   - Select compiler version: 0.8.20
   - Click "Compile ClaimDistributor15.sol"
5. After compilation, click on "ClaimDistributor15" in the file explorer
6. In the compilation details, find "Bytecode" section
7. Copy the "object" value (the long hex string starting with 0x608060...)
8. Save it to `bytecode.txt` in this directory (just the hex, no quotes)
9. Run: `node deploy-final.js 15b9a6a7e08dc33724a60cddd614eb66ec9dc0a5c54c58659a7c684d5ed791a6`

## Option 2: Fix Hardhat and use it

The Hardhat setup needs ESM configuration. Once fixed:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network omega
```

The deployment script will automatically:
- Deploy the contract
- Update index.html with the contract address
- Show you the deployment details
