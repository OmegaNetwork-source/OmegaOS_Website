# How to Install Extensions in Omega Browser

## Quick Install Guide

### Method 1: Using Chrome Web Store (Recommended)

1. **Open Settings:**
   - Click the Settings icon (⚙️) in the browser toolbar
   - Go to the "Extensions" section

2. **Click "Install from Chrome Web Store"** for the extension you want

3. **On Chrome Web Store:**
   - Install the extension in Chrome/Edge first (to get the files)
   - Or use a Chrome Extension Downloader website

4. **Find the Extension Files:**
   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\[extension-id]\`
   - macOS: `~/Library/Application Support/Google/Chrome/Default/Extensions/[extension-id]/`
   - Linux: `~/.config/google-chrome/Default/Extensions/[extension-id]/`

5. **Copy to Omega Browser:**
   - Copy the latest version folder
   - Place it in: `[Omega User Data]/extensions/[extension-name]/`
   - On Windows: `%APPDATA%\omega-os\extensions\`
   - On macOS: `~/Library/Application Support/omega-os/extensions/`
   - On Linux: `~/.config/omega-os/extensions/`

6. **Restart Omega Browser**

### Method 2: Using Extension Downloader

1. Visit: https://chrome-extension-downloader.com/
2. Enter the Extension ID
3. Download the .crx file
4. Rename .crx to .zip and extract
5. Place extracted folder in the extensions directory
6. Restart the browser

## Available Extensions

### MetaMask
- **Chrome Store:** https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn
- **Extension ID:** nkbihfbeogaeaoehlefnkodbefgpgknn
- **Description:** Ethereum and EVM wallet

### Phantom
- **Chrome Store:** https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa
- **Extension ID:** bfnaelmomeimhlpmgjnjophhpkkoljpa
- **Description:** Solana, Ethereum, and Polygon wallet

## Notes

- Extensions must be unpacked (not .crx files)
- Each extension folder must contain a `manifest.json`
- After installing, restart the browser for extensions to load
- Extension icons will appear in the toolbar when loaded
- Extensions work on web pages even if popups have limitations

## Troubleshooting

- **Extension not loading:** Check that the folder contains `manifest.json`
- **Extension icon not showing:** Verify extension loaded successfully in console
- **Extension not working:** Some extensions may have limited functionality in Electron



