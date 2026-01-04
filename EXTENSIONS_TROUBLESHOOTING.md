# Extension Troubleshooting Guide

## Important: Extension UI in Electron

**Extensions in Electron don't show icons in the browser UI like they do in Chrome.** They work in the background and inject their scripts into web pages. You won't see extension icons in the toolbar.

## How to Verify Extensions Are Working

### Method 1: Check Console Logs

When you start the app, you should see:
```
✓ Loaded extension: phantom (Phantom)
✓ Loaded extension: metamask (MetaMask)
✓ Extension initialization complete. Loaded 2 extension(s)
```

### Method 2: Test on a Web Page

1. Open the browser and navigate to any website (e.g., https://example.com)
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to the Console tab
4. Type and check:

**For MetaMask:**
```javascript
typeof window.ethereum
// Should return: "object" (not "undefined")
window.ethereum.isMetaMask
// Should return: true
```

**For Phantom:**
```javascript
typeof window.solana
// Should return: "object" (not "undefined")
window.solana.isPhantom
// Should return: true
```

### Method 3: Use the Test Page

1. Save `test-extensions.html` to your project
2. Open it in the browser (file:///path/to/test-extensions.html)
3. Click the test buttons or check the console

### Method 4: Visit dApp Websites

Visit websites that use these wallets:
- **For MetaMask**: Visit https://app.uniswap.org or any Ethereum dApp
- **For Phantom**: Visit https://phantom.app or any Solana dApp

The extensions should automatically connect.

## Common Issues

### Extensions Load But Don't Work

If extensions load but `window.ethereum` or `window.solana` is undefined:

1. **Check webview session**: Webviews must use the default session partition
2. **Check console errors**: Look for extension errors in the console
3. **Restart the app**: Sometimes extensions need a restart after first load

### Extension Errors in Console

You may see warnings like:
```
Permission 'identity' is unknown or URL pattern is malformed.
```

These are usually harmless and don't prevent extensions from working. However, if you see actual errors (not warnings), check:

1. Extension manifest.json is valid
2. Extension files are complete (not corrupted)
3. Extension permissions are compatible with Electron

### Extensions Not Loading

If you see:
```
✗ Failed to load extension [name]
Extension [name] is not installed.
```

1. Check that extensions are in the `extensions/` folder:
   - `extensions/phantom/` (with manifest.json inside)
   - `extensions/metamask/` (with manifest.json inside)

2. Verify manifest.json exists in each extension folder

3. Check console for specific error messages

## Expected Behavior

- ✅ Extensions load on app startup
- ✅ Extensions inject scripts into web pages
- ✅ `window.ethereum` and `window.solana` are available on web pages
- ✅ Extensions can connect to dApps
- ❌ Extension icons don't appear in browser UI (this is normal for Electron)

## Getting Help

If extensions still don't work:

1. Check the full console output when starting the app
2. Test with the test page (test-extensions.html)
3. Verify extensions work by visiting a dApp website
4. Check that extension files are complete and not corrupted



