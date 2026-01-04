# Identity Registration Flow - Step by Step

## The Complete Flow

### Step 1: User Opens Omega OS
- Fresh install, no identity yet
- User can use Omega OS normally (browser, apps, etc.)

### Step 2: User Creates/Unlocks Wallet
- User goes to "Omega Wallet" app
- Creates new wallet OR unlocks existing wallet
- Gets wallet address: `0x1234abcd...`
- **No blockchain transaction yet** - wallet is just created locally

### Step 3: User Opens "Omega Identity" App
- Sees message: "No identity found. Click to initialize."
- User clicks "Initialize Identity" button

### Step 4: Omega OS Generates Omega ID
- Omega OS creates unique ID: `omega://abc123def456...`
- Creates device fingerprint (privacy-preserving hash)
- **Still no blockchain transaction** - just local preparation

### Step 5: User Sees Transaction Prompt
- Omega OS shows: "Register identity on Omega Network?"
- Shows estimated gas cost: "~0.001 Omega tokens"
- User clicks "Confirm" or "Cancel"

### Step 6: User Confirms in Wallet
- Wallet popup appears (like MetaMask)
- Shows transaction details:
  - To: Identity Registry Contract (0x...)
  - Function: `registerIdentity(omegaId, deviceFingerprint)`
  - Gas fee: ~0.001 Omega tokens
- User clicks "Confirm" in wallet

### Step 7: Transaction Sent to Blockchain
- Transaction broadcast to Omega Network
- Miners/validators process it
- Takes ~5-30 seconds (depends on network)

### Step 8: Transaction Confirmed
- Blockchain confirms transaction
- Identity is now stored on-chain
- Omega OS shows: "Identity registered successfully!"
- User can now use sync, licensing, etc.

## What If User Doesn't Confirm?

### User Clicks "Cancel"
- No transaction sent
- No identity created
- User can try again later
- Omega OS still works normally (just can't use blockchain features)

### User Has No Tokens
- Wallet shows: "Insufficient balance"
- Transaction fails
- User needs to get Omega tokens first
- Can get tokens from exchange, faucet, etc.

## Visual Flow

```
User clicks "Initialize Identity"
    ↓
Omega OS generates Omega ID locally
    ↓
Shows: "Register on blockchain? Cost: ~0.001 tokens"
    ↓
User clicks "Yes"
    ↓
Wallet popup: "Confirm transaction?"
    ↓
User clicks "Confirm"
    ↓
Transaction sent to Omega Network
    ↓
Blockchain confirms (5-30 seconds)
    ↓
✅ Identity registered!
```

## What Gets Stored on Blockchain?

When transaction is confirmed, blockchain stores:
- Wallet address: `0x1234...`
- Omega ID: `omega://abc123...`
- Device fingerprint: `hash123...` (privacy-preserving)
- Timestamp: `1234567890`

**That's it!** No personal info, no device details, just the identity record.

## Can User Skip This?

**Yes!** User can:
- Use Omega OS without identity
- Just can't use:
  - Cross-device sync
  - App licensing
  - Other blockchain features

Identity registration is **optional** - Omega OS works fine without it!

