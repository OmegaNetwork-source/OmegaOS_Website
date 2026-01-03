const { session, app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

// Extension storage path - use isolated environment
// This will be set in the constructor when app is ready
let ISOLATED_EXTENSIONS_PATH = null;

// Extension definitions
const PRE_INSTALLED_EXTENSIONS = [
  {
    id: 'phantom',
    name: 'Phantom',
    // Chrome Web Store ID for Phantom
    chromeStoreId: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    // Direct download URL (we'll need to extract from Chrome Web Store or use alternative)
    // Note: Chrome Web Store requires special handling, so we'll use a manual download approach
    downloadUrl: null, // Will be set if we can get it
    version: 'latest',
    enabled: true
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    chromeStoreId: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    downloadUrl: null,
    version: 'latest',
    enabled: true
  }
];

class ExtensionManager {
  constructor() {
    this.loadedExtensions = new Map();
    
    // Bundled extensions path (in app resources)
    // In development: __dirname/extensions
    // In production: app.getAppPath()/extensions or resources/app/extensions
    this.bundledExtensionsPath = this.getBundledExtensionsPath();
    
    // User data extensions path (where we copy bundled extensions)
    try {
      this.extensionsPath = path.join(app.getPath('userData'), 'extensions');
    } catch (e) {
      // Fallback if app is not ready yet
      const userDataPath = process.env.APPDATA || 
                          (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config') ||
                          __dirname;
      this.extensionsPath = path.join(userDataPath, 'omega-os', 'extensions');
    }
    
    // Ensure extensions directory exists
    if (!fs.existsSync(this.extensionsPath)) {
      fs.mkdirSync(this.extensionsPath, { recursive: true });
    }
    
    console.log('Extension manager initialized.');
    console.log('  Bundled extensions path:', this.bundledExtensionsPath);
    console.log('  User extensions path:', this.extensionsPath);
  }

  /**
   * Get bundled extensions path
   * Checks multiple locations for bundled extensions
   */
  getBundledExtensionsPath() {
    // Try multiple possible locations
    const possiblePaths = [
      // Development: local extensions folder
      path.join(__dirname, 'extensions'),
      // Production: app resources
      path.join(process.resourcesPath || __dirname, 'extensions'),
      // Alternative production path
      path.join(app.getAppPath ? app.getAppPath() : __dirname, 'extensions'),
      // Electron-builder resources path
      path.join(process.resourcesPath || __dirname, 'app', 'extensions'),
    ];

    for (const extPath of possiblePaths) {
      if (fs.existsSync(extPath)) {
        return extPath;
      }
    }

    // Return default development path even if it doesn't exist yet
    return path.join(__dirname, 'extensions');
  }


  /**
   * Check if extension is installed
   */
  isExtensionInstalled(extensionId) {
    // Check bundled extensions first
    const bundledExtPath = path.join(this.bundledExtensionsPath, extensionId);
    const bundledManifestPath = path.join(bundledExtPath, 'manifest.json');
    if (fs.existsSync(bundledManifestPath)) {
      return true;
    }
    
    // Then check user data extensions path
    const extPath = path.join(this.extensionsPath, extensionId);
    const manifestPath = path.join(extPath, 'manifest.json');
    return fs.existsSync(manifestPath);
  }

  /**
   * Get extension path (checks bundled first, then user data)
   */
  getExtensionPath(extensionId) {
    // Check bundled extensions first
    const bundledExtPath = path.join(this.bundledExtensionsPath, extensionId);
    const bundledManifestPath = path.join(bundledExtPath, 'manifest.json');
    if (fs.existsSync(bundledManifestPath)) {
      return bundledExtPath;
    }
    
    // Return user data extensions path
    return path.join(this.extensionsPath, extensionId);
  }

  /**
   * Copy bundled extension to user data directory
   */
  async copyBundledExtension(extensionId) {
    const bundledExtPath = path.join(this.bundledExtensionsPath, extensionId);
    const userExtPath = path.join(this.extensionsPath, extensionId);
    
    if (!fs.existsSync(bundledExtPath)) {
      return false;
    }

    // Check if already copied (compare modification times)
    if (fs.existsSync(userExtPath)) {
      try {
        const bundledStats = fs.statSync(bundledExtPath);
        const userStats = fs.statSync(userExtPath);
        // If user version is newer or same, skip copy
        if (userStats.mtime >= bundledStats.mtime) {
          return true;
        }
      } catch (e) {
        // If we can't compare, proceed with copy
      }
    }

    try {
      // Remove existing user extension if it exists
      if (fs.existsSync(userExtPath)) {
        fs.rmSync(userExtPath, { recursive: true, force: true });
      }

      // Copy bundled extension to user data
      this.copyDirectory(bundledExtPath, userExtPath);
      console.log(`  Copied bundled extension ${extensionId} to user data`);
      return true;
    } catch (error) {
      console.error(`  Failed to copy bundled extension ${extensionId}:`, error.message);
      return false;
    }
  }

  /**
   * Recursively copy directory
   */
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Download extension from Chrome Web Store
   * Note: This is a simplified version. In production, you'd need to:
   * 1. Use Chrome Web Store API or scraping
   * 2. Handle .crx file extraction
   * 3. Unpack the extension
   */
  async downloadExtensionFromChromeStore(extensionId, chromeStoreId) {
    // For now, we'll provide instructions for manual installation
    // In production, you could:
    // 1. Use a service like crx-downloader
    // 2. Scrape Chrome Web Store
    // 3. Use Chrome Web Store API (requires authentication)
    
    console.log(`Extension ${extensionId} needs to be downloaded manually.`);
    console.log(`Chrome Web Store ID: ${chromeStoreId}`);
    console.log(`Please download from: https://chrome.google.com/webstore/detail/${chromeStoreId}`);
    console.log(`Then extract and place in: ${this.getExtensionPath(extensionId)}`);
    
    return false;
  }

  /**
   * Download extension from direct URL
   */
  async downloadExtension(extensionId, url) {
    return new Promise((resolve, reject) => {
      const extPath = this.getExtensionPath(extensionId);
      
      // Create extension directory
      if (!fs.existsSync(extPath)) {
        fs.mkdirSync(extPath, { recursive: true });
      }

      const filePath = path.join(extPath, 'extension.zip');
      const file = fs.createWriteStream(filePath);
      
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirect
          return this.downloadExtension(extensionId, response.headers.location)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const stream = response.headers['content-encoding'] === 'gzip' 
          ? response.pipe(zlib.createGunzip())
          : response;

        stream.pipe(file);

        file.on('finish', () => {
          file.close();
          // Extract zip file
          this.extractExtension(extensionId, filePath)
            .then(resolve)
            .catch(reject);
        });
      }).on('error', (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
    });
  }

  /**
   * Extract extension zip file
   */
  async extractExtension(extensionId, zipPath) {
    const extPath = this.getExtensionPath(extensionId);
    let AdmZip;
    
    try {
      AdmZip = require('adm-zip');
    } catch (e) {
      console.error('adm-zip package not found. Please install it: npm install adm-zip');
      return false;
    }
    
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extPath, true);
      fs.unlinkSync(zipPath); // Remove zip file after extraction
      return true;
    } catch (error) {
      console.error(`Failed to extract extension ${extensionId}:`, error);
      return false;
    }
  }

  /**
   * Load extension into session
   */
  async loadExtension(extensionId) {
    try {
      const extPath = this.getExtensionPath(extensionId);
      
      if (!fs.existsSync(extPath)) {
        console.error(`Extension path does not exist: ${extPath}`);
        return null;
      }

      const manifestPath = path.join(extPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.error(`Extension manifest not found: ${manifestPath}`);
        return null;
      }

      // Load extension into default session (available to all webviews)
      const extension = await session.defaultSession.loadExtension(extPath, {
        allowFileAccess: true
      });

      // Store extension with both our ID and Electron's extension ID
      const extInfo = {
        ...extension,
        ourId: extensionId, // Our internal ID (phantom, metamask)
        electronId: extension.id // Electron's extension ID (the chrome-extension:// ID)
      };
      
      this.loadedExtensions.set(extensionId, extInfo);
      console.log(`✓ Loaded extension: ${extensionId} (${extension.name || extensionId})`);
      console.log(`  Extension ID: ${extension.id}`);
      console.log(`  Extension path: ${extPath}`);
      console.log(`  Note: Extensions work in webviews but don't show UI icons like in Chrome.`);
      console.log(`  Test by visiting a website and checking for window.ethereum (MetaMask) or window.solana (Phantom)`);
      
      return extInfo;
    } catch (error) {
      console.error(`✗ Failed to load extension ${extensionId}:`, error.message);
      return null;
    }
  }

  /**
   * Unload extension
   */
  async unloadExtension(extensionId) {
    try {
      const extension = this.loadedExtensions.get(extensionId);
      if (extension && extension.id) {
        await session.defaultSession.removeExtension(extension.id);
        this.loadedExtensions.delete(extensionId);
        console.log(`Unloaded extension: ${extensionId}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to unload extension ${extensionId}:`, error);
    }
    return false;
  }

  /**
   * Get all loaded extensions
   */
  getLoadedExtensions() {
    return Array.from(this.loadedExtensions.values()).map(ext => ({
      id: ext.electronId || ext.id, // Use Electron's extension ID
      name: ext.name,
      version: ext.version,
      ourId: ext.ourId // Include our internal ID
    }));
  }
  
  /**
   * Get extension by our internal ID
   */
  getExtensionById(ourId) {
    return this.loadedExtensions.get(ourId);
  }

  /**
   * Initialize and load pre-installed extensions
   */
  async initializeExtensions() {
    console.log('Initializing browser extensions...');
    
    for (const ext of PRE_INSTALLED_EXTENSIONS) {
      if (!ext.enabled) continue;

      console.log(`\nProcessing ${ext.name} (${ext.id})...`);

      // Check if extension is bundled
      const bundledExtPath = path.join(this.bundledExtensionsPath, ext.id);
      const bundledManifestPath = path.join(bundledExtPath, 'manifest.json');
      const isBundled = fs.existsSync(bundledManifestPath);

      if (isBundled) {
        // Copy bundled extension to user data (if not already there or outdated)
        console.log(`  Found bundled extension, copying to user data...`);
        await this.copyBundledExtension(ext.id);
      } else if (!this.isExtensionInstalled(ext.id)) {
        // Extension not found - try to download (only if downloadUrl is provided)
        console.log(`  Extension not found in bundle.`);
        
        if (ext.downloadUrl) {
          console.log(`  Attempting to download from URL...`);
          try {
            await this.downloadExtension(ext.id, ext.downloadUrl);
          } catch (error) {
            console.error(`  Failed to download ${ext.id}:`, error.message);
            console.warn(`  Skipping ${ext.id} - download failed`);
            continue;
          }
        } else {
          console.warn(`  Extension ${ext.id} is not bundled and no download URL provided.`);
          console.warn(`  To bundle extensions, place them in: ${this.bundledExtensionsPath}`);
          continue;
        }
      }

      // Load the extension
      if (this.isExtensionInstalled(ext.id)) {
        const loaded = await this.loadExtension(ext.id);
        if (!loaded) {
          console.warn(`  Extension ${ext.id} found but failed to load. Check console for errors.`);
        }
      } else {
        console.warn(`  Extension ${ext.id} is not available.`);
      }
    }

    console.log(`\n✓ Extension initialization complete. Loaded ${this.loadedExtensions.size} extension(s)`);
  }

  /**
   * Setup extension download helper
   * This creates a helper script to download extensions from Chrome Web Store
   */
  async setupExtensionDownloadHelper() {
    const helperPath = path.join(__dirname, 'download-extensions.js');
    const helperScript = `
// Extension Download Helper
// Run this script to download extensions from Chrome Web Store
// Usage: node download-extensions.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const EXTENSIONS = {
  phantom: {
    id: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    name: 'Phantom'
  },
  metamask: {
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'MetaMask'
  }
};

// Note: Direct Chrome Web Store downloads require special handling
// You can use services like:
// - https://chrome-extension-downloader.com/
// - Or manually download and extract

console.log('Extension Download Helper');
console.log('Please download extensions manually from Chrome Web Store:');
console.log('');
Object.values(EXTENSIONS).forEach(ext => {
  console.log(\`\${ext.name}: https://chrome.google.com/webstore/detail/\${ext.id}\`);
});
console.log('');
console.log('After downloading:');
console.log('1. Extract the .crx file (it\\'s a zip file)');
console.log('2. Place the extracted folder in: extensions/[extension-id]/');
console.log('3. Restart the application');
`;

    fs.writeFileSync(helperPath, helperScript);
    console.log(`Created extension download helper: ${helperPath}`);
  }
}

module.exports = ExtensionManager;

