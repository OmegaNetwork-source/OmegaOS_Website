# Deploy Omega Document Sync Contract

## Step 1: Open Remix IDE
1. Go to https://remix.ethereum.org
2. Create a new file called `OmegaDocumentSync.sol`
3. Copy the contract code from `contracts/OmegaDocumentSync.sol`

## Step 2: Compile
1. Select Solidity compiler (0.8.20 or compatible)
2. Click "Compile OmegaDocumentSync.sol"
3. Check for errors

## Step 3: Deploy to Omega Network
1. Go to "Deploy & Run Transactions"
2. Select "Injected Provider - MetaMask" (or your wallet)
3. **Switch to Omega Network** in your wallet:
   - Network Name: Omega Network
   - RPC URL: `https://0x4e454228.rpc.aurora-cloud.dev/`
   - Chain ID: `1313161768`
   - Currency Symbol: OMEGA
4. Select "OmegaDocumentSync" from contract dropdown
5. Click "Deploy"
6. Confirm transaction in wallet
7. Wait for confirmation

## Step 4: Get Contract Address
1. After deployment, copy the contract address
2. It will look like: `0x1234567890abcdef1234567890abcdef12345678`

## Step 5: Update Omega OS
1. Open `identity-manager.js`
2. Find line 22: `this.syncContractAddress = process.env.OMEGA_SYNC_CONTRACT || '0x0000000000000000000000000000000000000000';`
3. Replace `'0x0000000000000000000000000000000000000000'` with your deployed contract address
4. Or set environment variable: `OMEGA_SYNC_CONTRACT=0xYourContractAddress`

## Step 6: Test
1. Restart Omega OS
2. Open Omega Word
3. Create a document and save it
4. Check Omega Identity app - document should appear in "Cross-Device Sync" section

## Gas Costs
- Deploying contract: ~0.01-0.1 OMEGA tokens (one-time)
- Syncing each document: ~0.001-0.01 OMEGA tokens per document

## What Gets Synced?
- **Document hash** (SHA-256) - NOT the actual file content
- **Filename** - Original filename
- **Document type** - 'word', 'sheets', 'slides', etc.
- **Timestamp** - When synced
- **Omega ID** - Links to your identity

## Privacy
- Only document hashes are stored on-chain (not content)
- You can verify document integrity by comparing hashes
- Actual files stay on your device

