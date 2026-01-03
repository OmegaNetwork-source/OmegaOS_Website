#!/usr/bin/env node
/**
 * Extract Tor from portable Tor Browser executable
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOR_EXE_PATH = 'C:\\Users\\richa\\Downloads\\tor-browser-windows-x86_64-portable-15.0.3.exe';
const TOR_BROWSER_DIR = path.join(path.dirname(TOR_EXE_PATH), 'tor-browser');
const BUILD_TOR_DIR = path.join(__dirname, '..', 'build', 'tor');
const BUILD_TOR_EXE = path.join(BUILD_TOR_DIR, 'tor.exe');

// Check if tor.exe is already in build directory
if (fs.existsSync(BUILD_TOR_EXE)) {
  console.log('✅ Tor is already in build directory');
  process.exit(0);
}

console.log('📦 Extracting Tor Browser portable...');
console.log('   This may take a minute...\n');

try {
  // Run the self-extracting executable (it extracts to the same directory)
  // The portable version extracts when you run it with --extract or just run it
  console.log('Extracting portable Tor Browser...');
  
  // Portable Tor Browser extracts to a folder when run
  // We'll check if extraction directory exists, if not, run the exe
  if (!fs.existsSync(TOR_BROWSER_DIR)) {
    console.log('Running Tor Browser portable executable to extract...');
    console.log('(This will open Tor Browser - you can close it after extraction)');
    
    // Run in background and wait a bit for extraction
    const childProcess = require('child_process');
    const proc = childProcess.spawn(TOR_EXE_PATH, [], {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    
    // Wait for extraction (check every second for up to 30 seconds)
    let waited = 0;
    while (!fs.existsSync(TOR_BROWSER_DIR) && waited < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waited++;
      process.stdout.write('.');
    }
    console.log('\n');
    
    // Try to close Tor Browser if it opened
    try {
      execSync('taskkill /F /IM firefox.exe /T 2>nul', { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Look for tor.exe in the extracted directory
  const torExePath = path.join(TOR_BROWSER_DIR, 'Browser', 'TorBrowser', 'Tor', 'tor.exe');
  
  if (fs.existsSync(torExePath)) {
    console.log('✅ Found tor.exe in extracted Tor Browser');
    
    // Create build/tor directory
    if (!fs.existsSync(BUILD_TOR_DIR)) {
      fs.mkdirSync(BUILD_TOR_DIR, { recursive: true });
    }
    
    // Copy tor.exe
    fs.copyFileSync(torExePath, BUILD_TOR_EXE);
    console.log(`✅ Tor copied to: ${BUILD_TOR_EXE}`);
    console.log('\n✅ Tor is ready for bundling!');
  } else {
    console.log('❌ Could not find tor.exe in extracted directory');
    console.log('   Expected location:', torExePath);
    console.log('\n   Please extract Tor Browser manually and run this script again.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n   Alternative: Manually extract Tor Browser and copy tor.exe to:');
  console.log('   ' + BUILD_TOR_EXE);
  process.exit(1);
}

