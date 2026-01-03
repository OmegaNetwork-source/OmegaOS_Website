const { app, BrowserWindow, ipcMain, session, dialog, shell, screen, net } = require('electron');
const path = require('path');
const os = require('os');
const OmegaWallet = require('./wallet');
const OmegaIdentityManager = require('./identity-manager');
const CryptoJS = require('crypto-js');
const aiService = require('./ai-service');
const sdService = require('./stable-diffusion-service');
const sdManager = require('./stable-diffusion-manager');

// Tor Manager (optional - for bundled Tor)
let torManager;
try {
  torManager = require('./tor-manager');
} catch (e) {
  console.warn('[Main] Tor manager not available:', e.message);
}

// Analytics (optional - can be disabled)
let analytics;
try {
  analytics = require('./analytics');
} catch (e) {
  console.warn('[Main] Analytics module not available:', e.message);
}

// Try to load integrations manager if it exists
let IntegrationsManager;
try {
  IntegrationsManager = require('./integrations-manager');
} catch (e) {
  // Integrations manager doesn't exist yet, that's ok
}

// Extension Manager
let ExtensionManager;
try {
  ExtensionManager = require('./extension-manager');
} catch (e) {
  console.warn('Extension manager not available:', e.message);
}

// Set app name early for dialogs and window titles
app.setName('Omega OS');

let desktopWindow; // Main desktop environment window
let appWindows = new Map(); // Track all application windows
let isDev = process.argv.includes('--dev');
let wallet = new OmegaWallet();
let identityManager = new OmegaIdentityManager();
let integrationsManager = IntegrationsManager ? new IntegrationsManager() : null;
let extensionManager = ExtensionManager ? new ExtensionManager() : null;

// Ad Blocker Configuration
let adBlockerEnabled = true; // Default enabled
const AD_TRACKER_DOMAINS = [
  // Common ad networks
  'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'facebook.com/tr', 'facebook.net', 'fbcdn.net',
  'amazon-adsystem.com', 'adsystem.amazon.com',
  'advertising.com', 'adnxs.com', 'openx.net', 'pubmatic.com',
  'rubiconproject.com', 'criteo.com', 'outbrain.com', 'taboola.com',
  // Tracking
  'scorecardresearch.com', 'quantserve.com', 'moatads.com',
  'adform.net', 'adtechus.com', 'advertising.com',
  // Common patterns
  '/ads/', '/ad/', '/advertisement', '/banner', '/tracking',
  'ads.', 'ad.', 'tracking.', 'analytics.', 'metrics.'
];

// ISOLATED ENVIRONMENT: All data stored in isolated directory
const ISOLATED_DATA_PATH = path.join(app.getPath('userData'), 'isolated-env');
const ISOLATED_DOCUMENTS_PATH = path.join(ISOLATED_DATA_PATH, 'documents');
const ISOLATED_TRASH_PATH = path.join(ISOLATED_DATA_PATH, 'trash');
const ISOLATED_DESKTOP_PATH = path.join(ISOLATED_DATA_PATH, 'desktop');
const fs = require('fs');
if (!fs.existsSync(ISOLATED_DATA_PATH)) {
  fs.mkdirSync(ISOLATED_DATA_PATH, { recursive: true });
}
if (!fs.existsSync(ISOLATED_DOCUMENTS_PATH)) {
  fs.mkdirSync(ISOLATED_DOCUMENTS_PATH, { recursive: true });
}
if (!fs.existsSync(ISOLATED_TRASH_PATH)) {
  fs.mkdirSync(ISOLATED_TRASH_PATH, { recursive: true });
}
if (!fs.existsSync(ISOLATED_DESKTOP_PATH)) {
  fs.mkdirSync(ISOLATED_DESKTOP_PATH, { recursive: true });
}

// SECURITY: Strict session configuration
// Note: File protocol interception disabled - it conflicts with sandbox mode
// File access is already restricted by sandbox mode and context isolation

// VPN/Proxy Configuration
// To use a VPN/proxy, set the OMEGA_PROXY environment variable
// Example: OMEGA_PROXY=socks5://127.0.0.1:1080 npm start
// Or configure a proxy server here:
const PROXY_SERVER = process.env.OMEGA_PROXY || null;

function createDesktopWindow() {
  desktopWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a1a',
    fullscreen: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: true, // STRICT SANDBOX MODE
      webviewTag: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false
  });

  desktopWindow.loadFile('desktop.html');

  desktopWindow.once('ready-to-show', () => {
    desktopWindow.show();
    // Only show DevTools in development mode
    if (isDev) {
      desktopWindow.webContents.openDevTools();
    }
  });
  
  // Handle errors
  desktopWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription, validatedURL);
  });

  desktopWindow.on('closed', () => {
    desktopWindow = null;
    // Close all app windows when desktop closes
    appWindows.forEach((win) => win.close());
    appWindows.clear();
  });
}

function createAppWindow(appType, options = {}) {
  let appFile, width, height, loadUrl = null;
  
  if (appType === 'browser') {
    appFile = 'browser.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'terminal') {
    appFile = 'terminal.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'word') {
    appFile = 'word.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'sheets') {
    appFile = 'sheets.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'slides') {
    appFile = 'slides.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'filemanager') {
    appFile = 'filemanager.html';
    width = options.width || 900;
    height = options.height || 600;
  } else if (appType === 'webapp') {
    // Web app wrapper
    appFile = 'webapp-wrapper.html';
    width = options.width || 1200;
    height = options.height || 800;
    loadUrl = options.url;
  } else if (appType === 'integrations') {
    appFile = 'integrations-manager.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'encrypt') {
    appFile = 'encrypt.html';
    width = options.width || 800;
    height = options.height || 600;
  } else if (appType === 'privacy-monitor') {
    appFile = 'privacy-monitor.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'firewall') {
    appFile = 'firewall.html';
    width = options.width || 900;
    height = options.height || 700;
  } else if (appType === 'calculator') {
    appFile = 'calculator.html';
    width = options.width || 400;
    height = options.height || 600;
  } else if (appType === 'wallet') {
    appFile = 'wallet.html';
    width = options.width || 600;
    height = options.height || 700;
  } else if (appType === 'identity') {
    appFile = 'identity.html';
    width = options.width || 800;
    height = options.height || 700;
  } else if (appType === 'cookie-manager') {
    appFile = 'cookie-manager.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'ai-dev') {
    appFile = 'ai-dev.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else {
    return null;
  }

  // Special configuration for wallet (offline/cold storage)
  const isWallet = appType === 'wallet';
  
  const appWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    parent: desktopWindow,
    modal: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: true, // STRICT SANDBOX FOR ALL APPS
      webviewTag: !isWallet, // Disable webview for wallet (offline mode)
      // OFFLINE MODE: Disable network access for wallet
      ...(isWallet && {
        partition: 'offline-wallet', // Isolated session with no network
      }),
    },
    show: false
  });
  
  // Wallet starts in cold storage mode (offline)
  // Network access can be enabled via IPC when user toggles hot wallet mode
  // We'll handle this dynamically via IPC messages
  if (isWallet) {
    const walletSession = appWindow.webContents.session;
    
    // Start with network blocked (cold storage)
    let networkEnabled = false;
    
    // Block all HTTP/HTTPS requests by default
    walletSession.webRequest.onBeforeRequest((details, callback) => {
      // Allow only file:// protocol for local files
      if (details.url.startsWith('file://')) {
        callback({});
      } else if (networkEnabled) {
        // Allow network requests when hot wallet mode is enabled
        callback({});
      } else {
        // Block all other network requests (cold storage mode)
        callback({ cancel: true });
      }
    }, { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] });
    
    // IPC handler to toggle network access
    ipcMain.handle('wallet-toggle-network', (event, enable) => {
      // Only allow if this is the wallet window
      if (appWindow && appWindow.webContents.id === event.sender.id) {
        networkEnabled = enable;
        return true;
      }
      return false;
    });
    
    // Disable webview tag completely (always)
    walletSession.setPermissionRequestHandler(() => false);
    walletSession.setPermissionCheckHandler(() => false);
  }

  const windowId = Date.now();
  appWindows.set(windowId, { 
    window: appWindow, 
    type: appType, 
    id: windowId,
    snapped: false,
    snapPosition: null
  });

  // Send window ID and file path to renderer
  appWindow.webContents.once('did-finish-load', () => {
    appWindow.webContents.send('app-window-id', windowId);
    if (options.filePath) {
      appWindow.webContents.send('open-file', options.filePath);
    }
  });

  // Load the app
  if (loadUrl) {
    // For web apps, send URL via IPC after load
    appWindow.webContents.once('did-finish-load', () => {
      appWindow.webContents.send('webapp-url', loadUrl);
    });
    appWindow.loadFile(appFile);
  } else {
    appWindow.loadFile(appFile);
  }

  appWindow.once('ready-to-show', () => {
    if (appType === 'slides') {
      appWindow.maximize();
    }
    appWindow.show();
    // DevTools disabled - only show in development mode if needed
    // if (appType === 'firewall' && isDev) {
    //   appWindow.webContents.openDevTools();
    // }
  });

  // Window Snapping - Track window movement and snap to edges
  let snapTimeout = null;
  const SNAP_THRESHOLD = 30; // pixels from edge to trigger snap
  
  appWindow.on('will-move', (event, newBounds) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.snapped) {
      // If window is snapped and user is trying to move, allow unsnap
      appData.snapped = false;
      appData.snapPosition = null;
    }
  });

  // Check for snapping during window movement
  appWindow.on('move', () => {
    if (appWindow.isMaximized()) return;
    
    const bounds = appWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const appData = appWindows.get(windowId);
    if (!appData) return;
    
    // Only apply snap if we're not currently snapped (to avoid conflicts during dragging)
    if (appData.snapped) return;
    
    let snapPosition = null;
    
    // Check if near left edge
    if (bounds.x <= SNAP_THRESHOLD && bounds.x >= -10) {
      snapPosition = 'left';
    }
    // Check if near right edge
    else if (bounds.x + bounds.width >= screenWidth - SNAP_THRESHOLD && bounds.x + bounds.width <= screenWidth + 10) {
      snapPosition = 'right';
    }
    
    // Apply snap immediately when near edge
    if (snapPosition) {
      // Clear any pending timeout
      if (snapTimeout) {
        clearTimeout(snapTimeout);
      }
      
      // Apply snap after a very short delay to allow dragging to continue smoothly
      snapTimeout = setTimeout(() => {
        const currentBounds = appWindow.getBounds();
        const currentAppData = appWindows.get(windowId);
        if (!currentAppData || currentAppData.snapped || appWindow.isMaximized()) return;
        
        // Double-check we're still near the edge
        const stillNearLeft = currentBounds.x <= SNAP_THRESHOLD && currentBounds.x >= -10;
        const stillNearRight = currentBounds.x + currentBounds.width >= screenWidth - SNAP_THRESHOLD && 
                               currentBounds.x + currentBounds.width <= screenWidth + 10;
        
        let finalSnapPosition = null;
        if (stillNearLeft) {
          finalSnapPosition = 'left';
        } else if (stillNearRight) {
          finalSnapPosition = 'right';
        }
        
        if (finalSnapPosition) {
          currentAppData.snapped = true;
          currentAppData.snapPosition = finalSnapPosition;
          
          let newBounds = {};
          switch(finalSnapPosition) {
            case 'left':
              newBounds = { 
                x: 0, 
                y: 0, 
                width: Math.floor(screenWidth / 2), 
                height: Math.floor(screenHeight) 
              };
              break;
            case 'right':
              newBounds = { 
                x: Math.floor(screenWidth / 2), 
                y: 0, 
                width: Math.floor(screenWidth / 2), 
                height: Math.floor(screenHeight) 
              };
              break;
          }
          
          // Validate bounds before setting - ensure all values are valid integers
          if (newBounds.x !== undefined && newBounds.y !== undefined && 
              newBounds.width > 0 && newBounds.height > 0 &&
              !isNaN(newBounds.x) && !isNaN(newBounds.y) &&
              !isNaN(newBounds.width) && !isNaN(newBounds.height) &&
              isFinite(newBounds.x) && isFinite(newBounds.y) &&
              isFinite(newBounds.width) && isFinite(newBounds.height) &&
              screenWidth > 0 && screenHeight > 0) {
            try {
              // Ensure all values are integers
              const validatedBounds = {
                x: Math.floor(newBounds.x),
                y: Math.floor(newBounds.y),
                width: Math.floor(newBounds.width),
                height: Math.floor(newBounds.height)
              };
              appWindow.setBounds(validatedBounds);
            } catch (error) {
              console.error('Error setting window bounds:', error, newBounds, { screenWidth, screenHeight });
            }
          } else {
            console.error('Invalid bounds - skipping setBounds', { newBounds, screenWidth, screenHeight });
          }
        }
      }, 100); // Small delay to allow dragging
    } else {
      // Not near edge, clear any pending snap
      if (snapTimeout) {
        clearTimeout(snapTimeout);
        snapTimeout = null;
      }
    }
  });

  appWindow.on('closed', () => {
    appWindows.delete(windowId);
    // Notify desktop that window closed
    if (desktopWindow && !desktopWindow.isDestroyed()) {
      desktopWindow.webContents.send('app-window-closed', windowId);
      // Ensure desktop window regains focus and stays visible when child window closes
      desktopWindow.focus();
      if (desktopWindow.isMinimized()) {
        desktopWindow.restore();
      }
      desktopWindow.show();
    }
  });

  return windowId;
}

// IPC Handlers Setup
function setupIPCHandlers() {
  ipcMain.on('desktop-minimize', () => {
    if (desktopWindow) desktopWindow.minimize();
  });

  ipcMain.on('desktop-maximize', () => {
    if (desktopWindow) {
      if (desktopWindow.isMaximized()) {
        desktopWindow.unmaximize();
      } else {
        desktopWindow.maximize();
      }
    }
  });

  ipcMain.on('desktop-close', () => {
    if (desktopWindow) desktopWindow.close();
  });

  ipcMain.handle('desktop-is-maximized', () => {
    return desktopWindow ? desktopWindow.isMaximized() : false;
  });


  ipcMain.handle('app-window-is-maximized', (event, windowId) => {
    const appData = appWindows.get(windowId);
    return appData && appData.window ? appData.window.isMaximized() : false;
  });

  // Launch Application
  ipcMain.handle('launch-app', (event, appType, options) => {
    return createAppWindow(appType, options);
  });

  ipcMain.handle('get-open-windows', () => {
    const windows = [];
    appWindows.forEach((appData) => {
      windows.push({
        id: appData.id,
        type: appData.type,
        isMaximized: appData.window.isMaximized(),
        isMinimized: appData.window.isMinimized()
      });
    });
    return windows;
  });

  ipcMain.handle('focus-window', (event, windowId) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      appData.window.focus();
      if (appData.window.isMinimized()) {
        appData.window.restore();
      }
    }
  });

  // Window Snapping Handlers
  ipcMain.on('app-window-move', (event, windowId, x, y) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      const bounds = appData.window.getBounds();
      appData.window.setBounds({ x: x, y: y, width: bounds.width, height: bounds.height });
    }
  });

  ipcMain.on('app-window-snap', (event, windowId, snapPosition) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      const screenSize = appData.window.getBounds();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      let newBounds = {};
      
      switch(snapPosition) {
        case 'left':
          newBounds = { 
            x: 0, 
            y: 0, 
            width: Math.floor(screenWidth / 2), 
            height: Math.floor(screenHeight) 
          };
          break;
        case 'right':
          newBounds = { 
            x: Math.floor(screenWidth / 2), 
            y: 0, 
            width: Math.floor(screenWidth / 2), 
            height: Math.floor(screenHeight) 
          };
          break;
        case 'top':
          newBounds = { 
            x: 0, 
            y: 0, 
            width: Math.floor(screenWidth), 
            height: Math.floor(screenHeight / 2) 
          };
          break;
        case 'bottom':
          newBounds = { 
            x: 0, 
            y: Math.floor(screenHeight / 2), 
            width: Math.floor(screenWidth), 
            height: Math.floor(screenHeight / 2) 
          };
          break;
        case 'full':
          newBounds = { 
            x: 0, 
            y: 0, 
            width: Math.floor(screenWidth), 
            height: Math.floor(screenHeight) 
          };
          break;
        case 'unsnap':
          // Restore to previous size (store this when snapping)
          return;
      }
      
      // Validate bounds before setting
      if (newBounds.x !== undefined && newBounds.y !== undefined && 
          newBounds.width > 0 && newBounds.height > 0 &&
          !isNaN(newBounds.x) && !isNaN(newBounds.y) &&
          !isNaN(newBounds.width) && !isNaN(newBounds.height) &&
          isFinite(newBounds.x) && isFinite(newBounds.y) &&
          isFinite(newBounds.width) && isFinite(newBounds.height)) {
        try {
          appData.window.setBounds(newBounds);
          appData.snapped = snapPosition !== 'unsnap';
          appData.snapPosition = snapPosition;
        } catch (error) {
          console.error('Error setting window bounds:', error, newBounds);
        }
      }
      appData.snapped = snapPosition !== 'unsnap';
      appData.snapPosition = snapPosition;
    }
  });

  // Multiple Desktops Handlers
  let currentDesktopIndex = 0;
  const desktopWindows = new Map(); // Map of desktop index to window IDs
  desktopWindows.set(0, []); // Initialize desktop 0

  ipcMain.handle('desktop-switch', (event, desktopIndex) => {
    if (desktopIndex < 0) return { success: false, error: 'Invalid desktop index' };
    
    // Hide windows from current desktop
    const currentWindows = desktopWindows.get(currentDesktopIndex) || [];
    currentWindows.forEach(windowId => {
      const appData = appWindows.get(windowId);
      if (appData && appData.window) {
        appData.window.hide();
      }
    });
    
    // Show windows for new desktop
    currentDesktopIndex = desktopIndex;
    if (!desktopWindows.has(desktopIndex)) {
      desktopWindows.set(desktopIndex, []);
    }
    
    const newWindows = desktopWindows.get(desktopIndex) || [];
    newWindows.forEach(windowId => {
      const appData = appWindows.get(windowId);
      if (appData && appData.window) {
        appData.window.show();
      }
    });
    
    return { success: true, desktopIndex: currentDesktopIndex };
  });

  ipcMain.handle('desktop-create', () => {
    const newIndex = desktopWindows.size;
    desktopWindows.set(newIndex, []);
    return { success: true, desktopIndex: newIndex };
  });

  ipcMain.handle('desktop-get-current', () => {
    return { success: true, desktopIndex: currentDesktopIndex };
  });

  // Track which desktop a window belongs to
  ipcMain.on('app-window-set-desktop', (event, windowId, desktopIndex) => {
    // Remove from current desktop
    desktopWindows.forEach((windows, index) => {
      const idx = windows.indexOf(windowId);
      if (idx > -1) {
        windows.splice(idx, 1);
      }
    });
    
    // Add to new desktop
    if (!desktopWindows.has(desktopIndex)) {
      desktopWindows.set(desktopIndex, []);
    }
    desktopWindows.get(desktopIndex).push(windowId);
    
    // Hide/show based on current desktop
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      if (desktopIndex === currentDesktopIndex) {
        appData.window.show();
      } else {
        appData.window.hide();
      }
    }
  });

  // Get window ID from sender
  ipcMain.handle('get-window-id', (event) => {
    // Find window by webContents
    for (const [id, appData] of appWindows.entries()) {
      if (appData.window.webContents.id === event.sender.id) {
        return id;
      }
    }
    return null;
  });
  
  // Auto-detect window ID for app window controls
  ipcMain.on('app-window-minimize', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) appData.window.minimize();
  });

  ipcMain.on('app-window-maximize', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) {
      if (appData.window.isMaximized()) {
        appData.window.unmaximize();
      } else {
        appData.window.maximize();
      }
    }
  });

  ipcMain.on('app-window-close', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) appData.window.close();
  });

  // Wallet IPC Handlers
  ipcMain.handle('wallet-create', async (event, password, secretKeyBase64 = null) => {
    try {
      return await wallet.createWallet(password, secretKeyBase64);
    } catch (error) {
      throw error;
    }
  });
  
  ipcMain.handle('wallet-import-from-private-key', async (event, privateKeyBase58, password) => {
    try {
      const bs58 = require('bs58');
      const { Keypair } = require('@solana/web3.js');
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
      const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      return await wallet.createWallet(password, secretKeyBase64);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-load', async (event, password) => {
    try {
      return await wallet.loadWallet(password);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-balance', async () => {
    try {
      return await wallet.getBalance();
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-public-key', () => {
    return wallet.getPublicKey();
  });

  ipcMain.handle('wallet-send-sol', async (event, toAddress, amount) => {
    try {
      return await wallet.sendSol(toAddress, amount);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-has-wallet', () => {
    return wallet.hasWallet();
  });

  ipcMain.handle('wallet-is-loaded', () => {
    return wallet.isLoaded();
  });

  ipcMain.handle('wallet-sign-transaction', async (event, transactionData) => {
    try {
      const { Transaction } = require('@solana/web3.js');
      const transaction = Transaction.from(Buffer.from(transactionData, 'base64'));
      const signed = await wallet.signTransaction(transaction);
      return signed.serialize({ requireAllSignatures: false }).toString('base64');
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-sign-message', async (event, message) => {
    try {
      return await wallet.signMessage(message);
    } catch (error) {
      throw error;
    }
  });

  // Extension IPC Handlers - Removed (extensions not supported, using WalletConnect instead)
  ipcMain.handle('extensions-get-loaded', async () => {
    // Extensions removed - return empty array
    return [];
  });

  // Get preload script path for webviews
  ipcMain.handle('get-preload-path', () => {
    return path.join(__dirname, 'webview-preload.js');
  });

  // Extension popup handler - Removed (extensions not supported)
  ipcMain.handle('extensions-open-popup', async (event, electronExtensionId) => {
    // Extensions removed - return failure
    return { success: false, error: 'Extensions not supported. Use WalletConnect instead.' };
  });

  // EVM Wallet Handlers
  ipcMain.handle('wallet-get-evm-address', () => {
    return wallet.getEvmAddress();
  });

  ipcMain.handle('wallet-get-evm-balance', async (event, chainId) => {
    try {
      return await wallet.getEvmBalance(chainId || 1);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-sign-evm-transaction', async (event, transaction) => {
    try {
      return await wallet.signEvmTransaction(transaction);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-sign-evm-message', async (event, message) => {
    try {
      return await wallet.signEvmMessage(message);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-send-evm-transaction', async (event, to, value, data, chainId) => {
    try {
      return await wallet.sendEvmTransaction(to, value, data, chainId || 1);
    } catch (error) {
      throw error;
    }
  });

  // Omega Wallet Provider IPC Handlers (for webview preload)
  ipcMain.handle('omega-wallet-request', async (event, request) => {
    try {
      let response;
      
      switch (request.action) {
        case 'connect':
          const publicKey = wallet.getPublicKey();
          if (!publicKey) {
            response = { error: 'Wallet not unlocked. Please unlock Omega Wallet first.' };
          } else {
            response = { publicKey: publicKey };
          }
          break;
          
        case 'signTransaction':
          // request.data is base64 encoded serialized transaction
          // We need to deserialize, sign, and return base64
          try {
            const { Transaction } = require('@solana/web3.js');
            const transactionBytes = Buffer.from(request.data, 'base64');
            const transaction = Transaction.from(transactionBytes);
            const signedTx = await wallet.signTransaction(transaction);
            const serialized = signedTx.serialize();
            const base64 = Buffer.from(serialized).toString('base64');
            response = { data: base64 };
          } catch (error) {
            response = { error: error.message };
          }
          break;
          
        case 'signMessage':
          // request.data is the message string
          try {
            const signature = await wallet.signMessage(request.data);
            // Return base64 encoded signature bytes
            const { bs58 } = require('bs58');
            const signatureBytes = bs58.decode(signature);
            const base64 = Buffer.from(signatureBytes).toString('base64');
            response = { data: base64 };
          } catch (error) {
            response = { error: error.message };
          }
          break;
          
        default:
          response = { error: 'Unknown action' };
      }
      
      return response;
    } catch (error) {
      return { error: error.message };
    }
  });

  ipcMain.handle('omega-evm-request', async (event, request) => {
    try {
      let response;
      
      switch (request.method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          const evmAddress = wallet.getEvmAddress();
          if (!evmAddress) {
            response = { error: 'Wallet not unlocked. Please unlock Omega Wallet first.' };
          } else {
            response = { result: [evmAddress] };
          }
          break;
          
        case 'eth_chainId':
          response = { result: '0x1' }; // Ethereum mainnet
          break;
          
        case 'eth_getBalance':
          const address = request.params[0];
          const chainId = parseInt(request.params[1] || '0x1', 16);
          const balance = await wallet.getEvmBalance(chainId);
          const balanceWei = BigInt(Math.floor(parseFloat(balance) * 1e18)).toString(16);
          response = { result: '0x' + balanceWei };
          break;
          
        case 'eth_sendTransaction':
          const tx = request.params[0];
          const valueHex = tx.value || '0x0';
          const valueWei = BigInt(valueHex);
          const valueEth = (Number(valueWei) / 1e18).toString();
          const txChainId = parseInt(tx.chainId || '0x1', 16);
          const txHash = await wallet.sendEvmTransaction(tx.to, valueEth, tx.data || '0x', txChainId);
          response = { result: txHash };
          break;
          
        case 'eth_sign':
        case 'personal_sign':
          const message = request.params[0] || request.params[1];
          const signature = await wallet.signEvmMessage(message);
          response = { result: signature };
          break;
          
        case 'eth_signTransaction':
          const signedTx = await wallet.signEvmTransaction(request.params[0]);
          response = { result: signedTx };
          break;
          
        default:
          response = { error: 'Method not supported: ' + request.method };
      }
      
      return response;
    } catch (error) {
      return { error: error.message };
    }
  });

  ipcMain.handle('wallet-export-private-key', async (event, password) => {
    try {
      return await wallet.exportPrivateKey(password);
    } catch (error) {
      throw error;
    }
  });

  // Omega Identity IPC Handlers
  ipcMain.handle('identity-initialize', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded. Please unlock wallet first.' };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available.' };
      }
      
      const result = await identityManager.createOrLoadIdentity(evmWallet);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-get', () => {
    try {
      const identity = identityManager.getIdentity();
      if (!identity) {
        return { success: false, error: 'Identity not initialized' };
      }
      return { success: true, identity: identity };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-has-identity', () => {
    return identityManager.hasIdentity();
  });

  ipcMain.handle('identity-sync-document', async (event, documentId, documentHash, metadata) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }
      
      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.syncDocumentHash(documentId, documentHash, metadata);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-get-synced-documents', async () => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, documents: [] };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, documents: [] };
      }
      
      await identityManager.initializeProvider(evmWallet);
      const documents = await identityManager.getSyncedDocuments();
      return { success: true, documents: documents };
    } catch (error) {
      return { success: false, documents: [], error: error.message };
    }
  });

  ipcMain.handle('identity-check-license', async (event, appName) => {
    try {
      if (!wallet.isLoaded()) {
        return { hasLicense: false, reason: 'Wallet not loaded' };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { hasLicense: false, reason: 'EVM wallet not available' };
      }
      
      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.checkLicense(appName);
      return result;
    } catch (error) {
      return { hasLicense: false, reason: error.message };
    }
  });

  ipcMain.handle('identity-purchase-license', async (event, appName, price) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }
      
      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.purchaseLicense(appName, price);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-authenticate', async (event, message) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }
      
      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }
      
      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.authenticate(message);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-verify-signature', async (event, message, signature, address) => {
    try {
      const isValid = await identityManager.verifySignature(message, signature, address);
      return { success: true, isValid: isValid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // AI Service IPC Handlers
  ipcMain.handle('ai-chat', async (event, message, history = []) => {
    try {
      const response = await aiService.chat(message, history);
      return { success: true, response };
    } catch (error) {
      console.error('[AI IPC] Chat error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-summarize-page', async (event, content, maxLength = 200) => {
    try {
      const summary = await aiService.summarizePage(content, maxLength);
      return { success: true, summary };
    } catch (error) {
      console.error('[AI IPC] Summarize page error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-improve-text', async (event, text, style = 'neutral', task = 'improve') => {
    try {
      const improved = await aiService.improveText(text, style, task);
      return { success: true, text: improved };
    } catch (error) {
      console.error('[AI IPC] Improve text error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-suggest-formula', async (event, description, dataContext = null) => {
    try {
      const formula = await aiService.suggestFormula(description, dataContext);
      return { success: true, formula };
    } catch (error) {
      console.error('[AI IPC] Suggest formula error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-analyze-data', async (event, dataDescription, dataSample = null) => {
    try {
      const analysis = await aiService.analyzeData(dataDescription, dataSample);
      return { success: true, analysis };
    } catch (error) {
      console.error('[AI IPC] Analyze data error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update AI configuration for specific app
  ipcMain.handle('update-ai-config', async (event, appName, config) => {
    try {
      aiService.updateAppConfig(appName, config);
      return { success: true };
    } catch (error) {
      console.error('[AI IPC] Update config error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get AI configuration for specific app
  ipcMain.handle('get-ai-config', async (event, appName) => {
    try {
      const config = aiService.getAppConfig(appName);
      return { success: true, config };
    } catch (error) {
      console.error('[AI IPC] Get config error:', error);
      return { success: false, error: error.message };
    }
  });

  // Switch AI model for specific app type (Word, Excel, PowerPoint)
  ipcMain.handle('ai-switch-model-for-app', async (event, appType) => {
    try {
      const model = await aiService.switchModelForApp(appType);
      return { success: true, model };
    } catch (error) {
      console.error('[AI IPC] Switch model error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get recommended models for content generation
  ipcMain.handle('ai-get-content-models', async (event) => {
    try {
      const models = aiService.getRecommendedContentModels();
      return { success: true, models };
    } catch (error) {
      console.error('[AI IPC] Get content models error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get recommended models for code generation
  ipcMain.handle('ai-get-code-models', async (event) => {
    try {
      const models = aiService.getRecommendedCodeModels();
      return { success: true, models };
    } catch (error) {
      console.error('[AI IPC] Get code models error:', error);
      return { success: false, error: error.message };
    }
  });

  // Select best available model automatically
  ipcMain.handle('ai-select-best-model', async (event, preferenceList = null) => {
    try {
      const model = await aiService.selectBestAvailableModel(preferenceList);
      return { success: true, model };
    } catch (error) {
      console.error('[AI IPC] Select best model error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-check-ready', async () => {
    try {
      const check = await aiService.checkOllama();
      return { ready: check.available, loading: aiService.isLoadingModel(), available: check.available };
    } catch (error) {
      return { ready: false, loading: false, available: false, error: error.message };
    }
  });

  ipcMain.handle('ai-get-models', async () => {
    try {
      const models = await aiService.getAvailableModels();
      return { success: true, models };
    } catch (error) {
      return { success: false, error: error.message, models: [] };
    }
  });

  ipcMain.handle('ai-set-model', async (event, modelName) => {
    try {
      aiService.setModel(modelName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-get-current-model', async () => {
    try {
      return { success: true, model: aiService.getCurrentModel() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Stable Diffusion Service IPC Handlers
  ipcMain.handle('sd-generate-image', async (event, prompt, negativePrompt = '', width = 512, height = 512, steps = 20, cfgScale = 7, seed = -1) => {
    try {
      const result = await sdService.generateImage(prompt, negativePrompt, width, height, steps, cfgScale, seed);
      return { success: true, ...result };
    } catch (error) {
      console.error('[SD IPC] Generate image error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sd-check-ready', async () => {
    try {
      const check = await sdService.checkStableDiffusion();
      return { ready: check.available, available: check.available, apiType: check.apiType || null };
    } catch (error) {
      return { ready: false, available: false, error: error.message };
    }
  });

  ipcMain.handle('sd-get-models', async () => {
    try {
      const models = await sdService.getModels();
      return { success: true, models };
    } catch (error) {
      return { success: false, error: error.message, models: [] };
    }
  });

  ipcMain.handle('sd-set-model', async (event, modelName) => {
    try {
      const result = await sdService.setModel(modelName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-get-recommended-models', async () => {
    try {
      return { success: true, models: aiService.getRecommendedCodeModels() };
    } catch (error) {
      return { success: false, error: error.message, models: [] };
    }
  });

  ipcMain.handle('ai-pull-model', async (event, modelName) => {
    try {
      const axios = require('axios');
      const ollamaUrl = 'http://127.0.0.1:11434';
      
      // Start pull request
      await axios.post(`${ollamaUrl}/api/pull`, {
        name: modelName,
        stream: false
      }, { timeout: 600000 }); // 10 minute timeout
      
      return { success: true };
    } catch (error) {
      console.error('[AI] Pull model error:', error);
      return { success: false, error: error.message };
    }
  });

  // Fetch Website HTML
  ipcMain.handle('fetch-website', async (event, url) => {
    try {
      const https = require('https');
      const http = require('http');
      const { URL } = require('url');
      
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve) => {
        const request = client.get(url, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            resolve({ success: true, html: data });
          });
        });
        
        request.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
        
        request.setTimeout(10000, () => {
          request.destroy();
          resolve({ success: false, error: 'Request timeout' });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // File Operations (isolated environment only)
  ipcMain.handle('save-file-dialog', async (event, options = {}) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(window, {
        title: 'Save File',
        defaultPath: options.defaultPath ? path.join(ISOLATED_DOCUMENTS_PATH, options.defaultPath) : ISOLATED_DOCUMENTS_PATH,
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] }
        ],
        // Restrict to isolated documents directory
        properties: ['createDirectory']
      });
      
      // Validate that the save path is within isolated environment
      if (result.filePath && !result.filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File operations are restricted to the isolated environment');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('open-file-dialog', async (event, options = {}) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window, {
        title: 'Open File',
        defaultPath: ISOLATED_DOCUMENTS_PATH,
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      // Validate that all selected files are within isolated environment
      if (result.filePaths) {
        for (const filePath of result.filePaths) {
          if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
            throw new Error('File operations are restricted to the isolated environment');
          }
        }
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('read-file', async (event, filePath, encoding = 'utf8') => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      if (encoding === 'base64') {
        // Return as base64 for binary files
        const buffer = fs.readFileSync(filePath);
        return buffer.toString('base64');
      } else {
        // Return as text (UTF-8)
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('write-file', async (event, filePath, content, encoding = 'utf8') => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (encoding === 'base64') {
        // Write binary file from base64
        const buffer = Buffer.from(content, 'base64');
        fs.writeFileSync(filePath, buffer);
      } else {
        // Write as text (UTF-8)
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      return true;
    } catch (error) {
      throw error;
    }
  });

  // File conversion handlers
  ipcMain.handle('convert-to-docx', async (event, htmlContent, filePath) => {
    try {
      // Validate path
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Validate input
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('Invalid HTML content provided');
      }
      
      // Polyfill browser APIs if needed (some libraries might expect them)
      if (typeof File === 'undefined') {
        global.File = class File {
          constructor(bits, name, options = {}) {
            this.name = name;
            this.lastModified = options.lastModified || Date.now();
            this.size = Array.isArray(bits) ? bits.reduce((sum, b) => sum + (b.byteLength || b.length || 0), 0) : (bits?.length || 0);
            this.type = options.type || '';
            this._bits = bits;
          }
        };
      }
      
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
      
      // Parse HTML and convert to docx format
      const cheerio = require('cheerio');
      const $ = cheerio.load(htmlContent || '<body></body>');
      
      const children = [];
      const processed = new Set();
      
      // Process block-level elements only (to avoid duplicates)
      const blockElements = $('h1, h2, h3, h4, h5, h6, p, div, li');
      
      blockElements.each((i, elem) => {
        // Skip if this element is inside another block element we've already processed
        let parent = $(elem).parent()[0];
        let skip = false;
        while (parent) {
          if (processed.has(parent)) {
            skip = true;
            break;
          }
          parent = $(parent).parent()[0];
        }
        
        if (skip) return;
        processed.add(elem);
        
        const tag = elem.tagName?.toLowerCase();
        const text = $(elem).text().trim();
        
        if (!text) return;
        
        // Handle headings
        if (tag === 'h1') {
          children.push(new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_1
          }));
        } else if (tag === 'h2') {
          children.push(new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_2
          }));
        } else if (tag === 'h3') {
          children.push(new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_3
          }));
        } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
          children.push(new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_3 // Use H3 for smaller headings
          }));
        } else if (tag === 'p' || tag === 'div' || tag === 'li') {
          // Check for formatting
          const runs = [];
          $(elem).contents().each((j, node) => {
            if (node.type === 'text') {
              const nodeText = node.data.trim();
              if (nodeText) {
                runs.push(new TextRun(nodeText));
              }
            } else if (node.tagName === 'strong' || node.tagName === 'b') {
              const nodeText = $(node).text().trim();
              if (nodeText) {
                runs.push(new TextRun({ text: nodeText, bold: true }));
              }
            } else if (node.tagName === 'em' || node.tagName === 'i') {
              const nodeText = $(node).text().trim();
              if (nodeText) {
                runs.push(new TextRun({ text: nodeText, italics: true }));
              }
            } else if (node.tagName === 'u') {
              const nodeText = $(node).text().trim();
              if (nodeText) {
                runs.push(new TextRun({ text: nodeText, underline: {} }));
              }
            }
          });
          
          if (runs.length === 0) {
            runs.push(new TextRun(text));
          }
          
          children.push(new Paragraph({ children: runs }));
        }
      });
      
      // If no children, add the plain text
      if (children.length === 0) {
        const plainText = $('body').text() || htmlContent.replace(/<[^>]*>/g, '').trim();
        if (plainText) {
          children.push(new Paragraph({ text: plainText }));
        }
      }
      
      const doc = new Document({
        sections: [{
          children: children
        }]
      });
      
      // Generate and save
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
      return { success: true };
    } catch (error) {
      console.error('DOCX conversion error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      return { success: false, error: error.message + (error.stack ? '\n' + error.stack.split('\n')[0] : '') };
    }
  });

  ipcMain.handle('convert-to-pptx', async (event, slidesData, filePath) => {
    try {
      // Validate path
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Ensure directory exists first
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Polyfill browser APIs for Node.js
      if (typeof File === 'undefined') {
        global.File = class File {
          constructor(bits, name, options = {}) {
            this.name = name;
            this.lastModified = options.lastModified || Date.now();
            this.size = Array.isArray(bits) ? bits.reduce((sum, b) => sum + (b.byteLength || b.length || 0), 0) : (bits?.length || 0);
            this.type = options.type || '';
            this._bits = bits;
          }
        };
      }
      
      if (typeof Blob === 'undefined') {
        global.Blob = class Blob {
          constructor(parts = [], options = {}) {
            this.size = 0;
            this.type = options.type || '';
            this._parts = parts;
          }
        };
      }
      
      // Use dynamic require to avoid issues
      const PptxGenJS = require('pptxgenjs');
      
      // Create presentation with Node.js compatibility
      const pptx = new PptxGenJS();
      
      // Process each slide
      if (Array.isArray(slidesData) && slidesData.length > 0) {
        slidesData.forEach((slideData, index) => {
          const slide = pptx.addSlide();
          
          // Use default white background
          slide.background = { color: 'FFFFFF' };
          
          // Parse slide content
          const cheerio = require('cheerio');
          const $ = cheerio.load(slideData.content || '');
          
          // Extract all text content
          const allText = $('body').text() || $('*').text() || '';
          const textLines = allText.split('\n').filter(line => line.trim().length > 0);
          
          // Extract text boxes and content more carefully
          const textBoxes = $('.slide-textbox');
          let yPos = 0.5;
          
          if (textBoxes.length > 0) {
            textBoxes.each((i, elem) => {
              const text = $(elem).text().trim();
              if (text && text.length > 0) {
                const isTitle = i === 0 && text.length < 100;
                slide.addText(text, {
                  x: 0.5,
                  y: yPos,
                  w: 9,
                  h: isTitle ? 1 : 0.5,
                  fontSize: isTitle ? 32 : 14,
                  bold: isTitle,
                  align: isTitle ? 'center' : 'left'
                });
                yPos += isTitle ? 1.5 : 0.7;
              }
            });
          } else {
            // Fallback: use text lines
            textLines.forEach((line, i) => {
              if (line.trim()) {
                const isTitle = i === 0;
                slide.addText(line.trim(), {
                  x: 0.5,
                  y: yPos,
                  w: 9,
                  h: isTitle ? 1 : 0.5,
                  fontSize: isTitle ? 32 : 14,
                  bold: isTitle,
                  align: isTitle ? 'center' : 'left'
                });
                yPos += isTitle ? 1.5 : 0.7;
              }
            });
          }
          
          // If still no content, add placeholder
          if (textBoxes.length === 0 && textLines.length === 0) {
            slide.addText(`Slide ${index + 1}`, {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 1,
              fontSize: 32,
              align: 'center'
            });
          }
        });
      } else {
        // Add at least one slide
        const slide = pptx.addSlide();
        slide.addText('Empty Presentation', {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 32,
          align: 'center'
        });
      }
      
      // Save the presentation
      // For Node.js, we need to handle the file writing differently
      // Try using writeFile which should work in Node.js
      try {
        await pptx.writeFile({ fileName: filePath });
      } catch (writeError) {
        // If writeFile fails, try to get buffer and write manually
        console.log('writeFile failed, trying alternative method:', writeError.message);
        // Some versions of pptxgenjs support stream or buffer methods
        if (pptx.write) {
          const buffer = await pptx.write({ outputType: 'nodebuffer' });
          fs.writeFileSync(filePath, buffer);
        } else {
          throw writeError;
        }
      }
      return { success: true };
    } catch (error) {
      console.error('PPTX conversion error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      return { success: false, error: error.message + (error.stack ? '\n' + error.stack.split('\n')[0] : '') };
    }
  });

  ipcMain.handle('convert-to-xlsx', async (event, spreadsheetData, filePath) => {
    try {
      const XLSX = require('xlsx');
      
      // Validate path
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Convert spreadsheet data to worksheet format
      const worksheet = {};
      const maxRow = 100;
      const maxCol = 26;
      const colNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      // Create range
      const range = { s: { c: 0, r: 0 }, e: { c: maxCol - 1, r: maxRow - 1 } };
      
      // Process data
      for (let row = 1; row <= maxRow; row++) {
        for (let col = 0; col < maxCol; col++) {
          const addr = colNames[col] + row;
          const value = spreadsheetData[addr];
          
          if (value !== undefined && value !== null && value !== '') {
            const cellAddress = XLSX.utils.encode_cell({ c: col, r: row - 1 });
            worksheet[cellAddress] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
          }
        }
      }
      
      worksheet['!ref'] = XLSX.utils.encode_range(range);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      XLSX.writeFile(workbook, filePath);
      return { success: true };
    } catch (error) {
      console.error('XLSX conversion error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('convert-to-csv', async (event, spreadsheetData, filePath) => {
    try {
      // Validate path
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Convert spreadsheet data to CSV
      const maxRow = 100;
      const maxCol = 26;
      const colNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const rows = [];
      
      // Find the actual data range
      let maxDataRow = 0;
      let maxDataCol = 0;
      
      for (let row = 1; row <= maxRow; row++) {
        for (let col = 0; col < maxCol; col++) {
          const addr = colNames[col] + row;
          const value = spreadsheetData[addr];
          if (value !== undefined && value !== null && value !== '') {
            maxDataRow = Math.max(maxDataRow, row);
            maxDataCol = Math.max(maxDataCol, col);
          }
        }
      }
      
      // Generate CSV rows
      for (let row = 1; row <= maxDataRow; row++) {
        const csvRow = [];
        for (let col = 0; col <= maxDataCol; col++) {
          const addr = colNames[col] + row;
          const value = spreadsheetData[addr] || '';
          // Escape CSV values (handle quotes and commas)
          const escaped = String(value).replace(/"/g, '""');
          csvRow.push(`"${escaped}"`);
        }
        rows.push(csvRow.join(','));
      }
      
      const csvContent = rows.join('\n');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('CSV conversion error:', error);
      return { success: false, error: error.message };
    }
  });

  // Open isolated folder in file explorer (deprecated - use file manager instead)
  ipcMain.handle('open-isolated-folder', async () => {
    try {
      // Instead of opening system explorer, launch file manager window
      return createAppWindow('filemanager');
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // List files in isolated documents folder
  ipcMain.handle('list-documents', async () => {
    try {
      const files = [];
      if (fs.existsSync(ISOLATED_DOCUMENTS_PATH)) {
        const items = fs.readdirSync(ISOLATED_DOCUMENTS_PATH, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(ISOLATED_DOCUMENTS_PATH, item.name);
          const stats = fs.statSync(fullPath);
          files.push({
            name: item.name,
            path: fullPath,
            isDirectory: item.isDirectory(),
            size: stats.size,
            modified: stats.mtime.getTime(),
            extension: path.extname(item.name).toLowerCase()
          });
        }
      }
      // Sort: directories first, then by name
      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      return files;
    } catch (error) {
      throw error;
    }
  });

  // Open file with appropriate app
  ipcMain.handle('open-file-in-app', async (event, filePath) => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }

      const ext = path.extname(filePath).toLowerCase();
      let appType = null;

      // Determine app based on file extension
      if (['.doc', '.docx', '.txt', '.rtf', '.html', '.htm'].includes(ext)) {
        appType = 'word';
      } else if (['.xls', '.xlsx', '.csv', '.json'].includes(ext)) {
        appType = 'sheets';
      }

      if (appType) {
        const windowId = createAppWindow(appType, { filePath: filePath });
        return { success: true, windowId: windowId };
      } else {
        return { success: false, error: 'Unsupported file type' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Encryption operations (for password manager and security apps)
  ipcMain.handle('encrypt-data', async (event, data, key) => {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('decrypt-data', async (event, encrypted, key) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('hash-password', async (event, password) => {
    try {
      return CryptoJS.SHA256(password).toString();
    } catch (error) {
      throw error;
    }
  });

  // Tor Mode Handler
  ipcMain.handle('set-tor-mode', async (event, enabled) => {
    try {
      if (enabled) {
        // Configure Tor proxy (default Tor SOCKS5 port)
        // Note: This requires Tor to be running locally or a Tor proxy
        session.defaultSession.setProxy({
          proxyRules: 'socks5://127.0.0.1:9050'
        });
        console.log('[Tor] Tor mode enabled - routing through Tor proxy');
      } else {
        // Disable Tor - check if VPN is active, otherwise use no proxy
        if (currentVpnProxy) {
          // VPN is active, keep it
          console.log('[Tor] Tor disabled, VPN proxy still active');
        } else {
          // No VPN, disable all proxies for normal browsing
          session.defaultSession.setProxy({
            proxyRules: ''
          });
          console.log('[Tor] Tor disabled, all proxies cleared for normal browsing');
        }
      }
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  // Ad Blocker Handlers
  ipcMain.handle('adblocker-get-status', () => {
    return { enabled: adBlockerEnabled };
  });

  ipcMain.handle('adblocker-set-status', (event, enabled) => {
    adBlockerEnabled = enabled;
    return { success: true, enabled: adBlockerEnabled };
  });

  // Cookie Manager Handlers
  ipcMain.handle('cookies-get-all', async (event, domain) => {
    try {
      const cookies = await session.defaultSession.cookies.get({ domain: domain || undefined });
      return { success: true, cookies: cookies };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cookies-delete', async (event, url, name) => {
    try {
      await session.defaultSession.cookies.remove(url, name);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cookies-delete-domain', async (event, domain) => {
    try {
      const cookies = await session.defaultSession.cookies.get({ domain: domain });
      for (const cookie of cookies) {
        const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
        await session.defaultSession.cookies.remove(url, cookie.name);
      }
      return { success: true, deleted: cookies.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cookies-get-domains', async () => {
    try {
      const cookies = await session.defaultSession.cookies.get({});
      const domains = new Set();
      cookies.forEach(cookie => {
        const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        domains.add(domain);
      });
      return { success: true, domains: Array.from(domains).sort() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Trash/Recycle Bin Handlers
  ipcMain.handle('trash-list', async () => {
    try {
      const files = [];
      if (fs.existsSync(ISOLATED_TRASH_PATH)) {
        const items = fs.readdirSync(ISOLATED_TRASH_PATH, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(ISOLATED_TRASH_PATH, item.name);
          const stats = fs.statSync(fullPath);
          // Parse metadata if it exists
          let originalPath = fullPath;
          let deletedDate = stats.mtime.getTime();
          const metadataPath = fullPath + '.trashmeta';
          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              originalPath = metadata.originalPath || fullPath;
              deletedDate = metadata.deletedDate || deletedDate;
            } catch (e) {
              // Ignore metadata parse errors
            }
          }
          files.push({
            name: item.name,
            path: fullPath,
            originalPath: originalPath,
            isDirectory: item.isDirectory(),
            size: stats.size,
            deleted: deletedDate,
            extension: path.extname(item.name).toLowerCase()
          });
        }
      }
      files.sort((a, b) => b.deleted - a.deleted); // Newest first
      return { success: true, files: files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete file (move to trash)
  ipcMain.handle('delete-file', async (event, filePath) => {
    try {
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      const fileName = path.basename(filePath);
      const trashPath = path.join(ISOLATED_TRASH_PATH, fileName);
      
      // If file already exists in trash, add timestamp
      let finalTrashPath = trashPath;
      if (fs.existsSync(trashPath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        finalTrashPath = path.join(ISOLATED_TRASH_PATH, `${base}_${Date.now()}${ext}`);
      }
      
      // Move file to trash
      fs.renameSync(filePath, finalTrashPath);
      
      // Save metadata
      const metadata = {
        originalPath: filePath,
        deletedDate: Date.now()
      };
      fs.writeFileSync(finalTrashPath + '.trashmeta', JSON.stringify(metadata));
      
      return true;
    } catch (error) {
      throw error;
    }
  });

  // Rename file
  ipcMain.handle('rename-file', async (event, filePath, newName) => {
    try {
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      if (!newName || !newName.trim()) {
        throw new Error('Invalid file name');
      }
      
      const dir = path.dirname(filePath);
      const newPath = path.join(dir, newName.trim());
      
      // Check if new name already exists
      if (fs.existsSync(newPath)) {
        throw new Error('A file with this name already exists');
      }
      
      fs.renameSync(filePath, newPath);
      return true;
    } catch (error) {
      throw error;
    }
  });

  // Copy file
  ipcMain.handle('copy-file', async (event, sourcePath, destPath) => {
    try {
      if (!sourcePath.startsWith(ISOLATED_DATA_PATH) || !destPath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('trash-delete', async (event, filePath) => {
    try {
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      const fileName = path.basename(filePath);
      const trashPath = path.join(ISOLATED_TRASH_PATH, fileName);
      const metadataPath = trashPath + '.trashmeta';
      
      // If file already exists in trash, add timestamp
      let finalTrashPath = trashPath;
      if (fs.existsSync(trashPath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        finalTrashPath = path.join(ISOLATED_TRASH_PATH, `${base}_${Date.now()}${ext}`);
      }
      
      // Move file to trash
      fs.renameSync(filePath, finalTrashPath);
      
      // Save metadata
      const metadata = {
        originalPath: filePath,
        deletedDate: Date.now()
      };
      fs.writeFileSync(finalTrashPath + '.trashmeta', JSON.stringify(metadata));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trash-restore', async (event, trashPath) => {
    try {
      if (!trashPath.startsWith(ISOLATED_TRASH_PATH)) {
        throw new Error('Invalid trash path');
      }
      
      const metadataPath = trashPath + '.trashmeta';
      let originalPath = trashPath;
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        originalPath = metadata.originalPath;
      }
      
      // Restore file
      if (fs.existsSync(originalPath)) {
        // Original path exists, add timestamp
        const ext = path.extname(originalPath);
        const base = path.basename(originalPath, ext);
        const dir = path.dirname(originalPath);
        originalPath = path.join(dir, `${base}_restored_${Date.now()}${ext}`);
      }
      
      fs.renameSync(trashPath, originalPath);
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
      
      return { success: true, restoredPath: originalPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trash-empty', async () => {
    try {
      if (fs.existsSync(ISOLATED_TRASH_PATH)) {
        const items = fs.readdirSync(ISOLATED_TRASH_PATH);
        for (const item of items) {
          const itemPath = path.join(ISOLATED_TRASH_PATH, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(itemPath);
          }
          // Also delete metadata
          const metadataPath = itemPath + '.trashmeta';
          if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Desktop Folder Handlers
  ipcMain.handle('desktop-create-folder', async (event, folderName) => {
    try {
      const folderPath = path.join(ISOLATED_DESKTOP_PATH, folderName);
      if (fs.existsSync(folderPath)) {
        throw new Error('Folder already exists');
      }
      fs.mkdirSync(folderPath, { recursive: true });
      return { success: true, path: folderPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('desktop-list-items', async () => {
    try {
      const items = [];
      if (fs.existsSync(ISOLATED_DESKTOP_PATH)) {
        const files = fs.readdirSync(ISOLATED_DESKTOP_PATH, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(ISOLATED_DESKTOP_PATH, file.name);
          const stats = fs.statSync(fullPath);
          items.push({
            name: file.name,
            path: fullPath,
            isDirectory: file.isDirectory(),
            size: stats.size,
            modified: stats.mtime.getTime(),
            extension: path.extname(file.name).toLowerCase()
          });
        }
      }
      return { success: true, items: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Screen Lock Handler
  ipcMain.handle('screen-lock', async () => {
    // Lock screen by minimizing all windows
    if (desktopWindow && !desktopWindow.isDestroyed()) {
      desktopWindow.webContents.send('screen-locked');
    }
    appWindows.forEach((appData) => {
      if (appData.window && !appData.window.isDestroyed()) {
        appData.window.hide();
      }
    });
    return { success: true };
  });


  // Volume Control (using system commands)
  ipcMain.handle('get-volume', async () => {
    try {
      // Windows volume control
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const result = execSync('powershell -Command "(Get-AudioDevice -List | Where-Object {$_.Type -eq \'Render\'}).Volume"', { encoding: 'utf8' });
        const volume = parseInt(result.trim()) || 50;
        return { success: true, volume: volume };
      }
      return { success: true, volume: 50 }; // Default
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('set-volume', async (event, volume) => {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`powershell -Command "(Get-AudioDevice -List | Where-Object {$_.Type -eq 'Render'}).Volume = ${Math.max(0, Math.min(100, volume))}"`);
        return { success: true };
      }
      return { success: false, error: 'Volume control not supported on this platform' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Brightness Control
  ipcMain.handle('get-brightness', async () => {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const result = execSync('powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"', { encoding: 'utf8' });
        const brightness = parseInt(result.trim()) || 100;
        return { success: true, brightness: brightness };
      }
      return { success: true, brightness: 100 }; // Default
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('set-brightness', async (event, brightness) => {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const level = Math.max(0, Math.min(100, brightness));
        execSync(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})"`);
        return { success: true };
      }
      return { success: false, error: 'Brightness control not supported on this platform' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // VPN Kill Switch
  let vpnKillSwitchEnabled = false;
  let vpnKillSwitchMonitoring = false;
  let lastVpnStatus = false;

  ipcMain.handle('vpn-killswitch-get-status', () => {
    return { enabled: vpnKillSwitchEnabled };
  });

  ipcMain.handle('vpn-killswitch-set-status', (event, enabled) => {
    vpnKillSwitchEnabled = enabled;
    if (enabled && !vpnKillSwitchMonitoring) {
      startVpnKillSwitchMonitoring();
    }
    return { success: true, enabled: vpnKillSwitchEnabled };
  });

  function startVpnKillSwitchMonitoring() {
    if (vpnKillSwitchMonitoring) return;
    vpnKillSwitchMonitoring = true;
    
    // Monitor VPN status every 2 seconds
    const monitorInterval = setInterval(() => {
      if (!vpnKillSwitchEnabled) {
        clearInterval(monitorInterval);
        vpnKillSwitchMonitoring = false;
        return;
      }

      // Check VPN status from desktop window
      if (desktopWindow && !desktopWindow.isDestroyed()) {
        desktopWindow.webContents.send('vpn-killswitch-check');
      }
    }, 2000);
  }

  // Listen for VPN status updates from desktop
  ipcMain.on('vpn-status-update', (event, connected) => {
    if (vpnKillSwitchEnabled) {
      if (lastVpnStatus && !connected) {
        // VPN dropped - disconnect network
        console.log('[VPN KILL SWITCH] VPN dropped, disconnecting network...');
        session.defaultSession.setProxy({ proxyRules: '' });
        if (desktopWindow && !desktopWindow.isDestroyed()) {
          desktopWindow.webContents.send('vpn-killswitch-triggered');
        }
      }
      lastVpnStatus = connected;
    }
  });

  // VPN Proxy Configuration
  // Map of VPN locations to proxy servers
  // Configure your VPN service proxy servers here or via environment variables
  // Format: 'socks5://host:port' or 'http://host:port' or 'https://host:port'
  // Example: 'socks5://us1234.nordvpn.com:1080'
  // 
  // Default: Uses bundled Tor (socks5://127.0.0.1:9050) - Tor will start automatically
  // Override by setting environment variables or editing this map
  const TOR_PROXY = 'socks5://127.0.0.1:9050'; // Bundled Tor proxy (starts automatically)
  const VPN_PROXY_MAP = {
    'United Kingdom-London': process.env.VPN_PROXY_UK || TOR_PROXY,
    'United States-New York': process.env.VPN_PROXY_US || TOR_PROXY,
    'Germany-Frankfurt': process.env.VPN_PROXY_DE || TOR_PROXY,
    'Japan-Tokyo': process.env.VPN_PROXY_JP || TOR_PROXY,
    'Canada-Toronto': process.env.VPN_PROXY_CA || TOR_PROXY,
    'France-Paris': process.env.VPN_PROXY_FR || TOR_PROXY,
    'Netherlands-Amsterdam': process.env.VPN_PROXY_NL || TOR_PROXY,
    'Singapore-Singapore': process.env.VPN_PROXY_SG || TOR_PROXY,
    'Australia-Sydney': process.env.VPN_PROXY_AU || TOR_PROXY,
    'Switzerland-Zurich': process.env.VPN_PROXY_CH || TOR_PROXY,
    'Sweden-Stockholm': process.env.VPN_PROXY_SE || TOR_PROXY,
    'Brazil-São Paulo': process.env.VPN_PROXY_BR || TOR_PROXY,
    'South Korea-Seoul': process.env.VPN_PROXY_KR || TOR_PROXY,
    'India-Mumbai': process.env.VPN_PROXY_IN || TOR_PROXY,
    'Spain-Madrid': process.env.VPN_PROXY_ES || TOR_PROXY,
    'Italy-Milan': process.env.VPN_PROXY_IT || TOR_PROXY,
    'Poland-Warsaw': process.env.VPN_PROXY_PL || TOR_PROXY,
    'Norway-Oslo': process.env.VPN_PROXY_NO || TOR_PROXY,
    'Denmark-Copenhagen': process.env.VPN_PROXY_DK || TOR_PROXY,
    'Finland-Helsinki': process.env.VPN_PROXY_FI || TOR_PROXY
  };
  
  console.log('[VPN] VPN locations configured to use Tor proxy (bundled Tor will start automatically)');
  
  // Default VPN location for auto-connect on startup
  // Set this to auto-connect to a specific location on first startup
  const DEFAULT_VPN_LOCATION = process.env.VPN_DEFAULT_LOCATION || 'United States-New York';

  // Helper function to check if Tor is running
  async function checkTorRunning() {
    if (!currentVpnProxy || !currentVpnProxy.includes('127.0.0.1:9050')) {
      return true; // Not using Tor, skip check
    }
    
    // Use bundled Tor manager if available
    if (torManager) {
      try {
        const isRunning = await torManager.isTorRunning();
        if (!isRunning) {
          // Try to start bundled Tor
          console.log('[VPN] Starting bundled Tor daemon...');
          await torManager.start();
          return true;
        }
        return true;
      } catch (error) {
        console.warn('[VPN] Bundled Tor not available:', error.message);
        // Fall back to checking if external Tor is running
      }
    }
    
    // Check if external Tor is running
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:9050', { timeout: 2000 }, (res) => {
          resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch (e) {
      return false;
    }
  }

  ipcMain.handle('vpn-set-proxy', async (event, locationData) => {
    try {
      if (!locationData) {
        // Disconnect VPN - clear all proxies for normal browsing
        // (Tor will be handled separately if enabled)
        session.defaultSession.setProxy({
          proxyRules: ''
        });
        currentVpnProxy = null;
        console.log('[VPN] VPN disconnected, proxies cleared for normal browsing');
        return { success: true, message: 'VPN disconnected' };
      }

      const { country, city } = locationData;
      const locationKey = `${country}-${city}`;
      const proxyServer = VPN_PROXY_MAP[locationKey];

      if (!proxyServer) {
        // No proxy configured for this location - show warning but allow fake location
        console.warn(`[VPN] No proxy server configured for ${locationKey}. Using fake location only.`);
        session.defaultSession.setProxy({
          proxyRules: PROXY_SERVER || ''
        });
        currentVpnProxy = null;
        return { 
          success: false, 
          message: 'No proxy server configured for this location',
          isFakeLocation: true 
        };
      }

      // Set the proxy for this location
      session.defaultSession.setProxy({
        proxyRules: proxyServer
      });
      currentVpnProxy = proxyServer;
      
      // Apply proxy to all existing webview sessions (they use different partitions)
      // Get all BrowserWindows and their webContents
      const allWindows = BrowserWindow.getAllWindows();
      for (const win of allWindows) {
        if (win && !win.isDestroyed()) {
          const winSession = win.webContents.session;
          if (winSession && winSession !== session.defaultSession) {
            winSession.setProxy({
              proxyRules: proxyServer
            });
          }
        }
      }
      
      // Also apply to all webview partitions (webviews use partition: 'persist:webview')
      try {
        // Webviews typically use partition 'persist:webview' or similar
        // Apply to common webview partitions
        const webviewPartitions = ['persist:webview', 'webview'];
        for (const partition of webviewPartitions) {
          try {
            const partitionSession = session.fromPartition(partition);
            partitionSession.setProxy({
              proxyRules: proxyServer
            });
            console.log(`[VPN] Applied proxy to partition: ${partition}`);
          } catch (e) {
            // Partition might not exist, that's ok
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Check if using Tor and if it's running (after setting proxy)
      const isTor = proxyServer && proxyServer.includes('127.0.0.1:9050');
      const proxyType = isTor ? 'Tor' : 'VPN';
      if (isTor) {
        console.log('[VPN] Tor proxy detected, checking if Tor is running...');
        const torRunning = await checkTorRunning();
        if (!torRunning) {
          console.warn('[VPN] Tor proxy configured but Tor is not running');
          console.warn('[VPN] Bundled Tor should start automatically - check console for errors');
          return { 
            success: true, 
            message: `Connected to ${city}, ${country} via Tor`,
            proxyServer,
            warning: 'Tor may not be running. Bundled Tor should start automatically.'
          };
        } else {
          console.log('[VPN] Tor is running and ready');
        }
      }
      
      console.log(`[VPN] VPN proxy set for ${locationKey}: ${proxyServer} (${proxyType})`);
      return { success: true, message: `Connected to ${city}, ${country} via ${proxyType}`, proxyServer };
    } catch (error) {
      console.error('[VPN] Error setting proxy:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vpn-get-current-proxy', () => {
    return { proxy: currentVpnProxy };
  });

  // Fetch IP address through VPN proxy (uses session proxy settings)
  // Note: We use the desktop window's webContents to make the request,
  // which automatically uses the session's proxy settings
  ipcMain.handle('vpn-fetch-ip', async (event) => {
    // Use the sender's webContents to make the request (it uses the session proxy)
    const webContents = event.sender;
    
    const apis = [
      { url: 'https://ipapi.co/json/', name: 'ipapi' },
      { url: 'https://api.ipify.org?format=json', name: 'ipify' },
      { url: 'https://ip-api.com/json/', name: 'ip-api' }
    ];

    for (const api of apis) {
      try {
        const response = await webContents.executeJavaScript(`
          (async () => {
            try {
              const response = await fetch('${api.url}', {
                headers: { 'Accept': 'application/json' }
              });
              if (!response.ok) {
                throw new Error('HTTP ' + response.status);
              }
              return await response.json();
            } catch (error) {
              throw new Error(error.message || 'Fetch failed');
            }
          })()
        `);

        // Normalize response format
        let normalizedData;
        if (api.name === 'ipify') {
          normalizedData = {
            ip: response.ip,
            city: null,
            region: null,
            country_name: 'Unknown',
            org: 'Unknown'
          };
        } else if (api.name === 'ip-api') {
          normalizedData = {
            ip: response.query || response.ip,
            city: response.city,
            region: response.regionName,
            country_name: response.country,
            org: response.org || response.isp
          };
        } else {
          // ipapi.co format
          normalizedData = {
            ip: response.ip,
            city: response.city,
            region: response.region,
            country_name: response.country_name,
            org: response.org
          };
        }

        return { success: true, data: normalizedData };
      } catch (error) {
        console.warn(`[VPN] Failed to fetch IP from ${api.name}:`, error.message);
        // Try next API
        continue;
      }
    }

    return { success: false, error: 'All IP APIs failed' };
  });

  // Tor Manager IPC Handlers (bundled Tor)
  if (torManager) {
    ipcMain.handle('tor-start', async () => {
      try {
        await torManager.start();
        return { success: true, status: torManager.getStatus() };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tor-stop', async () => {
      try {
        await torManager.stop();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tor-status', async () => {
      try {
        const isRunning = await torManager.isTorRunning();
        return { 
          success: true, 
          isRunning,
          status: torManager.getStatus()
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('tor-initialize', async () => {
      try {
        await torManager.initialize();
        return { success: true, status: torManager.getStatus() };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  // Firewall IPC Handlers
  // Note: firewallNetworkEvents, firewallListeners, firewallRules, firewallEnabled are declared at module level

  // Network event notification (from browser) - for additional logging
  ipcMain.on('firewall-network-event', (event, data) => {
    if (!data || !data.url) {
      console.warn('Invalid firewall event data:', data);
      return;
    }
    
    // Skip internal URLs
    if (data.url.startsWith('about:') || data.url.startsWith('chrome-extension://') || 
        data.url.startsWith('chrome://') || data.url.startsWith('file://') || 
        data.url.startsWith('data:')) {
      return;
    }
    
    console.log('[FIREWALL IPC] Received firewall-network-event from renderer:', data.url);
    
    // Normalize the data format
    const eventData = {
      type: data.type || 'request',
      url: data.url,
      method: data.method || 'GET',
      timestamp: data.timestamp || Date.now(),
      blocked: false
    };
    
    // Check if duplicate (same URL within 1 second)
    const recent = firewallNetworkEvents.slice(-20);
    if (recent.some(e => e.url === eventData.url && Math.abs(e.timestamp - eventData.timestamp) < 1000)) {
      console.log('[FIREWALL IPC] Skipping duplicate event:', eventData.url);
      return;
    }
    
    firewallNetworkEvents.push(eventData);
    if (firewallNetworkEvents.length > 1000) {
      firewallNetworkEvents = firewallNetworkEvents.slice(-1000);
    }
    
    // Notify all firewall windows
    console.log('[FIREWALL IPC] Notifying firewall listeners, count:', firewallListeners.size, 'for URL:', eventData.url);
    if (firewallListeners.size > 0) {
      let sentCount = 0;
      const deadListeners = [];
      
      firewallListeners.forEach(listener => {
        try {
          // Check if webContents is still valid
          if (listener.webContents.isDestroyed()) {
            console.log('[FIREWALL IPC] Removing destroyed listener');
            deadListeners.push(listener);
            return;
          }
          
          listener.webContents.send('firewall-network-event', eventData);
          sentCount++;
          console.log('[FIREWALL IPC] Sent event to firewall window:', eventData.url, 'listener ID:', listener.webContents.id);
        } catch (e) {
          console.warn('[FIREWALL IPC] Failed to send to firewall listener:', e.message);
          deadListeners.push(listener);
        }
      });
      
      // Clean up dead listeners
      deadListeners.forEach(listener => firewallListeners.delete(listener));
      
      console.log('[FIREWALL IPC] Successfully sent to', sentCount, 'listener(s)');
    } else {
      console.warn('[FIREWALL IPC] No firewall listeners registered! Make sure firewall window is open.');
    }
  });

  // Store firewall rules from renderer
  ipcMain.on('firewall-update-rules', (event, rules) => {
    firewallRules = rules || [];
  });

  ipcMain.on('firewall-set-enabled', (event, enabled) => {
    firewallEnabled = enabled;
  });

  // Get firewall rules
  ipcMain.handle('firewall-get-rules', async (event) => {
    try {
      const firewallWindow = Array.from(appWindows.values()).find(win => win.type === 'firewall');
      if (firewallWindow) {
        // Get rules from firewall window's localStorage would need IPC, so we'll handle in renderer
        return { rules: [] };
      }
      return { rules: [] };
    } catch (error) {
      return { rules: [] };
    }
  });

  // Check if URL should be blocked
  ipcMain.handle('firewall-check-url', async (event, url) => {
    // This will be checked in the renderer process
    return { allowed: true };
  });

  // Register firewall window for event notifications
  ipcMain.on('firewall-register', (event) => {
    console.log('[FIREWALL REGISTER] Received registration request from webContents ID:', event.sender.id);
    
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      console.error('[FIREWALL REGISTER] Failed to get BrowserWindow from webContents');
      return;
    }
    
    console.log('[FIREWALL REGISTER] BrowserWindow found, window ID:', window.id);
    
    // Remove old listener if it exists (in case window reloaded)
    firewallListeners.forEach(listener => {
      if (listener.webContents.id === event.sender.id) {
        console.log('[FIREWALL REGISTER] Removing old listener for webContents:', event.sender.id);
        firewallListeners.delete(listener);
      }
    });
    
    const listener = { window, webContents: event.sender };
    firewallListeners.add(listener);
    
    console.log('[FIREWALL REGISTER] ✓ Firewall window registered successfully!');
    console.log('[FIREWALL REGISTER] Total listeners:', firewallListeners.size);
    console.log('[FIREWALL REGISTER] WebContents ID:', event.sender.id);
    console.log('[FIREWALL REGISTER] Window ID:', window.id);
    
    // Send recent events to newly opened firewall
    const recentEvents = firewallNetworkEvents.slice(-100);
    console.log('[FIREWALL REGISTER] Sending', recentEvents.length, 'recent events to firewall');
    let sentCount = 0;
    recentEvents.forEach(evt => {
      try {
        event.sender.send('firewall-network-event', evt);
        sentCount++;
      } catch (e) {
        console.error('[FIREWALL REGISTER] Failed to send event:', e.message);
      }
    });
    console.log('[FIREWALL REGISTER] Sent', sentCount, 'events to firewall window');
    
    // Send current rules
    try {
      event.sender.send('firewall-sync-rules', firewallRules);
      event.sender.send('firewall-sync-enabled', firewallEnabled);
      console.log('[FIREWALL REGISTER] Sent rules and enabled state');
    } catch (e) {
      console.error('[FIREWALL REGISTER] Failed to send rules/enabled:', e.message);
    }
    
    console.log('[FIREWALL REGISTER] ✓ Registration complete!');
  });

  // Unregister firewall window
  ipcMain.on('firewall-unregister', (event) => {
    firewallListeners.forEach(listener => {
      if (listener.webContents.id === event.sender.id) {
        firewallListeners.delete(listener);
      }
    });
  });
}

// Setup IPC handlers before app is ready
setupIPCHandlers();

// Firewall network interceptor (needs to be in scope)
let firewallNetworkEvents = [];
let firewallListeners = new Set();
let firewallRules = [];
let firewallEnabled = true;
const interceptedSessions = new Set();

// VPN proxy state (needs to be accessible from multiple functions)
let currentVpnProxy = null;

// Helper function to log webview requests
function logWebviewRequest(url, method) {
  console.log('logWebviewRequest called:', url);
  
  if (!url || url.startsWith('chrome-extension://') || 
      url.startsWith('chrome://') || 
      url.startsWith('devtools://') ||
      url.startsWith('file://') ||
      url.startsWith('about:')) {
    console.log('Skipping internal URL:', url);
    return;
  }

  // Check if already logged recently (avoid duplicates) - increase window to avoid missing events
  const recent = firewallNetworkEvents.slice(-50);
  if (recent.some(e => e.url === url && Date.now() - e.timestamp < 500)) {
    console.log('Skipping duplicate URL:', url);
    return;
  }
  
  console.log('Logging webview request:', url);

  let shouldBlock = false;
  
  if (firewallEnabled) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      for (const rule of firewallRules) {
        let matches = false;

        if (rule.target === 'domain') {
          matches = domain === rule.value || domain.endsWith('.' + rule.value);
        } else if (rule.target === 'ip') {
          matches = url.includes(rule.value);
        } else if (rule.target === 'port') {
          const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
          matches = port === rule.value || url.includes(':' + rule.value);
        }

        if (matches) {
          if (rule.action === 'block') {
            shouldBlock = true;
          } else {
            shouldBlock = false;
          }
          break;
        }
      }
    } catch (e) {
      // Invalid URL
    }
  }

  const eventData = {
    type: 'request',
    url: url,
    method: method || 'GET',
    timestamp: Date.now(),
    blocked: shouldBlock
  };

  firewallNetworkEvents.push(eventData);
  if (firewallNetworkEvents.length > 1000) {
    firewallNetworkEvents = firewallNetworkEvents.slice(-1000);
  }

  // Notify firewall windows (only if listeners exist)
  console.log('Firewall listeners:', firewallListeners.size, 'Events array:', firewallNetworkEvents.length);
  if (firewallListeners.size > 0) {
    firewallListeners.forEach(listener => {
      try {
        console.log('Sending firewall event to listener:', eventData.url);
        listener.webContents.send('firewall-network-event', eventData);
      } catch (e) {
        // WebContents might be destroyed, ignore
        console.warn('Failed to send firewall event:', e.message);
      }
    });
  } else {
    console.warn('No firewall listeners registered! Firewall window may not be open.');
  }
}

// Shared webRequest handler
function handleWebRequest(details, callback, reqSession) {
  const url = details.url;
  
  console.log('handleWebRequest called:', url);
  
  // Skip internal URLs
  if (url.startsWith('chrome-extension://') || 
      url.startsWith('chrome://') || 
      url.startsWith('devtools://') ||
      url.startsWith('file://') ||
      url.startsWith('about:') ||
      url.startsWith('data:')) {
    callback({});
    return;
  }
  
  // Allow CoinGecko API requests (crypto price widget)
  if (url.includes('api.coingecko.com')) {
    callback({});
    return;
  }
  
  console.log('[WEBREQUEST] Processing webRequest for:', url);
  
  // Check Ad Blocker
  let shouldBlock = false;
  
  if (adBlockerEnabled) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      
      // Check against ad/tracker domains
      for (const domain of AD_TRACKER_DOMAINS) {
        if (hostname.includes(domain) || pathname.includes(domain)) {
          shouldBlock = true;
          console.log('[ADBLOCKER] Blocked:', url);
          break;
        }
      }
    } catch (e) {
      // Invalid URL, skip ad blocking check
    }
  }

  // Check Firewall rules (can override ad blocker)
  if (firewallEnabled) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      for (const rule of firewallRules) {
        let matches = false;

        if (rule.target === 'domain') {
          matches = domain === rule.value || domain.endsWith('.' + rule.value);
        } else if (rule.target === 'ip') {
          matches = url.includes(rule.value);
        } else if (rule.target === 'port') {
          const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
          matches = port === rule.value || url.includes(':' + rule.value);
        }

        if (matches) {
          if (rule.action === 'block') {
            shouldBlock = true;
          } else {
            shouldBlock = false; // Allow rule overrides block
          }
          break;
        }
      }
    } catch (e) {
      // Invalid URL, allow by default
    }
  }

  // Always log the event
  const eventData = {
    type: 'request',
    url: url,
    method: details.method || 'GET',
    timestamp: Date.now(),
    blocked: shouldBlock
  };

  // Check if duplicate (same URL within 1 second)
  const recent = firewallNetworkEvents.slice(-20);
  if (!recent.some(e => e.url === eventData.url && Math.abs(e.timestamp - eventData.timestamp) < 1000)) {
    firewallNetworkEvents.push(eventData);
    if (firewallNetworkEvents.length > 1000) {
      firewallNetworkEvents = firewallNetworkEvents.slice(-1000);
    }
    
    console.log('[WEBREQUEST] Added event, total events:', firewallNetworkEvents.length);
  } else {
    console.log('[WEBREQUEST] Skipping duplicate event:', url);
    // Still send to listeners even if duplicate (they handle deduplication)
  }

  // Notify firewall windows (only if listeners exist)
  console.log('[WEBREQUEST] Checking listeners, count:', firewallListeners.size);
  if (firewallListeners.size > 0) {
    let sentCount = 0;
    firewallListeners.forEach(listener => {
      try {
        listener.webContents.send('firewall-network-event', eventData);
        sentCount++;
        console.log('[WEBREQUEST] Sent event to firewall:', url);
      } catch (e) {
        // WebContents might be destroyed, ignore
        console.warn('[WEBREQUEST] Failed to send firewall event:', e.message);
      }
    });
    console.log('[WEBREQUEST] Successfully sent to', sentCount, 'listener(s)');
  } else {
    console.warn('[WEBREQUEST] No firewall listeners registered!');
  }

  if (shouldBlock) {
    callback({ cancel: true });
  } else {
    callback({});
  }
}

function setupFirewallInterceptor() {
  // Intercept ALL network requests at default session level
  // Use wildcard to catch all URLs
  const filter = { urls: ['*://*/*'] };
  
  console.log('Setting up firewall interceptor...');
  
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    handleWebRequest(details, callback, session.defaultSession);
  });
  
  interceptedSessions.add(session.defaultSession);
  console.log('Default session interceptor set up');
  
  // Monitor all webContents (for webviews) - set up dynamically
  // This catches webview network requests as they're created
  app.on('web-contents-created', (event, contents) => {
    // Get the session for this webContents (webviews have their own partitions)
    const webviewSession = contents.session;
    
    // Set Chrome user agent for webviews (so Chrome Web Store works)
    const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    if (webviewSession) {
      webviewSession.setUserAgent(chromeUserAgent);
      
      // Apply VPN proxy settings to webview sessions (they don't inherit from defaultSession)
      if (currentVpnProxy) {
        webviewSession.setProxy({
          proxyRules: currentVpnProxy
        });
        console.log('[VPN] Applied proxy to webview session:', currentVpnProxy);
      }
    }
    // Also set on the webContents directly
    contents.setUserAgent(chromeUserAgent);
    
    // Set up webRequest interceptor for this session if not already done
    if (webviewSession && !interceptedSessions.has(webviewSession)) {
      interceptedSessions.add(webviewSession);
      
      const filter = { urls: ['*://*/*'] };
      webviewSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        handleWebRequest(details, callback, webviewSession);
      });
      
      console.log('Intercepted webview session:', webviewSession.getPartition ? webviewSession.getPartition() : 'default');
    }
    
    // Also monitor navigation events as backup
    contents.on('did-navigate', (event, url) => {
      logWebviewRequest(url, 'GET');
    });
    
    contents.on('did-navigate-in-page', (event, url, isMainFrame) => {
      if (isMainFrame) {
        logWebviewRequest(url, 'GET');
      }
    });
    
    // Monitor failed requests too
    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.log('did-fail-load event:', validatedURL);
      if (validatedURL && !validatedURL.startsWith('chrome-extension://') && !validatedURL.startsWith('chrome://') && !validatedURL.startsWith('about:') && !validatedURL.startsWith('file://')) {
        logWebviewRequest(validatedURL, 'GET');
      }
    });
    
    // Monitor when page starts loading - captures all resource requests
    contents.on('did-start-loading', () => {
      const url = contents.getURL();
      console.log('did-start-loading event:', url);
      if (url && !url.startsWith('chrome-extension://') && !url.startsWith('chrome://') && !url.startsWith('about:') && !url.startsWith('file://')) {
        logWebviewRequest(url, 'GET');
      }
    });
  });
  
  console.log('web-contents-created listener registered');
}

app.whenReady().then(async () => {
  // Track app launch
  if (analytics) {
    try {
      await analytics.trackLaunch();
      analytics.startHeartbeat();
    } catch (e) {
      console.warn('[Main] Analytics tracking failed:', e.message);
    }
  }
  
  // Initialize and start Tor automatically (if available)
  if (torManager) {
    console.log('[Tor] Checking for Tor installation...');
    try {
      // First, clean up any leftover Tor processes from previous sessions
      console.log('[Tor] Cleaning up any leftover Tor processes...');
      await torManager.killAllTorProcesses();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
      
      await torManager.initialize();
      console.log('[Tor] Starting Tor daemon automatically...');
      await torManager.start();
      console.log('[Tor] ✅ Tor is running and ready for VPN connections');
    } catch (e) {
      console.warn('[Tor] ⚠️  Tor not available:', e.message);
      console.warn('[Tor] VPN locations will still work but traffic won\'t be routed through Tor');
      console.warn('[Tor] To enable Tor: Install Tor Browser or Tor Expert Bundle from https://www.torproject.org/download/');
    }
  } else {
    console.log('[Tor] Tor manager not available (optional feature)');
  }
  // Start bundled Ollama for AI features (ignore system installation)
  try {
    const { ElectronOllama } = require('electron-ollama');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // First, try to stop any existing Ollama service that might be using port 11434
    try {
      console.log('[Ollama] Stopping any existing Ollama services...');
      
      // Method 1: Try to stop and disable Ollama service
      try {
        // Stop the service
        await execPromise('sc stop ollama 2>nul');
        await new Promise(resolve => setTimeout(resolve, 500));
        // Disable it so it doesn't auto-start
        await execPromise('sc config ollama start= disabled 2>nul');
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        // Service might not exist or not be a service - that's okay
      }
      
      // Method 2: Kill ALL Ollama processes (including "ollama app.exe")
      for (let i = 0; i < 3; i++) {
        try {
          await execPromise('taskkill /F /IM ollama.exe /T 2>nul');
          await execPromise('taskkill /F /IM "ollama app.exe" /T 2>nul');
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          // Process might not be running
        }
      }
      
      // Method 3: Find and kill process using port 11434 (multiple attempts)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { stdout } = await execPromise('netstat -ano | findstr :11434');
          if (!stdout || stdout.trim().length === 0) {
            // Port is free
            break;
          }
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const pids = new Set();
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(parseInt(pid))) {
                pids.add(pid);
              }
            }
          }
          if (pids.size === 0) {
            break; // No PIDs found, port should be free
          }
          for (const pid of pids) {
            try {
              await execPromise(`taskkill /F /PID ${pid} 2>nul`);
              console.log(`[Ollama] Killed process ${pid} using port 11434`);
            } catch (e) {
              // Process might already be gone
            }
          }
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // Port might not be in use or command failed
          break;
        }
      }
      
      // Final check - wait longer for port to be fully released
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify port is free - if not, keep trying
      let portFree = false;
      for (let checkAttempt = 0; checkAttempt < 5; checkAttempt++) {
        try {
          const { stdout } = await execPromise('netstat -ano | findstr :11434');
          if (!stdout || stdout.trim().length === 0) {
            portFree = true;
            console.log('[Ollama] Port 11434 is now free');
            break;
          } else {
            // Port still in use - try killing again
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(parseInt(pid))) {
                  try {
                    await execPromise(`taskkill /F /PID ${pid} 2>nul`);
                    console.log(`[Ollama] Killed remaining process ${pid}`);
                  } catch (e) {}
                }
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // Command failed, assume port is free
          portFree = true;
          break;
        }
      }
      
      if (!portFree) {
        console.warn('[Ollama] WARNING: Port 11434 is still in use after cleanup - bundled Ollama may fail to start');
      }
      
      console.log('[Ollama] Cleaned up existing Ollama instances');
    } catch (e) {
      // Ignore errors
      console.log('[Ollama] Cleanup attempted');
    }
    
    // Final wait and verification before starting
    console.log('[Ollama] Waiting for port to be fully released...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // One more check - if port is still in use, try killing again
    try {
      const { stdout } = await execPromise('netstat -ano | findstr :11434');
      if (stdout && stdout.trim().length > 0) {
        console.warn('[Ollama] Port still in use, attempting final cleanup...');
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(parseInt(pid))) {
              try {
                await execPromise(`taskkill /F /PID ${pid} 2>nul`);
                console.log(`[Ollama] Final kill of process ${pid}`);
              } catch (e) {}
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      // Port check failed, assume it's free
    }
    
    const ollama = new ElectronOllama({
      basePath: app.getPath('userData'),
    });
    
    // Check if bundled Ollama is already running
    const isRunning = await ollama.isRunning();
    
    if (isRunning) {
      console.log('[Ollama] Bundled Ollama is already running');
    } else {
      // Start bundled Ollama
      console.log('[Ollama] Starting bundled Ollama...');
      let serveStarted = false;
      try {
        const metadata = await ollama.getMetadata('latest');
        // Start Ollama in background - don't wait for it to complete
        ollama.serve(metadata.version, {
          serverLog: (message) => console.log('[Ollama]', message),
          downloadLog: (percent, message) => {
            if (percent % 10 === 0 || percent === 100) {
              console.log(`[Ollama Download] ${percent}% - ${message}`);
            }
          },
        }).then(() => {
          serveStarted = true;
          console.log('[Ollama] Bundled Ollama started successfully');
        }).catch((err) => {
          // Ignore timeout errors - we'll check if it's actually running
          if (!err.message || !err.message.includes('failed to start in 5s')) {
            console.error('[Ollama] Serve error:', err.message);
          }
        });
        
        // Wait a bit for Ollama to start, then check if it's running
        console.log('[Ollama] Waiting for Ollama to initialize...');
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const isRunning = await ollama.isRunning();
            if (isRunning) {
              console.log('[Ollama] Bundled Ollama is running!');
              serveStarted = true;
              break;
            }
          } catch (e) {
            // Keep waiting
          }
        }
        
        if (!serveStarted) {
          // Final check using HTTP request - wait a bit longer since GPU detection takes time
          console.log('[Ollama] Verifying Ollama is responding...');
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for GPU init
          const http = require('http');
          try {
            await new Promise((resolve, reject) => {
              const req = http.get('http://localhost:11434/api/tags', { timeout: 5000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                  resolve(true);
                });
              });
              req.on('error', (err) => reject(err));
              req.on('timeout', () => {
                req.destroy();
                reject(new Error('timeout'));
              });
            });
            console.log('[Ollama] ✅ Bundled Ollama is running (verified via HTTP)!');
            serveStarted = true;
          } catch (e) {
            // Even if check fails, Ollama might be running (logs show it is)
            console.log('[Ollama] Ollama appears to be starting. AI features will connect on first use.');
          }
        }
      } catch (error) {
        console.error('[Ollama] Error starting bundled Ollama:', error.message);
        if (error.message && error.message.includes('bind')) {
          console.warn('[Ollama] Port 11434 is still in use. Please manually stop your system Ollama service.');
        }
      }
    }
  } catch (error) {
    console.error('[Ollama] Error initializing bundled Ollama:', error);
    // Continue anyway - AI features will show error messages
  }
  
  // Initialize Stable Diffusion (SDXL) - non-blocking, optional
  try {
    console.log('[SD] Checking for Stable Diffusion WebUI...');
    const sdPath = sdManager.getStableDiffusionPath();
    if (sdPath) {
      console.log('[SD] Found Stable Diffusion WebUI at:', sdPath);
      // Don't auto-start immediately - let it start on first use
      // This prevents blocking app startup if SD takes time to load
      console.log('[SD] Stable Diffusion will start automatically on first image generation request');
    } else {
      console.log('[SD] Stable Diffusion WebUI not found. Image generation will require manual installation.');
      console.log('[SD] Install from: https://github.com/AUTOMATIC1111/stable-diffusion-webui');
    }
  } catch (error) {
    console.error('[SD] Error checking Stable Diffusion:', error);
    // Continue anyway - image generation will show error messages
  }
  
  // Set user agent to Chrome for all sessions
  // This makes Chrome Web Store recognize us as Chrome and enables extension installation
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  session.defaultSession.setUserAgent(chromeUserAgent);
  console.log('User agent set to Chrome for Chrome Web Store compatibility');
  
  // Configure proxy/VPN if specified
  if (PROXY_SERVER) {
    session.defaultSession.setProxy({
      proxyRules: PROXY_SERVER
    });
    console.log('VPN/Proxy configured:', PROXY_SERVER);
    
    // Handle Chromium cache errors gracefully when using VPN/Proxy
    // These errors are common with proxy/VPN but don't affect functionality
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      // Filter out common Chromium cache errors that occur with VPN/proxy
      // These are harmless cache corruption issues that Chromium handles automatically
      if (message.includes('backend_impl.cc') || 
          message.includes('entry_impl.cc') ||
          message.includes('Critical error found') ||
          (message.includes('No file for') && message.length < 100)) {
        // Suppress these specific cache errors - they're handled by Chromium
        // Only suppress if it's a short message (to avoid hiding real errors)
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
  }
  
  // Extensions disabled - using Omega Wallet as native provider instead
  // MetaMask/Phantom extensions removed due to Electron limitations
  // Omega Wallet will inject as window.ethereum and window.solana
  console.log('Using Omega Wallet as native wallet provider (extensions disabled)');
  
  // Setup firewall network request interceptor
  setupFirewallInterceptor();
  
  createDesktopWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDesktopWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Track app close before quitting
    if (analytics) {
      analytics.trackClose().catch(e => console.warn('[Main] Analytics close tracking failed:', e.message));
    }
    // Aggressively stop and kill all Tor processes
    if (torManager) {
      try {
        await torManager.stop();
        // Give it a moment, then kill all Tor processes as backup
        await new Promise(resolve => setTimeout(resolve, 1000));
        await torManager.killAllTorProcesses();
      } catch (e) {
        console.warn('[Main] Tor stop failed:', e.message);
        // Try to kill processes anyway
        if (torManager.killAllTorProcesses) {
          await torManager.killAllTorProcesses().catch(() => {});
        }
      }
    }
    app.quit();
  }
});

// Track app close on quit
app.on('before-quit', async (event) => {
  // Prevent default quit to allow cleanup
  event.preventDefault();
  
  if (analytics) {
    try {
      await analytics.trackClose();
    } catch (e) {
      console.warn('[Main] Analytics close tracking failed:', e.message);
    }
  }
  
  // Aggressively stop and kill all Tor processes
  if (torManager) {
    try {
      console.log('[Main] Stopping Tor before quit...');
      await torManager.stop();
      // Give it a moment, then kill all Tor processes as backup
      await new Promise(resolve => setTimeout(resolve, 1000));
      await torManager.killAllTorProcesses();
      console.log('[Main] Tor cleanup complete');
    } catch (e) {
      console.warn('[Main] Tor stop failed:', e.message);
      // Try to kill processes anyway
      if (torManager.killAllTorProcesses) {
        await torManager.killAllTorProcesses().catch(() => {});
      }
    }
  }
  
  // Now actually quit
  app.exit(0);
});

