# Cross-Device File Sync with Omega Identity

## Overview

Omega OS now supports **cross-device document sync** using your Omega Identity! When you save a document on one device, its hash is stored on the Omega Network blockchain, allowing you to verify and sync it across all your devices.

## How It Works

### Privacy-First Design
- **Only document hashes are stored** on-chain (SHA-256)
- **Actual file content stays on your device** (never uploaded)
- You can verify document integrity by comparing hashes
- Perfect for privacy-conscious users

### The Sync Process

1. **Save Document** (Word, Sheets, or Slides)
   - Document is saved locally
   - SHA-256 hash is calculated
   - Hash is synced to Omega Network (requires gas fee)

2. **On Another Device**
   - Open Omega Identity app
   - View all synced documents
   - Compare hashes to verify integrity
   - Download/restore from your local backup

## Setup Steps

### 1. Deploy Document Sync Contract
Follow `DEPLOY_DOCUMENT_SYNC.md` to deploy the contract to Omega Network.

### 2. Update Contract Address
After deployment, update `identity-manager.js`:
```javascript
this.syncContractAddress = '0xYourDeployedContractAddress';
```

### 3. Restart Omega OS
The sync feature will be active!

## Using Cross-Device Sync

### Auto-Sync on Save
- **Omega Word**: Documents auto-sync when saved
- **Omega Sheets**: Spreadsheets auto-sync when saved  
- **Omega Slides**: Presentations auto-sync when saved

### Manual Sync
1. Open **Omega Identity** app
2. Go to **Cross-Device Sync** section
3. View all synced documents
4. See document hashes, filenames, and timestamps

### Viewing Synced Documents
- Open **Omega Identity** app
- Scroll to **Cross-Device Sync** section
- See list of all documents synced to your Omega ID
- Each document shows:
  - 📄 Filename
  - 📊 Document type (word/sheets/slides)
  - 🕐 Sync timestamp
  - 🔐 Document hash (for verification)

## Cost

- **One-time**: Deploy contract (~0.01-0.1 OMEGA tokens)
- **Per document**: Sync hash (~0.001-0.01 OMEGA tokens)
- **Viewing**: Free (read-only queries)

## Use Cases

1. **Document Verification**
   - Verify document hasn't been tampered with
   - Compare hashes across devices

2. **Cross-Device Access**
   - See what documents you have on other devices
   - Know when documents were last synced

3. **Backup Verification**
   - Verify your local backups match blockchain records
   - Ensure document integrity

## Privacy & Security

✅ **What's Stored on Blockchain:**
- Document hash (SHA-256)
- Filename
- Document type
- Timestamp
- Your Omega ID

❌ **What's NOT Stored:**
- Document content
- Personal data
- File location
- Any sensitive information

## Troubleshooting

### Documents Not Syncing
1. Check wallet is unlocked
2. Verify you have Omega tokens for gas
3. Ensure contract is deployed
4. Check contract address in `identity-manager.js`

### Can't See Synced Documents
1. Make sure identity is initialized
2. Check wallet is unlocked
3. Verify contract address is correct
4. Check browser console for errors

## Next Steps

After deploying the contract:
1. ✅ Update contract address in `identity-manager.js`
2. ✅ Restart Omega OS
3. ✅ Save a document in Word/Sheets/Slides
4. ✅ Check Omega Identity app for synced documents

## Future Enhancements

- Automatic conflict detection
- Document version history
- Encrypted document metadata
- Multi-device restore workflow

