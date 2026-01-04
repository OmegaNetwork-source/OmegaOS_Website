/**
 * Extension Download Helper Script
 * 
 * This script helps download Chrome extensions for use in Omega OS Browser
 * 
 * Usage:
 *   node download-extensions.js [extension-name]
 * 
 * Examples:
 *   node download-extensions.js phantom
 *   node download-extensions.js metamask
 *   node download-extensions.js all
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const EXTENSIONS = {
  phantom: {
    id: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    name: 'Phantom',
    url: null // Will be constructed
  },
  metamask: {
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'MetaMask',
    url: null
  }
};

// Chrome Web Store download URL pattern
// Note: Direct download from Chrome Web Store requires special handling
// We'll use a service or provide manual instructions
const CHROME_WEB_STORE_BASE = 'https://chrome.google.com/webstore/detail';

function printInstructions(extensionId, extensionName) {
  console.log('\n========================================');
  console.log(`Download Instructions for ${extensionName}`);
  console.log('========================================\n');
  console.log('Chrome Web Store does not allow direct downloads.');
  console.log('Please use one of these methods:\n');
  console.log('Method 1: Using Chrome Extension Downloader');
  console.log(`  1. Visit: https://chrome-extension-downloader.com/`);
  console.log(`  2. Enter Extension ID: ${extensionId}`);
  console.log(`  3. Download the .crx file`);
  console.log(`  4. Rename .crx to .zip and extract`);
  console.log(`  5. Place extracted folder in: extensions/${extensionName.toLowerCase()}/\n`);
  console.log('Method 2: Manual Download');
  console.log(`  1. Visit: ${CHROME_WEB_STORE_BASE}/${extensionId}`);
  console.log(`  2. Install in Chrome/Edge`);
  console.log(`  3. Find extension in Chrome's extension folder:`);
  console.log(`     - Windows: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\${extensionId}\\`);
  console.log(`     - macOS: ~/Library/Application Support/Google/Chrome/Default/Extensions/${extensionId}/`);
  console.log(`     - Linux: ~/.config/google-chrome/Default/Extensions/${extensionId}/`);
  console.log(`  4. Copy the latest version folder to: extensions/${extensionName.toLowerCase()}/\n`);
  console.log('Method 3: Using crx-downloader (if available)');
  console.log(`  npm install -g crx-downloader`);
  console.log(`  crx-downloader ${extensionId} -o extensions/${extensionName.toLowerCase()}.crx`);
  console.log(`  # Then extract the .crx file (it's a zip file)\n`);
}

async function downloadExtension(extensionName) {
  const ext = EXTENSIONS[extensionName.toLowerCase()];
  if (!ext) {
    console.error(`Unknown extension: ${extensionName}`);
    console.log('Available extensions:', Object.keys(EXTENSIONS).join(', '));
    return;
  }

  console.log(`\nPreparing to download ${ext.name}...\n`);
  
  // Check if extensions directory exists
  const extensionsDir = path.join(__dirname, 'extensions');
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
  }

  const extDir = path.join(extensionsDir, extensionName.toLowerCase());
  
  // Check if already downloaded
  const manifestPath = path.join(extDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(`${ext.name} appears to already be installed at: ${extDir}`);
    console.log('Delete the folder to re-download.\n');
    return;
  }

  // Print instructions since direct download isn't straightforward
  printInstructions(ext.id, ext.name);
}

async function main() {
  const args = process.argv.slice(2);
  const extensionName = args[0] || 'all';

  console.log('Omega OS - Extension Download Helper\n');

  if (extensionName === 'all') {
    console.log('To download all extensions, run this script for each:');
    Object.keys(EXTENSIONS).forEach(name => {
      console.log(`  node download-extensions.js ${name}`);
    });
    console.log('\nOr follow the instructions below for each extension:\n');
    Object.entries(EXTENSIONS).forEach(([key, ext]) => {
      printInstructions(ext.id, ext.name);
    });
  } else {
    await downloadExtension(extensionName);
  }
}

main().catch(console.error);



