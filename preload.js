const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop Window Controls
  desktopMinimize: () => ipcRenderer.send('desktop-minimize'),
  desktopMaximize: () => ipcRenderer.send('desktop-maximize'),
  desktopClose: () => ipcRenderer.send('desktop-close'),
  desktopIsMaximized: () => ipcRenderer.invoke('desktop-is-maximized'),
  
  // App Window Controls
  appWindowMinimize: (windowId) => ipcRenderer.send('app-window-minimize', windowId),
  appWindowMaximize: (windowId) => ipcRenderer.send('app-window-maximize', windowId),
  appWindowClose: (windowId) => ipcRenderer.send('app-window-close', windowId),
  appWindowIsMaximized: (windowId) => ipcRenderer.invoke('app-window-is-maximized', windowId),
  
  // Get current window ID
  getWindowId: () => ipcRenderer.invoke('get-window-id'),
  
  // Listen for window ID
  onWindowId: (callback) => {
    ipcRenderer.on('app-window-id', (event, windowId) => callback(windowId));
  },
  
  // Listen for open file event
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (event, filePath) => callback(filePath));
  },
  
  // Listen for wallet configuration for identity registration
  onWalletConfigureForIdentity: (callback) => {
    ipcRenderer.on('wallet-configure-for-identity', () => callback());
  },
  
  // Listen for app interaction notifications
  onWalletAppInteraction: (callback) => {
    ipcRenderer.on('wallet-app-interaction', (event, data) => callback(data));
  },
  
  // Open external URL
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  
  // Clipboard operations
  clipboardWriteText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  
  // App Management
  launchApp: (appType, options) => ipcRenderer.invoke('launch-app', appType, options),
  getOpenWindows: () => ipcRenderer.invoke('get-open-windows'),
  focusWindow: (windowId) => ipcRenderer.invoke('focus-window', windowId),
  minimizeWindow: (windowId) => ipcRenderer.invoke('minimize-window', windowId),
  
  // Wallet (still available)
  walletCreate: (password, secretKeyBase64 = null) => ipcRenderer.invoke('wallet-create', password, secretKeyBase64),
  walletImportFromPrivateKey: (privateKeyBase58, password) => ipcRenderer.invoke('wallet-import-from-private-key', privateKeyBase58, password),
  walletLoad: (password) => ipcRenderer.invoke('wallet-load', password),
  walletGetBalance: () => ipcRenderer.invoke('wallet-get-balance'),
  walletGetPublicKey: () => ipcRenderer.invoke('wallet-get-public-key'),
  walletSendSol: (toAddress, amount) => ipcRenderer.invoke('wallet-send-sol', toAddress, amount),
  walletHasWallet: () => ipcRenderer.invoke('wallet-has-wallet'),
  walletIsLoaded: () => ipcRenderer.invoke('wallet-is-loaded'),
  walletSignTransaction: (transactionData) => ipcRenderer.invoke('wallet-sign-transaction', transactionData),
  walletSignMessage: (message) => ipcRenderer.invoke('wallet-sign-message', message),
  
  // EVM Wallet Methods
  walletGetEvmAddress: () => ipcRenderer.invoke('wallet-get-evm-address'),
  walletGetEvmBalance: (chainId) => ipcRenderer.invoke('wallet-get-evm-balance', chainId),
  walletSignEvmTransaction: (transaction) => ipcRenderer.invoke('wallet-sign-evm-transaction', transaction),
  walletSignEvmMessage: (message) => ipcRenderer.invoke('wallet-sign-evm-message', message),
  walletSendEvmTransaction: (to, value, data, chainId) => ipcRenderer.invoke('wallet-send-evm-transaction', to, value, data, chainId),
  walletExportPrivateKey: (password) => ipcRenderer.invoke('wallet-export-private-key', password),
  walletToggleNetwork: (enable) => ipcRenderer.invoke('wallet-toggle-network', enable),
  
  // Multi-wallet methods
  walletCreateForNetwork: (password, network, name) => ipcRenderer.invoke('wallet-create-for-network', password, network, name),
  walletGetWalletsForNetwork: (network) => ipcRenderer.invoke('wallet-get-wallets-for-network', network),
  walletSetCurrentWallet: (network, walletId, password) => ipcRenderer.invoke('wallet-set-current-wallet', network, walletId, password),
  walletGetCurrentWalletId: (network) => ipcRenderer.invoke('wallet-get-current-wallet-id', network),
  walletLoadByNetwork: (password, network) => ipcRenderer.invoke('wallet-load-by-network', password, network),
  walletUpdateName: (walletId, name) => ipcRenderer.invoke('wallet-update-name', walletId, name),
  walletDelete: (walletId) => ipcRenderer.invoke('wallet-delete', walletId),
  walletCleanupDuplicates: () => ipcRenderer.invoke('wallet-cleanup-duplicates'),
  
  // Omega Identity APIs
  identityInitialize: () => ipcRenderer.invoke('identity-initialize'),
  identityGet: () => ipcRenderer.invoke('identity-get'),
  identityHasIdentity: () => ipcRenderer.invoke('identity-has-identity'),
  identitySyncDocument: (documentId, documentHash, metadata) => ipcRenderer.invoke('identity-sync-document', documentId, documentHash, metadata),
  identityGetSyncedDocuments: () => ipcRenderer.invoke('identity-get-synced-documents'),
  identityCheckLicense: () => ipcRenderer.invoke('identity-check-license'),
  identityGetLicenseDetails: () => ipcRenderer.invoke('identity-get-license-details'),
  identityGetLicensePricing: () => ipcRenderer.invoke('identity-get-license-pricing'),
  identityStakeForLicense: () => ipcRenderer.invoke('identity-stake-for-license'),
  identityPurchaseLicense: () => ipcRenderer.invoke('identity-purchase-license'),
  identityWithdrawStake: () => ipcRenderer.invoke('identity-withdraw-stake'),
  identityAuthenticate: (message) => ipcRenderer.invoke('identity-authenticate', message),
  identityVerifySignature: (message, signature, address) => ipcRenderer.invoke('identity-verify-signature', message, signature, address),
  
  // File operations (isolated environment only)
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  readFile: (filePath, encoding) => ipcRenderer.invoke('read-file', filePath, encoding),
  readFileFromPath: (filePath, encoding) => ipcRenderer.invoke('read-file-from-path', filePath, encoding),
  writeFile: (filePath, content, encoding) => ipcRenderer.invoke('write-file', filePath, content, encoding),
  // File conversion operations
  convertToDocx: (htmlContent, filePath) => ipcRenderer.invoke('convert-to-docx', htmlContent, filePath),
  convertToPptx: (slidesData, filePath) => ipcRenderer.invoke('convert-to-pptx', slidesData, filePath),
  convertToXlsx: (spreadsheetData, filePath) => ipcRenderer.invoke('convert-to-xlsx', spreadsheetData, filePath),
  convertToCsv: (spreadsheetData, filePath) => ipcRenderer.invoke('convert-to-csv', spreadsheetData, filePath),
  openIsolatedFolder: () => ipcRenderer.invoke('open-isolated-folder'),
  listDocuments: () => ipcRenderer.invoke('list-documents'),
  openFileInApp: (filePath) => ipcRenderer.invoke('open-file-in-app', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile: (filePath, newName) => ipcRenderer.invoke('rename-file', filePath, newName),
  copyFile: (sourcePath, destPath) => ipcRenderer.invoke('copy-file', sourcePath, destPath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  
  // Encryption operations (for password manager and secure apps)
  encryptData: (data, key) => ipcRenderer.invoke('encrypt-data', data, key),
  decryptData: (encrypted, key) => ipcRenderer.invoke('decrypt-data', encrypted, key),
  hashPassword: (password) => ipcRenderer.invoke('hash-password', password),
  
  // Tor mode
  setTorMode: (enabled) => ipcRenderer.invoke('set-tor-mode', enabled),
  
  // Firewall notifications
  firewallNotify: (data) => ipcRenderer.send('firewall-network-event', data),
  firewallGetRules: () => ipcRenderer.invoke('firewall-get-rules'),
  firewallCheckUrl: (url) => ipcRenderer.invoke('firewall-check-url', url),
  firewallRegister: () => ipcRenderer.send('firewall-register'),
  firewallUnregister: () => ipcRenderer.send('firewall-unregister'),
  firewallUpdateRules: (rules) => ipcRenderer.send('firewall-update-rules', rules),
  firewallSetEnabled: (enabled) => ipcRenderer.send('firewall-set-enabled', enabled),
  onFirewallEvent: (callback) => {
    ipcRenderer.on('firewall-network-event', (event, data) => callback(data));
  },
  onFirewallSyncRules: (callback) => {
    ipcRenderer.on('firewall-sync-rules', (event, rules) => callback(rules));
  },
  onFirewallSyncEnabled: (callback) => {
    ipcRenderer.on('firewall-sync-enabled', (event, enabled) => callback(enabled));
  },
  
  // Privacy Monitor APIs
  privacyMonitorRegister: () => ipcRenderer.send('privacy-monitor-register'),
  privacyMonitorUnregister: () => ipcRenderer.send('privacy-monitor-unregister'),
  onPrivacyFileAccess: (callback) => {
    ipcRenderer.on('privacy-file-access', (event, data) => callback(data));
  },
  
  // Burn to Hell (B2H) - Wipe all data
  burnToHell: () => ipcRenderer.invoke('burn-to-hell'),
  
  // Extension Management - Removed (extensions not supported, using WalletConnect instead)
  getLoadedExtensions: () => Promise.resolve([]), // Always return empty
  openExtensionPopup: () => Promise.resolve({ success: false }), // No-op
  
  // Get preload path for webviews
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
  
  // AI APIs
  aiChat: (message, history = []) => ipcRenderer.invoke('ai-chat', message, history),
  aiSummarizePage: (content, maxLength = 200) => ipcRenderer.invoke('ai-summarize-page', content, maxLength),
  aiImproveText: (text, style = 'neutral', task = 'improve') => ipcRenderer.invoke('ai-improve-text', text, style, task),
  aiSuggestFormula: (description, dataContext = null) => ipcRenderer.invoke('ai-suggest-formula', description, dataContext),
  aiAnalyzeData: (dataDescription, dataSample = null) => ipcRenderer.invoke('ai-analyze-data', dataDescription, dataSample),
  aiCheckReady: () => ipcRenderer.invoke('ai-check-ready'),
  aiGetModels: () => ipcRenderer.invoke('ai-get-models'),
  aiSetModel: (modelName) => ipcRenderer.invoke('ai-set-model', modelName),
  aiGetCurrentModel: () => ipcRenderer.invoke('ai-get-current-model'),
  aiGetRecommendedModels: () => ipcRenderer.invoke('ai-get-recommended-models'),
  aiPullModel: (modelName) => ipcRenderer.invoke('ai-pull-model', modelName),
  // DeepSeek model selection APIs
  aiSwitchModelForApp: (appType) => ipcRenderer.invoke('ai-switch-model-for-app', appType),
  aiGetContentModels: () => ipcRenderer.invoke('ai-get-content-models'),
  aiGetCodeModels: () => ipcRenderer.invoke('ai-get-code-models'),
  aiSelectBestModel: (preferenceList = null) => ipcRenderer.invoke('ai-select-best-model', preferenceList),
  
  
  // Ad Blocker
  adBlockerGetStatus: () => ipcRenderer.invoke('adblocker-get-status'),
  adBlockerSetStatus: (enabled) => ipcRenderer.invoke('adblocker-set-status', enabled),
  
  // Cookie Manager
  cookiesGetAll: (domain) => ipcRenderer.invoke('cookies-get-all', domain),
  cookiesDelete: (url, name) => ipcRenderer.invoke('cookies-delete', url, name),
  cookiesDeleteDomain: (domain) => ipcRenderer.invoke('cookies-delete-domain', domain),
  cookiesGetDomains: () => ipcRenderer.invoke('cookies-get-domains'),
  
  // VPN Kill Switch
  vpnKillSwitchGetStatus: () => ipcRenderer.invoke('vpn-killswitch-get-status'),
  vpnKillSwitchSetStatus: (enabled) => ipcRenderer.invoke('vpn-killswitch-set-status', enabled),
  sendVpnStatus: (connected) => ipcRenderer.send('vpn-status-update', connected),
  
  // VPN Proxy Configuration
  vpnSetProxy: (locationData) => ipcRenderer.invoke('vpn-set-proxy', locationData),
  vpnGetCurrentProxy: () => ipcRenderer.invoke('vpn-get-current-proxy'),
  vpnFetchIp: () => ipcRenderer.invoke('vpn-fetch-ip'),

  // Tor Manager (bundled Tor)
  torStart: () => ipcRenderer.invoke('tor-start'),
  torStop: () => ipcRenderer.invoke('tor-stop'),
  torStatus: () => ipcRenderer.invoke('tor-status'),
  torInitialize: () => ipcRenderer.invoke('tor-initialize'),
  
  // Listen for kill switch trigger
  onVpnKillSwitchTriggered: (callback) => {
    ipcRenderer.on('vpn-killswitch-triggered', () => callback());
  },
  
  // Trash/Recycle Bin
  trashList: () => ipcRenderer.invoke('trash-list'),
  trashDelete: (filePath) => ipcRenderer.invoke('trash-delete', filePath),
  trashRestore: (trashPath) => ipcRenderer.invoke('trash-restore', trashPath),
  trashEmpty: () => ipcRenderer.invoke('trash-empty'),
  
  // Desktop Folders
  desktopCreateFolder: (folderName) => ipcRenderer.invoke('desktop-create-folder', folderName),
  desktopListItems: () => ipcRenderer.invoke('desktop-list-items'),
  
  // Screen Lock
  screenLock: () => ipcRenderer.invoke('screen-lock'),
  onScreenLocked: (callback) => {
    ipcRenderer.on('screen-locked', () => callback());
  },
  
  // Volume Control
  getVolume: () => ipcRenderer.invoke('get-volume'),
  setVolume: (volume) => ipcRenderer.invoke('set-volume', volume),
  
  // Brightness Control
  getBrightness: () => ipcRenderer.invoke('get-brightness'),
  setBrightness: (brightness) => ipcRenderer.invoke('set-brightness', brightness),
  
  // Window Snapping
  appWindowMove: (windowId, x, y) => ipcRenderer.send('app-window-move', windowId, x, y),
  appWindowSnap: (windowId, snapPosition) => ipcRenderer.send('app-window-snap', windowId, snapPosition),
  
  // Multiple Desktops
  desktopSwitch: (desktopIndex) => ipcRenderer.invoke('desktop-switch', desktopIndex),
  desktopCreate: () => ipcRenderer.invoke('desktop-create'),
  desktopGetCurrent: () => ipcRenderer.invoke('desktop-get-current'),
  appWindowSetDesktop: (windowId, desktopIndex) => ipcRenderer.send('app-window-set-desktop', windowId, desktopIndex),
  
  // Website HTML Extraction
  fetchWebsite: (url) => ipcRenderer.invoke('fetch-website', url),
  
  // AI Configuration Updates
  updateAIConfig: (appName, config) => ipcRenderer.invoke('update-ai-config', appName, config),
  getAIConfig: (appName) => ipcRenderer.invoke('get-ai-config', appName),
});

// TOR HARDENING: Fingerprinting Protection
// Override navigator APIs to prevent fingerprinting when Tor is enabled
// These values are normalized to common values to reduce uniqueness
(function() {
  'use strict';
  
  // Store original values
  const originalNavigator = window.navigator;
  
  // Normalized fingerprint values (common/default values)
  const FINGERPRINT_VALUES = {
    hardwareConcurrency: 4, // Common CPU core count
    deviceMemory: 8, // Common RAM in GB (or undefined if not supported)
    platform: 'Win32', // Standard platform string
    maxTouchPoints: 0, // Standard for desktop
    vendor: 'Google Inc.',
    vendorSub: '',
    productSub: '20030107'
  };
  
  // Override hardwareConcurrency
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => FINGERPRINT_VALUES.hardwareConcurrency,
      configurable: true
    });
  } catch (e) {}
  
  // Override deviceMemory (if supported)
  try {
    if ('deviceMemory' in navigator) {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => FINGERPRINT_VALUES.deviceMemory,
        configurable: true
      });
    }
  } catch (e) {}
  
  // Override platform (keep consistent)
  try {
    Object.defineProperty(navigator, 'platform', {
      get: () => FINGERPRINT_VALUES.platform,
      configurable: true
    });
  } catch (e) {}
  
  // Override maxTouchPoints
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => FINGERPRINT_VALUES.maxTouchPoints,
      configurable: true
    });
  } catch (e) {}
  
  // Override vendor/vendorSub/productSub for consistency
  try {
    Object.defineProperty(navigator, 'vendor', {
      get: () => FINGERPRINT_VALUES.vendor,
      configurable: true
    });
    Object.defineProperty(navigator, 'vendorSub', {
      get: () => FINGERPRINT_VALUES.vendorSub,
      configurable: true
    });
    Object.defineProperty(navigator, 'productSub', {
      get: () => FINGERPRINT_VALUES.productSub,
      configurable: true
    });
  } catch (e) {}
  
  // Canvas fingerprinting protection - add noise to canvas operations
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const imageData = this.getContext('2d')?.getImageData(0, 0, this.width, this.height);
    if (imageData) {
      // Add minimal noise (1 bit per 1000 pixels) to prevent fingerprinting
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4000) {
        if (Math.random() < 0.001) {
          data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() < 0.5 ? 1 : -1)));
        }
      }
    }
    return originalToDataURL.apply(this, arguments);
  };
  
  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = originalGetImageData.apply(this, arguments);
    // Add minimal noise to prevent fingerprinting
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4000) {
      if (Math.random() < 0.001) {
        data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() < 0.5 ? 1 : -1)));
      }
    }
    return imageData;
  };
  
  // AudioContext fingerprinting protection
  const originalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (originalAudioContext) {
    const OriginalAudioContext = originalAudioContext;
    window.AudioContext = function() {
      const ctx = new OriginalAudioContext();
      // Override createAnalyser to add noise
      const originalCreateAnalyser = ctx.createAnalyser.bind(ctx);
      ctx.createAnalyser = function() {
        const analyser = originalCreateAnalyser();
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
        analyser.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData(array);
          // Add minimal noise
          for (let i = 0; i < array.length; i += 100) {
            if (Math.random() < 0.01) {
              array[i] += (Math.random() - 0.5) * 0.0001;
            }
          }
        };
        return analyser;
      };
      return ctx;
    };
    window.AudioContext.prototype = OriginalAudioContext.prototype;
    if (window.webkitAudioContext) {
      window.webkitAudioContext = window.AudioContext;
    }
  }
  
  // Font enumeration protection - limit font access
  const originalFontFaceSet = document.fonts;
  if (originalFontFaceSet && originalFontFaceSet.check) {
    const originalCheck = originalFontFaceSet.check.bind(originalFontFaceSet);
    document.fonts.check = function(font, text) {
      // Return true for common fonts to prevent enumeration
      const commonFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
      if (commonFonts.some(f => font.includes(f))) {
        return true;
      }
      return originalCheck(font, text);
    };
  }
})();