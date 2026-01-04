# Simple Extension Setup - Get Phantom & MetaMask Working

## The Problem
Extensions need to be in the `extensions/` folder and webviews need to use the default session partition.

## Quick Fix

### Step 1: Get Extensions
You have two options:

**Option A: Copy from Chrome (Easiest)**
1. Install MetaMask and Phantom in Chrome
2. Find Chrome's extension folder:
   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\`
   - Look for folders: `nkbihfbeogaeaoehlefnkodbefgpgknn` (MetaMask) and `bfnaelmomeimhlpmgjnjophhpkkoljpa` (Phantom)
3. Copy the latest version folder for each:
   - Copy `nkbihfbeogaeaoehlefnkodbefgpgknn\[version]\` → `extensions\metamask\`
   - Copy `bfnaelmomeimhlpmgjnjophhpkkoljpa\[version]\` → `extensions\phantom\`

**Option B: Download from Chrome Extension Downloader**
1. Go to: https://chrome-extension-downloader.com/
2. Download MetaMask: Enter ID `nkbihfbeogaeaoehlefnkodbefgpgknn`
3. Download Phantom: Enter ID `bfnaelmomeimhlpmgjnjophhpkkoljpa`
4. Rename .crx to .zip and extract
5. Place extracted folders in `extensions\metamask\` and `extensions\phantom\`

### Step 2: Verify Structure
Your `extensions/` folder should look like:
```
extensions/
  metamask/
    manifest.json
    (other files)
  phantom/
    manifest.json
    (other files)
```

### Step 3: Restart Browser
Extensions will auto-load on startup.

### Step 4: Test
Visit:
- https://app.uniswap.org (MetaMask should connect)
- https://phantom.app (Phantom should work)

Or open console on any page and type:
- `window.ethereum` (should show MetaMask object)
- `window.solana` (should show Phantom object)

## What Works
✅ Extensions work on web pages (dApps)
✅ window.ethereum and window.solana are available
✅ Extensions connect to dApps automatically

## What Doesn't Work
❌ Extension popups (Electron limitation - but you don't need them!)
❌ Extension toolbar icons (but extensions still work)

## The Key Point
**You don't need popups!** Extensions work perfectly on web pages. When you visit a dApp, MetaMask/Phantom will automatically connect. That's what matters.



