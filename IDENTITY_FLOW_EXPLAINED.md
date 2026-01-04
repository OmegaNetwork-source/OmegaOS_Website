# Omega Identity Flow - Step by Step

## What We're Building (Just Identity First)

**Identity Registry Contract** - Stores each user's unique Omega ID on the blockchain.

## Why We Need This

When a user installs Omega OS, we want to give them a unique identity that:
- Works across all their devices
- Can't be faked or duplicated
- Is stored on blockchain (decentralized, permanent)
- Links to their wallet address

## The Flow (Step by Step)

### 1. User Installs Omega OS
- Fresh install, no identity yet

### 2. User Creates/Unlocks Wallet
- User creates Omega Wallet in Omega OS
- This gives them a wallet address (like `0x1234...`)

### 3. User Opens "Omega Identity" App
- Sees: "No identity found. Click to initialize."

### 4. User Clicks "Initialize Identity"
- Omega OS generates a unique Omega ID (like `omega://abc123...`)
- Creates a transaction to register it on Omega Network
- **User needs Omega tokens for gas fee** (small amount, ~$0.01-0.10)

### 5. Transaction Confirmed
- Identity is now stored on blockchain
- User can now use cross-device sync, licensing, etc.

## Token Requirements

### For Identity Registration:
- **Gas fee only** (paid in Omega tokens)
- One-time cost
- Small amount (depends on network, usually very cheap)

### For Document Sync (Later):
- Gas fee per document save
- Optional - user can choose to sync or not

### For Licensing (Later):
- Gas fee + license price
- Only when purchasing a license

## What Happens Without Tokens?

If user doesn't have Omega tokens:
- They can still use Omega OS normally
- They just can't:
  - Register identity (can't use sync/licensing)
  - Sync documents
  - Purchase licenses

**The OS still works - blockchain features are optional!**

## Starting Simple

Let's deploy **ONLY** the Identity Registry contract first. This is the foundation. Once it works, we can add the other features.

