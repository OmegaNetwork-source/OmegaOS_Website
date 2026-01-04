# MetaMask Popup Fix

## The Problem
MetaMask is detected by dApps (like Uniswap) but when it tries to show a popup for connection approval, the popup doesn't appear or work properly.

## The Solution
Two changes:

1. **Intercept popup requests** - When MetaMask (or any extension) tries to open a popup window, intercept it and open it in a new tab instead
2. **Extension icon clicks** - When users click the MetaMask/Phantom icon in the toolbar, open the extension's UI page (home.html for MetaMask, popup.html for Phantom) in a new tab

## How It Works

### Popup Interception
- Webviews now listen for `new-window` events
- When a popup is requested (like `chrome-extension://.../popup.html`), it's intercepted
- Instead of opening a popup window, it opens in a new tab
- This allows users to interact with MetaMask's connection UI

### Extension Icon Clicks
- Clicking the MetaMask icon opens `chrome-extension://[id]/home.html` in a new tab
- Clicking the Phantom icon opens `chrome-extension://[id]/popup.html` in a new tab
- Users can access their wallet UI directly

## Testing

1. **Visit Uniswap**: https://app.uniswap.org
2. **Click "Connect"** → Select MetaMask
3. **MetaMask popup should open in a new tab** (not a separate window)
4. **Approve the connection** in the MetaMask tab
5. **Return to Uniswap tab** → Connection should be complete

Alternatively:
1. **Click the MetaMask icon** in the toolbar
2. **MetaMask home page opens in a new tab**
3. **Set up or access your wallet** from there

## Why This Works

- Extensions load correctly and inject into web pages
- Popups are redirected to tabs (which work better in Electron)
- Users can interact with extension UI through tabs
- Connection flow works end-to-end



