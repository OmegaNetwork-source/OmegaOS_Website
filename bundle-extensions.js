/**
 * Extension Bundling Script
 * 
 * This script helps download and bundle Chrome extensions for distribution with the app
 * 
 * Usage:
 *   node bundle-extensions.js [extension-name]
 * 
 * Examples:
 *   node bundle-extensions.js phantom
 *   node bundle-extensions.js metamask
 *   node bundle-extensions.js all
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');

const EXTENSIONS = {
  phantom: {
    id: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    name: 'Phantom',
    // You can add direct download URLs here if you have them
    // Some services provide direct download links
    downloadUrl: null
  },
  metamask: {
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'MetaMask',
    downloadUrl: null
  }
};

const EXTENSIONS_DIR = path.join(__dirname, 'extensions');

function printInstructions(extensionId, extensionName) {
  console.log('\n========================================');
  console.log(`Bundling Instructions for ${extensionName}`);
  console.log('========================================\n');
  console.log('To bundle this extension with the app:\n');
  console.log('Method 1: Manual Download (Recommended)');
  console.log(`  1. Visit: https://chrome.google.com/webstore/detail/${extensionId}`);
  console.log(`  2. Install in Chrome/Edge`);
  console.log(`  3. Find extension in Chrome's extension folder:`);
  console.log(`     - Windows: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\${extensionId}\\`);
  console.log(`     - macOS: ~/Library/Application Support/Google/Chrome/Default/Extensions/${extensionId}/`);
  console.log(`     - Linux: ~/.config/google-chrome/Default/Extensions/${extensionId}/`);
  console.log(`  4. Copy the latest version folder to: extensions/${extensionName.toLowerCase()}/`);
  console.log(`  5. Ensure the folder contains manifest.json\n`);
  console.log('Method 2: Using Chrome Extension Downloader');
  console.log(`  1. Visit: https://chrome-extension-downloader.com/`);
  console.log(`  2. Enter Extension ID: ${extensionId}`);
  console.log(`  3. Download the .crx file`);
  console.log(`  4. Rename .crx to .zip and extract`);
  console.log(`  5. Place extracted folder in: extensions/${extensionName.toLowerCase()}/\n`);
  console.log('Method 3: Using crx-downloader CLI');
  console.log(`  npm install -g crx-downloader`);
  console.log(`  crx-downloader ${extensionId} -o extensions/${extensionName.toLowerCase()}.crx`);
  console.log(`  # Then extract the .crx file (it's a zip file)\n`);
}

async function downloadFromChromeStore(extensionId, extensionName) {
  // Chrome Web Store doesn't allow direct downloads easily
  // We'll use a third-party service or provide instructions
  console.log(`\nDirect download from Chrome Web Store is not straightforward.`);
  console.log(`Please use one of the methods below:\n`);
  printInstructions(extensionId, extensionName);
  return false;
}

async function verifyExtension(extensionPath, extensionName) {
  const manifestPath = path.join(extensionPath, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error(`✗ Error: manifest.json not found in ${extensionPath}`);
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log(`✓ Extension verified: ${manifest.name || extensionName}`);
    console.log(`  Version: ${manifest.version || 'unknown'}`);
    return true;
  } catch (error) {
    console.error(`✗ Error reading manifest.json:`, error.message);
    return false;
  }
}

async function bundleExtension(extensionName) {
  const ext = EXTENSIONS[extensionName.toLowerCase()];
  if (!ext) {
    console.error(`Unknown extension: ${extensionName}`);
    console.log('Available extensions:', Object.keys(EXTENSIONS).join(', '));
    return false;
  }

  console.log(`\nBundling ${ext.name}...\n`);

  // Ensure extensions directory exists
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  }

  const extDir = path.join(EXTENSIONS_DIR, extensionName.toLowerCase());
  const manifestPath = path.join(extDir, 'manifest.json');

  // Check if already bundled
  if (fs.existsSync(manifestPath)) {
    console.log(`Extension already exists at: ${extDir}`);
    const verified = await verifyExtension(extDir, ext.name);
    if (verified) {
      console.log(`\n✓ ${ext.name} is already bundled and ready!`);
      return true;
    } else {
      console.log(`\n⚠ Extension exists but appears invalid. Please re-download.`);
    }
  }

  // Try to download if URL is provided
  if (ext.downloadUrl) {
    console.log(`Attempting to download from provided URL...`);
    // Download logic would go here
    // For now, we'll just show instructions
  }

  // Show instructions
  printInstructions(ext.id, ext.name);

  console.log(`\nAfter placing the extension in: ${extDir}`);
  console.log(`Run this script again to verify: node bundle-extensions.js ${extensionName}\n`);

  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const extensionName = args[0] || 'all';

  console.log('Omega OS - Extension Bundling Helper\n');
  console.log('This script helps you bundle extensions with the app for distribution.\n');

  if (extensionName === 'all') {
    console.log('To bundle all extensions, run this script for each:');
    Object.keys(EXTENSIONS).forEach(name => {
      console.log(`  node bundle-extensions.js ${name}`);
    });
    console.log('\nOr follow the instructions below for each extension:\n');
    
    let allBundled = true;
    for (const [key, ext] of Object.entries(EXTENSIONS)) {
      const extDir = path.join(EXTENSIONS_DIR, key);
      const manifestPath = path.join(extDir, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        const verified = await verifyExtension(extDir, ext.name);
        if (!verified) {
          allBundled = false;
        }
      } else {
        console.log(`\n${ext.name} is not bundled yet.`);
        printInstructions(ext.id, ext.name);
        allBundled = false;
      }
    }

    if (allBundled) {
      console.log('\n✓ All extensions are bundled and ready!');
    }
  } else {
    const success = await bundleExtension(extensionName);
    if (success) {
      console.log('\n✓ Extension is ready to be bundled with the app!');
      console.log('  When you build the app, extensions will be included automatically.');
    }
  }
}

main().catch(console.error);



