# Deploy Identity Registry Contract (Step 1)

## What This Does

This contract stores user identities on Omega Network. When a user clicks "Initialize Identity" in Omega OS, it calls this contract to register their unique Omega ID.

## Token Flow Explained

### User Needs Omega Tokens For:
- **Gas fees only** (to send the transaction)
- One-time cost when registering identity
- Very small amount (like $0.01-0.10 depending on network)

### What Happens:
1. User clicks "Initialize Identity"
2. Omega OS shows: "You need Omega tokens for gas fee (~0.001 tokens)"
3. User confirms transaction in wallet
4. Transaction sent to blockchain
5. Identity registered!

### If User Has No Tokens:
- They can still use Omega OS normally
- They just can't register identity (can't use sync/licensing features)
- They can get tokens later and register then

## Deployment Steps

### 1. Open Remix IDE
- Go to https://remix.ethereum.org

### 2. Create Contract File
- Click "File Explorer" (left sidebar)
- Click "Create new file"
- Name it: `OmegaIdentityRegistry.sol`
- Copy the entire contents from `contracts/OmegaIdentityRegistry.sol` in your project
- Paste into Remix

### 3. Compile
- Click "Solidity Compiler" tab (left sidebar)
- Set compiler version to `0.8.20` or higher
- Click "Compile OmegaIdentityRegistry.sol"
- Should see green checkmark ✅

### 4. Connect MetaMask to Omega Network
- Make sure MetaMask is installed
- Add Omega Network to MetaMask (use "Add to MetaMask" from your dashboard)
- Or manually add:
  - Network Name: Omega Network
  - RPC URL: `https://0x4e454228.rpc.aurora-c.network` (check your dashboard for full URL)
  - Chain ID: `1313161768`
  - Currency Symbol: (check your dashboard)
  - Block Explorer: `https://explorer.omeganetwork.co`

### 5. Deploy
- Click "Deploy & Run Transactions" tab (left sidebar)
- Environment: Select "Injected Provider - MetaMask"
- Make sure MetaMask shows "Omega Network" (Chain ID: 1313161768)
- Contract: Select "OmegaIdentityRegistry - contracts/OmegaIdentityRegistry.sol"
- Click "Deploy" button
- MetaMask will pop up - click "Confirm"
- Wait for transaction to complete

### 6. Copy Contract Address
- After deployment, you'll see the contract in "Deployed Contracts" section
- Expand it to see the address
- **Copy this address** - it looks like `0x1234567890abcdef...`
- This is your Identity Registry contract address!

### 7. Test It
- Expand the deployed contract
- Try calling `hasIdentity` with your wallet address
- Should return `false` (no identity registered yet)

## Next Step

Once you have the contract address, we'll update `identity-manager.js` to use it, and then test the full flow in Omega OS!

---

**That's it!** Just deploy this ONE contract first. We'll add the other features (document sync, licensing) later once this works.

