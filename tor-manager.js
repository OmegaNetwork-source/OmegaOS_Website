// Omega OS Tor Manager - Bundled Tor daemon for privacy features
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const https = require('https');
const os = require('os');

class TorManager {
  constructor() {
    this.torProcess = null;
    this.isRunning = false;
    this.torPath = null;
    this.torDataDir = null;
    this.torPort = 9050; // Default SOCKS5 port
    this.controlPort = 9051; // Control port for Tor
    this.platform = process.platform;
    this.arch = process.arch;
  }

  // Get Tor executable path based on platform
  getTorPath() {
    // First, try bundled Tor (from build/tor directory)
    // In development: app.getAppPath() returns project root
    // In production: process.resourcesPath points to resources folder (outside app.asar)
    // electron-builder puts build/ folder in resources/ directory
    const resourcesPath = process.resourcesPath || (app.isPackaged ? path.join(path.dirname(app.getAppPath()), '..') : app.getAppPath());
    const bundledTorPath = path.join(resourcesPath, 'build', 'tor', 'tor.exe');
    
    if (fs.existsSync(bundledTorPath)) {
      console.log('[Tor] Using bundled Tor from:', bundledTorPath);
      return bundledTorPath;
    }
    
    // Fallback to user data directory
    const userDataPath = app.getPath('userData');
    const torDir = path.join(userDataPath, 'tor');
    
    if (this.platform === 'win32') {
      return path.join(torDir, 'tor.exe');
    } else if (this.platform === 'darwin') {
      return path.join(torDir, 'tor');
    } else {
      // Linux
      return path.join(torDir, 'tor');
    }
  }

  // Get Tor data directory
  getTorDataDir() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'tor-data');
  }

  // Check if Tor is already installed
  async isTorInstalled() {
    // Check bundled Tor first (both dev and production paths)
    const resourcesPath = process.resourcesPath || (app.isPackaged ? path.join(path.dirname(app.getAppPath()), '..') : app.getAppPath());
    const bundledTorPath = path.join(resourcesPath, 'build', 'tor', 'tor.exe');
    if (fs.existsSync(bundledTorPath)) {
      console.log('[Tor] Found bundled Tor at:', bundledTorPath);
      return true;
    }
    
    // Check user data directory
    const torPath = this.getTorPath();
    if (fs.existsSync(torPath)) {
      console.log('[Tor] Found Tor at:', torPath);
      return true;
    }
    
    return false;
  }

  // Download Tor for Windows
  async downloadTorWindows() {
    const torDir = path.dirname(this.getTorPath());
    if (!fs.existsSync(torDir)) {
      fs.mkdirSync(torDir, { recursive: true });
    }

    // Check if bundled Tor exists (should be in build/tor/tor.exe)
    const resourcesPath = process.resourcesPath || (app.isPackaged ? path.join(path.dirname(app.getAppPath()), '..') : app.getAppPath());
    const bundledTorPath = path.join(resourcesPath, 'build', 'tor', 'tor.exe');
    
    if (fs.existsSync(bundledTorPath)) {
      console.log('[Tor] Using bundled Tor');
      // Copy to user data directory for easier access
      const targetPath = path.join(torDir, 'tor.exe');
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(bundledTorPath, targetPath);
        console.log('[Tor] Copied bundled Tor to user data directory');
      }
      return;
    }

    // Check if Tor is already installed in common locations
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const commonPaths = [
      // User locations (portable Tor Browser)
      path.join(userProfile, 'Desktop', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      path.join(userProfile, 'Downloads', 'tor-browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      // Standard installation locations
      path.join(process.env.LOCALAPPDATA || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      path.join(process.env.APPDATA || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      // Tor Expert Bundle locations
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Tor', 'tor.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Tor', 'tor.exe'),
      path.join(process.env.APPDATA || '', 'Tor', 'tor.exe')
    ];

    for (const commonPath of commonPaths) {
      if (fs.existsSync(commonPath)) {
        console.log('[Tor] Found Tor installation at:', commonPath);
        // Copy to our directory
        const targetPath = path.join(torDir, 'tor.exe');
        fs.copyFileSync(commonPath, targetPath);
        return;
      }
    }

    // Tor not found
    console.log('[Tor] Tor not found. Please install Tor manually:');
    console.log('[Tor] 1. Download Tor Expert Bundle from: https://www.torproject.org/download/tor/');
    console.log('[Tor] 2. Extract it and place tor.exe in:', torDir);
    console.log('[Tor] Or install Tor Browser, and Tor will be found automatically.');
    throw new Error('Tor not installed. Please install Tor Browser or Tor Expert Bundle manually. See console for instructions.');
  }

  // Extract Tor on Windows
  async extractTorWindows(zipPath, extractPath) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    
    // Extract to temp directory first
    const tempDir = path.join(extractPath, 'temp');
    zip.extractAllTo(tempDir, true);
    
    // Find tor.exe in the extracted files
    const findTorExe = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findTorExe(fullPath);
          if (found) return found;
        } else if (file === 'tor.exe') {
          return fullPath;
        }
      }
      return null;
    };

    const torExePath = findTorExe(tempDir);
    if (torExePath) {
      // Move tor.exe to tor directory
      const targetPath = path.join(extractPath, 'tor.exe');
      fs.copyFileSync(torExePath, targetPath);
      
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      console.log('[Tor] Tor extracted successfully');
    } else {
      throw new Error('tor.exe not found in downloaded archive');
    }
  }

  // Download Tor for macOS/Linux (simpler - use system package manager or direct download)
  async downloadTorUnix() {
    // For macOS/Linux, we'll try to use system Tor if available
    // Otherwise, we can download the static binary
    console.log('[Tor] Checking for system Tor installation...');
    
    try {
      const { stdout } = await execPromise('which tor');
      if (stdout && stdout.trim()) {
        console.log('[Tor] System Tor found:', stdout.trim());
        this.torPath = stdout.trim();
        return true;
      }
    } catch (e) {
      // Tor not in PATH
    }

    // For now, we'll require users to install Tor via package manager
    // or we can download static binaries (more complex)
    console.log('[Tor] System Tor not found.');
    console.log('[Tor] Please install Tor using:');
    if (this.platform === 'darwin') {
      console.log('[Tor]   brew install tor');
    } else {
      console.log('[Tor]   sudo apt-get install tor  (Debian/Ubuntu)');
      console.log('[Tor]   sudo yum install tor       (RHEL/CentOS)');
    }
    
    return false;
  }

  // Initialize Tor (check if installed)
  async initialize() {
    if (this.isRunning) {
      return true;
    }

    // Check if Tor is installed
    if (!(await this.isTorInstalled())) {
      console.log('[Tor] Tor not found, checking for system installation...');
      
      if (this.platform === 'win32') {
        try {
          await this.downloadTorWindows(); // This now checks for system installations
        } catch (error) {
          console.error('[Tor]', error.message);
          throw error;
        }
      } else {
        const installed = await this.downloadTorUnix();
        if (!installed) {
          throw new Error('Tor not found. Please install Tor using your system package manager (e.g., brew install tor or sudo apt-get install tor).');
        }
      }
    }

    this.torPath = this.getTorPath();
    this.torDataDir = this.getTorDataDir();
    
    // Create data directory
    if (!fs.existsSync(this.torDataDir)) {
      fs.mkdirSync(this.torDataDir, { recursive: true });
    }

    return true;
  }

  // Start Tor daemon
  async start() {
    if (this.isRunning) {
      console.log('[Tor] Tor is already running');
      return true;
    }

    try {
      await this.initialize();
    } catch (error) {
      console.error('[Tor] Initialization failed:', error);
      throw error;
    }

    // Check if port is already in use
    const portInUse = await this.checkPortInUse(this.torPort);
    if (portInUse) {
      console.log('[Tor] Port 9050 is already in use. Checking if it\'s a leftover process...');
      
      // Try to verify if Tor is actually responding
      const isActuallyRunning = await this.verifyTorRunning();
      
      if (!isActuallyRunning) {
        console.log('[Tor] Port 9050 is in use but Tor is not responding. Killing orphaned processes...');
        await this.killAllTorProcesses();
        
        // Wait a bit for port to be released
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check again
        const stillInUse = await this.checkPortInUse(this.torPort);
        if (stillInUse) {
          console.warn('[Tor] Port 9050 still in use after cleanup. Attempting to start anyway...');
        }
      } else {
        console.log('[Tor] Tor is running and responding. Using existing instance.');
        this.isRunning = true;
        return true;
      }
    }

    // Create Tor configuration
    const torrcPath = path.join(this.torDataDir, 'torrc');
    // Simplified configuration - removed ExitNodes restriction to allow faster bootstrap
    // Users can still route through specific countries via VPN location selection
    const torrc = `SocksPort ${this.torPort}
ControlPort ${this.controlPort}
DataDirectory ${this.torDataDir}
`;

    fs.writeFileSync(torrcPath, torrc, 'utf8');

    // Start Tor process
    console.log('[Tor] Starting Tor daemon...');
    
    const args = [
      '-f', torrcPath
    ];

    this.torProcess = spawn(this.torPath, args, {
      cwd: this.torDataDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    this.torProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Bootstrapped 100%')) {
        console.log('[Tor] Tor is ready!');
        this.isRunning = true;
      } else if (output.includes('Bootstrapped')) {
        const match = output.match(/Bootstrapped (\d+)%/);
        if (match) {
          const percent = match[1];
          console.log(`[Tor] Bootstrapping: ${percent}%`);
        }
      }
    });

    this.torProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Log all stderr output for debugging (Tor outputs warnings/errors here)
      if (error.includes('ERROR') || error.includes('WARN') || error.includes('Bootstrapped')) {
        console.log('[Tor]', error.trim());
      }
    });

    this.torProcess.on('exit', (code) => {
      console.log(`[Tor] Process exited with code ${code}`);
      this.isRunning = false;
      this.torProcess = null;
    });

    // Wait for Tor to be ready (max 120 seconds - Tor can take longer on first run or slow networks)
    let attempts = 0;
    const maxAttempts = 120;
    while (!this.isRunning && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      // Check if process is still running
      if (!this.torProcess || this.torProcess.killed) {
        throw new Error('Tor process failed to start');
      }
    }

    if (!this.isRunning) {
      throw new Error(`Tor failed to bootstrap within ${maxAttempts} seconds`);
    }

    return true;
  }

  // Stop Tor daemon
  async stop() {
    console.log('[Tor] Stopping Tor daemon...');

    if (this.torProcess) {
      this.torProcess.kill('SIGTERM');
      
      // Wait for process to exit (max 3 seconds)
      let attempts = 0;
      while (this.torProcess && attempts < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Force kill if still running
      if (this.torProcess && !this.torProcess.killed) {
        console.log('[Tor] Force killing Tor process...');
        this.torProcess.kill('SIGKILL');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.torProcess = null;
    }

    // Also kill any orphaned Tor processes
    await this.killAllTorProcesses();

    this.isRunning = false;
    return true;
  }

  // Kill all Tor processes (for cleanup)
  async killAllTorProcesses() {
    try {
      if (this.platform === 'win32') {
        // Kill all tor.exe processes
        try {
          await execPromise('taskkill /F /IM tor.exe /T 2>nul');
          console.log('[Tor] Killed all Tor processes');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // No Tor processes running - that's fine
        }
      } else {
        // Unix: kill all tor processes
        try {
          await execPromise('pkill -9 tor 2>/dev/null || true');
          console.log('[Tor] Killed all Tor processes');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // No Tor processes running - that's fine
        }
      }
    } catch (e) {
      console.warn('[Tor] Error killing Tor processes:', e.message);
    }
  }

  // Check if port is in use
  async checkPortInUse(port) {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
        return stdout && stdout.trim().length > 0;
      } else {
        const { stdout } = await execPromise(`lsof -i :${port} || true`);
        return stdout && stdout.trim().length > 0;
      }
    } catch (e) {
      return false;
    }
  }

  // Verify Tor is actually running and responding
  async verifyTorRunning() {
    try {
      // Try to connect to Tor control port or make a test request
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${this.torPort}`, { timeout: 2000 }, (res) => {
          // If we get a response (even an error), Tor is running
          resolve(true);
        });
        req.on('error', () => {
          // Connection refused or timeout - might still be running
          // Try checking control port
          const controlReq = http.get(`http://127.0.0.1:${this.controlPort}`, { timeout: 1000 }, () => {
            resolve(true);
          });
          controlReq.on('error', () => resolve(false));
          controlReq.on('timeout', () => {
            controlReq.destroy();
            resolve(false);
          });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch (e) {
      return false;
    }
  }

  // Check if Tor is running
  async isTorRunning() {
    if (this.isRunning) {
      return true;
    }

    // Check if port is in use and verify it's actually Tor
    const portInUse = await this.checkPortInUse(this.torPort);
    if (portInUse) {
      return await this.verifyTorRunning();
    }

    return false;
  }

  // Get Tor status
  getStatus() {
    return {
      isRunning: this.isRunning,
      torPath: this.torPath,
      torPort: this.torPort,
      controlPort: this.controlPort
    };
  }
}

module.exports = new TorManager();

