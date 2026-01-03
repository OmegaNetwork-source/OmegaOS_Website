#!/usr/bin/env node
/**
 * Download Tor for Windows (build-time script)
 * Downloads Tor Expert Bundle and extracts tor.exe for bundling with the app
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOR_DIR = path.join(__dirname, '..', 'build', 'tor');
const TOR_EXE_PATH = path.join(TOR_DIR, 'tor.exe');

// Also check common user locations for portable Tor Browser
const USER_PROFILE = process.env.USERPROFILE || process.env.HOME || '';
const DOWNLOADS_TOR = path.join(USER_PROFILE, 'Downloads', 'tor-browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe');
const DESKTOP_TOR = path.join(USER_PROFILE, 'Desktop', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe');

// Check if we're on Windows
const isWindows = process.platform === 'win32';

if (!isWindows) {
  console.log('⚠️  Tor bundling is only for Windows builds');
  console.log('   For macOS/Linux, users should install Tor via package manager');
  process.exit(0);
}

// Check if Tor is already downloaded
if (fs.existsSync(TOR_EXE_PATH)) {
  console.log('✅ Tor is already downloaded');
  process.exit(0);
}

console.log('📥 Downloading Tor Expert Bundle for Windows...');
console.log('   This may take a few minutes (~10-20MB download)...\n');

// Create build/tor directory
if (!fs.existsSync(TOR_DIR)) {
  fs.mkdirSync(TOR_DIR, { recursive: true });
}

// Find and copy Tor from existing installations
async function downloadTor() {
  // Check common Tor Browser installation locations
  const possiblePaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
    path.join(process.env.APPDATA || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe')
  ];

  // Also check for Tor Expert Bundle
  const expertPaths = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Tor', 'tor.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Tor', 'tor.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Tor', 'tor.exe'),
    path.join(process.env.APPDATA || '', 'Tor', 'tor.exe')
  ];

  const allPaths = [...possiblePaths, ...expertPaths];

  console.log('🔍 Searching for Tor installations...');
  
  // Check common user locations for portable Tor Browser first
  const userLocations = [
    { path: DESKTOP_TOR, name: 'Desktop' },
    { path: DOWNLOADS_TOR, name: 'Downloads' }
  ];
  
  for (const location of userLocations) {
    if (fs.existsSync(location.path)) {
      try {
        console.log(`✅ Found Tor on ${location.name}: ${location.path}`);
        fs.copyFileSync(location.path, TOR_EXE_PATH);
        console.log(`✅ Tor copied to: ${TOR_EXE_PATH}`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Failed to copy Tor from ${location.name}:`, error.message);
      }
    }
  }
  
  for (const torPath of allPaths) {
    if (fs.existsSync(torPath)) {
      try {
        console.log(`✅ Found Tor at: ${torPath}`);
        fs.copyFileSync(torPath, TOR_EXE_PATH);
        console.log(`✅ Tor copied to: ${TOR_EXE_PATH}`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Failed to copy Tor from ${torPath}:`, error.message);
      }
    }
  }

  // Tor not found in common locations
  console.log('\n⚠️  Tor not found in common installation locations');
  console.log('   Please do one of the following:');
  console.log('   1. Install Tor Browser from: https://www.torproject.org/download/');
  console.log('      Then run this script again - it will find Tor automatically');
  console.log('   2. Download Tor Expert Bundle from: https://www.torproject.org/download/tor/');
  console.log('      Extract it and manually copy tor.exe to:', TOR_EXE_PATH);
  console.log('\n   Note: Tor is optional. The app will work without it, but VPN features');
  console.log('   will use fake locations instead of routing through Tor.\n');
  
  return false;
}

downloadTor().then(success => {
  if (success) {
    console.log('\n✅ Tor is ready for bundling');
    process.exit(0);
  } else {
    console.log('\n⚠️  Tor download failed. Build will continue, but users will need to install Tor manually.');
    console.log('   To enable Tor bundling, please download Tor manually to:', TOR_EXE_PATH);
    process.exit(0); // Don't fail the build
  }
}).catch(error => {
  console.error('❌ Error downloading Tor:', error.message);
  console.log('\n⚠️  Build will continue, but users will need to install Tor manually.');
  process.exit(0); // Don't fail the build
});

