# Deployment Instructions

## Quick Deploy (Using Remix)

1. **Compile on Remix**:
   - Go to https://remix.ethereum.org
   - Create a new file: `ClaimDistributor15.sol`
   - Paste the contract code from `contracts/ClaimDistributor15.sol`
   - Set compiler to Solidity 0.8.20
   - Click "Compile ClaimDistributor15.sol"
   - In the compilation output, find "Bytecode" section
   - Copy the "object" value (starts with 0x608060...)

2. **Save bytecode**:
   - Create `bytecode.txt` in this directory
   - Paste the bytecode (just the hex string, no quotes)

3. **Deploy**:
   ```bash
   node deploy-final.js YOUR_PRIVATE_KEY
   ```

## Alternative: Use Hardhat (if configured)

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network omega
```

## After Deployment

1. The script will automatically update `index.html` with the contract address
2. Fund the contract with tOmega tokens
3. Test the claim functionality
4. Deploy the frontend
