/**
 * Copy Extensions from Chrome Installation
 * 
 * This script copies extensions from your existing Chrome installation
 * to the project's extensions folder for bundling.
 * 
 * Usage:
 *   node copy-chrome-extensions.js [extension-name]
 * 
 * Examples:
 *   node copy-chrome-extensions.js phantom
 *   node copy-chrome-extensions.js metamask
 *   node copy-chrome-extensions.js all
 */

const fs = require('fs');
const path = require('path');

const EXTENSIONS = {
  phantom: {
    id: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    name: 'Phantom',
    chromeStoreId: 'bfnaelmomeimhlpmgjnjophhpkkoljpa'
  },
  metamask: {
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'MetaMask',
    chromeStoreId: 'nkbihfbeogaeaoehlefnkodbefgpgknn'
  }
};

// Chrome extension directories for different platforms
function getChromeExtensionPaths() {
  const platform = process.platform;
  const paths = [];

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      // Chrome
      paths.push(path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions'));
      // Chrome Beta
      paths.push(path.join(localAppData, 'Google', 'Chrome Beta', 'User Data', 'Default', 'Extensions'));
      // Chrome Dev
      paths.push(path.join(localAppData, 'Google', 'Chrome Dev', 'User Data', 'Default', 'Extensions'));
      // Edge
      paths.push(path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions'));
      // Brave
      paths.push(path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Extensions'));
    }
  } else if (platform === 'darwin') {
    const home = process.env.HOME;
    if (home) {
      // Chrome
      paths.push(path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Extensions'));
      // Chrome Beta
      paths.push(path.join(home, 'Library', 'Application Support', 'Google', 'Chrome Beta', 'Default', 'Extensions'));
      // Chrome Canary
      paths.push(path.join(home, 'Library', 'Application Support', 'Google', 'Chrome Canary', 'Default', 'Extensions'));
      // Edge
      paths.push(path.join(home, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'Extensions'));
      // Brave
      paths.push(path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'Default', 'Extensions'));
    }
  } else {
    // Linux
    const home = process.env.HOME;
    if (home) {
      // Chrome
      paths.push(path.join(home, '.config', 'google-chrome', 'Default', 'Extensions'));
      paths.push(path.join(home, '.config', 'google-chrome-beta', 'Default', 'Extensions'));
      // Chromium
      paths.push(path.join(home, '.config', 'chromium', 'Default', 'Extensions'));
      // Edge
      paths.push(path.join(home, '.config', 'microsoft-edge', 'Default', 'Extensions'));
      // Brave
      paths.push(path.join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'Default', 'Extensions'));
    }
  }

  return paths.filter(p => fs.existsSync(p));
}

function findExtension(chromeExtDir, extensionId) {
  const extDir = path.join(chromeExtDir, extensionId);
  
  if (!fs.existsSync(extDir)) {
    return null;
  }

  // Find the latest version (usually the highest version number or latest modified)
  const versions = fs.readdirSync(extDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => /^\d+\.\d+\.\d+/.test(name) || /^\d+/.test(name));

  if (versions.length === 0) {
    return null;
  }

  // Sort versions and get the latest
  versions.sort((a, b) => {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart !== bPart) {
        return bPart - aPart; // Descending order
      }
    }
    return 0;
  });

  const latestVersion = versions[0];
  const versionPath = path.join(extDir, latestVersion);

  // Verify it has a manifest.json
  const manifestPath = path.join(versionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return {
    path: versionPath,
    version: latestVersion
  };
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip certain files/folders
    if (entry.name === '_metadata' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function copyExtension(extensionName) {
  const ext = EXTENSIONS[extensionName.toLowerCase()];
  if (!ext) {
    console.error(`Unknown extension: ${extensionName}`);
    console.log('Available extensions:', Object.keys(EXTENSIONS).join(', '));
    return false;
  }

  console.log(`\nLooking for ${ext.name} (${ext.id})...\n`);

  const chromePaths = getChromeExtensionPaths();
  
  if (chromePaths.length === 0) {
    console.error('Could not find Chrome/Chromium installation directories.');
    console.log('Please ensure Chrome, Edge, or another Chromium-based browser is installed.');
    return false;
  }

  console.log('Searching in:');
  chromePaths.forEach(p => console.log(`  - ${p}`));
  console.log('');

  // Search for extension in all Chrome paths
  let foundExtension = null;
  let foundInPath = null;

  for (const chromePath of chromePaths) {
    const extension = findExtension(chromePath, ext.id);
    if (extension) {
      foundExtension = extension;
      foundInPath = chromePath;
      break;
    }
  }

  if (!foundExtension) {
    console.error(`✗ ${ext.name} not found in any Chrome installation.`);
    console.log(`\nMake sure ${ext.name} is installed in Chrome/Edge/Brave.`);
    console.log(`You can install it from: https://chrome.google.com/webstore/detail/${ext.chromeStoreId}`);
    return false;
  }

  console.log(`✓ Found ${ext.name} v${foundExtension.version}`);
  console.log(`  Location: ${foundExtension.path}\n`);

  // Destination path
  const extensionsDir = path.join(__dirname, 'extensions');
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
  }

  const destPath = path.join(extensionsDir, extensionName.toLowerCase());

  // Check if already exists
  if (fs.existsSync(destPath)) {
    const manifestPath = path.join(destPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      console.log(`⚠ Extension already exists at: ${destPath}`);
      console.log('Overwriting with found version...\n');
      // Remove existing
      fs.rmSync(destPath, { recursive: true, force: true });
    }
  }

  // Copy extension
  console.log(`Copying to: ${destPath}...`);
  try {
    copyDirectory(foundExtension.path, destPath);
    
    // Verify copy
    const manifestPath = path.join(destPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`\n✓ Successfully copied ${ext.name}!`);
      console.log(`  Version: ${manifest.version || foundExtension.version}`);
      console.log(`  Location: ${destPath}`);
      return true;
    } else {
      console.error(`✗ Copy completed but manifest.json not found. Something went wrong.`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Failed to copy extension:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const extensionName = args[0] || 'all';

  console.log('Omega OS - Copy Extensions from Chrome');
  console.log('=====================================\n');
  console.log('This script copies extensions from your existing Chrome/Edge installation');
  console.log('to the project extensions folder for bundling.\n');

  if (extensionName === 'all') {
    console.log('Copying all extensions...\n');
    let successCount = 0;
    
    for (const [key, ext] of Object.entries(EXTENSIONS)) {
      const success = await copyExtension(key);
      if (success) {
        successCount++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Copied ${successCount}/${Object.keys(EXTENSIONS).length} extension(s)`);
    
    if (successCount === Object.keys(EXTENSIONS).length) {
      console.log('\n✓ All extensions are ready to be bundled!');
      console.log('  Build the app and extensions will be included automatically.');
    }
  } else {
    const success = await copyExtension(extensionName);
    if (success) {
      console.log(`\n✓ ${EXTENSIONS[extensionName.toLowerCase()].name} is ready to be bundled!`);
      console.log('  Build the app and it will be included automatically.');
    }
  }
}

main().catch(console.error);



