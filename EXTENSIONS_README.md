# Browser Extensions Setup

This browser includes support for **pre-installed extensions** that are bundled with the app, specifically **Phantom Wallet** and **MetaMask**.

## How It Works

Extensions are automatically bundled with the app and loaded into the browser session when the application starts, making them available to all webviews (browser tabs). Users don't need to install anything - the extensions are already included!

## For Developers: Bundling Extensions

To bundle extensions with the app for distribution:

### Quick Start (Recommended - Copy from Chrome)

If you already have the extensions installed in Chrome/Edge/Brave:

1. **Copy extensions from your Chrome installation:**
   ```bash
   npm run extensions:copy
   ```
   Or copy a specific extension:
   ```bash
   npm run extensions:copy metamask
   npm run extensions:copy phantom
   ```

2. **Verify extensions are bundled:**
   ```bash
   npm run extensions:bundle
   ```

3. **Build the app** - extensions will be automatically included:
   ```bash
   npm run build
   ```

### Alternative: Manual Download

If you don't have the extensions installed:

1. **Run the bundling helper:**
   ```bash
   npm run extensions:bundle
   ```

2. **Follow the instructions** to download and place extensions in the `extensions/` folder:
   - `extensions/phantom/` - Phantom Wallet
   - `extensions/metamask/` - MetaMask

3. **Verify extensions are bundled:**
   ```bash
   npm run extensions:bundle
   ```

4. **Build the app** - extensions will be automatically included:
   ```bash
   npm run build
   ```

### Manual Bundling

1. **Download Extensions:**
   - Phantom: https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa
   - MetaMask: https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn

2. **Extract Extensions:**
   - **Option A:** Install in Chrome, then copy from Chrome's extension folder:
     - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\[extension-id]\`
     - macOS: `~/Library/Application Support/Google/Chrome/Default/Extensions/[extension-id]/`
     - Linux: `~/.config/google-chrome/Default/Extensions/[extension-id]/`
     - Copy the latest version folder
   
   - **Option B:** Use Chrome Extension Downloader:
     - Visit: https://chrome-extension-downloader.com/
     - Enter Extension ID and download `.crx` file
     - Rename `.crx` to `.zip` and extract it

3. **Place Extensions in Project:**
   - Create the following directory structure in your project:
     ```
     extensions/
     ├── phantom/
     │   ├── manifest.json
     │   └── [other extension files]
     └── metamask/
         ├── manifest.json
         └── [other extension files]
     ```

4. **Build the App:**
   - Extensions will be automatically included in the build
   - Users will have extensions pre-installed when they install the app

### Method 2: Using Extension Downloader (Future)

A script will be provided to automatically download and install extensions from the Chrome Web Store.

## Extension Status

You can check if extensions are loaded by:
- Looking at the console output when the app starts
- Checking the browser's extension management (if implemented in UI)
- Verifying extension functionality in web pages

## Troubleshooting

### Extensions Not Loading

1. **Check Extension Path:**
   - Verify extensions are in the correct directory
   - Ensure `manifest.json` exists in each extension folder

2. **Check Console:**
   - Look for error messages in the console
   - Common issues:
     - Missing `manifest.json`
     - Invalid extension format
     - Permission errors

3. **Verify Extension Format:**
   - Extensions must be unpacked (not `.crx` files)
   - Must contain a valid `manifest.json`
   - Should follow Chrome extension structure

### Extension Not Working in Webviews

- Extensions are loaded into the default session
- Webviews should automatically have access to extensions
- If issues persist, check webview session configuration

## Adding More Extensions

To add more extensions:

1. Add extension definition to `extension-manager.js`:
   ```javascript
   {
     id: 'extension-id',
     name: 'Extension Name',
     chromeStoreId: 'chrome-store-id',
     downloadUrl: null, // or direct URL if available
     version: 'latest',
     enabled: true
   }
   ```

2. Follow installation steps above

3. Restart the application

## Security Notes

- Extensions run with the same permissions as in Chrome
- Only install extensions from trusted sources
- Review extension permissions before installation
- Extensions can access web page content and make network requests

