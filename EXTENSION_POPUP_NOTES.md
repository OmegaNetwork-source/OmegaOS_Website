# Extension Popup Notes

## Current Implementation

Extension popups now open in **new tabs** within the browser instead of separate windows. This provides better compatibility with Electron's extension system.

## Known Limitations

1. **Background Scripts**: Some extensions rely heavily on background scripts that may not work perfectly in Electron
2. **Extension APIs**: Electron supports a subset of Chrome Extension APIs - not all features work
3. **Complex Extensions**: Extensions like MetaMask and Phantom may have limited functionality

## How It Works Now

- Click extension icon → Opens popup in a new tab
- The popup loads in a webview with the extension context
- Better compatibility than separate windows

## Troubleshooting

If extensions still don't work:
1. Check console for errors when loading extensions
2. Verify extensions are loading correctly (should see "✓ Loaded extension" messages)
3. Try opening extension popups directly in tabs
4. Some extensions may require additional permissions or configurations

## Alternative: Use Extensions on Web Pages

Even if popups don't work perfectly, extensions should still work when injected into web pages:
- `window.ethereum` for MetaMask
- `window.solana` for Phantom

Test by visiting dApp websites - the extensions should connect automatically.


