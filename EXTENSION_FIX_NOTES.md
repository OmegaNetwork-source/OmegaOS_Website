# Extension Fix - Partition Issue

## The Problem
Webviews were using `partition="persist:default"` which creates a **separate session** that cannot access extensions loaded in the default session.

## The Solution
**Remove the partition attribute entirely** - webviews without a partition attribute use the default session where extensions are loaded.

## What Changed
1. Removed `partition="persist:default"` from browser webviews
2. Removed `partition="persist:default"` from terminal webview
3. Webviews now use the default session automatically

## How to Verify It Works

1. **Restart the browser completely**

2. **Check console on startup** - should see:
   ```
   ✓ Loaded extension: metamask (MetaMask)
   ✓ Loaded extension: phantom (Phantom)
   ✓ Extension initialization complete. Loaded 2 extension(s)
   ```

3. **Test on Uniswap:**
   - Visit: https://app.uniswap.org
   - Open DevTools (F12)
   - In Console, type: `window.ethereum`
   - Should show MetaMask object (not undefined)

4. **Test on any page:**
   - Open DevTools Console
   - Type: `typeof window.ethereum` (should be "object")
   - Type: `typeof window.solana` (should be "object")

## Why This Works
- Extensions are loaded into `session.defaultSession`
- Webviews without a partition attribute automatically use the default session
- This allows webviews to access the extensions



