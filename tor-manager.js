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
    this.logger = null;
  }

  setLogger(callback) {
    this.logger = callback;
  }

  log(type, msg) {
    // Always log to console for terminal debugging
    if (type === 'error') {
      console.error(`[Tor] ${msg}`);
    } else {
      console.log(`[Tor] ${msg}`);
    }

    // Forward to custom logger (e.g. UI)
    if (this.logger) {
      this.logger(type, msg);
    }
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
      this.log('info', `Using bundled Tor from: ${bundledTorPath}`);
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
      this.log('info', `Found bundled Tor at: ${bundledTorPath}`);
      return true;
    }

    // Check user data directory
    const torPath = this.getTorPath();
    if (fs.existsSync(torPath)) {
      this.log('info', `Found Tor at: ${torPath}`);
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
      this.log('info', 'Using bundled Tor');
      // Copy to user data directory for easier access
      const targetPath = path.join(torDir, 'tor.exe');
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(bundledTorPath, targetPath);
        this.log('info', 'Copied bundled Tor to user data directory');
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
        this.log('info', `Found Tor installation at: ${commonPath}`);
        // Copy to our directory
        const targetPath = path.join(torDir, 'tor.exe');
        fs.copyFileSync(commonPath, targetPath);
        return;
      }
    }

    // Tor not found
    this.log('info', 'Tor not found. Please install Tor manually:');
    this.log('info', '1. Download Tor Expert Bundle from: https://www.torproject.org/download/tor/');
    this.log('info', `2. Extract it and place tor.exe in: ${torDir}`);
    this.log('info', 'Or install Tor Browser, and Tor will be found automatically.');
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

      this.log('info', 'Tor extracted successfully');
    } else {
      throw new Error('tor.exe not found in downloaded archive');
    }
  }

  // Download Tor for macOS/Linux (simpler - use system package manager or direct download)
  async downloadTorUnix() {
    // For macOS/Linux, we'll try to use system Tor if available
    // Otherwise, we can download the static binary
    this.log('info', 'Checking for system Tor installation...');

    try {
      const { stdout } = await execPromise('which tor');
      if (stdout && stdout.trim()) {
        this.log('info', `System Tor found: ${stdout.trim()}`);
        this.torPath = stdout.trim();
        return true;
      }
    } catch (e) {
      // Tor not in PATH
    }

    // For now, we'll require users to install Tor via package manager
    // or we can download static binaries (more complex)
    this.log('info', 'System Tor not found.');
    this.log('info', 'Please install Tor using:');
    if (this.platform === 'darwin') {
      this.log('info', '  brew install tor');
    } else {
      this.log('info', '  sudo apt-get install tor  (Debian/Ubuntu)');
      this.log('info', '  sudo yum install tor       (RHEL/CentOS)');
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
      this.log('info', 'Tor not found, checking for system installation...');

      if (this.platform === 'win32') {
        try {
          await this.downloadTorWindows(); // This now checks for system installations
        } catch (error) {
          this.log('error', error.message);
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
      this.log('info', 'Tor is already running');
      return true;
    }

    try {
      await this.initialize();
    } catch (error) {
      this.log('error', `Initialization failed: ${error}`);
      throw error;
    }

    // Check if port is already in use
    const portInUse = await this.checkPortInUse(this.torPort);
    if (portInUse) {
      this.log('info', 'Port 9050 is already in use. Checking if it\'s a leftover process...');

      // Try to verify if Tor is actually responding
      const isActuallyRunning = await this.verifyTorRunning();

      if (!isActuallyRunning) {
        this.log('info', 'Port 9050 is in use but Tor is not responding. Killing orphaned processes...');
        await this.killAllTorProcesses();

        // Wait a bit for port to be released
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check again
        const stillInUse = await this.checkPortInUse(this.torPort);
        if (stillInUse) {
          this.log('warn', 'Port 9050 still in use after cleanup. Attempting to start anyway...');
        }
      } else {
        this.log('info', 'Tor is running and responding. Using existing instance.');
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
CookieAuthentication 0
`;

    fs.writeFileSync(torrcPath, torrc, 'utf8');

    // Start Tor process
    this.log('info', 'Starting Tor daemon...');

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
      // Log raw output for comprehensive debugging
      this.log('info', output.trim());

      if (output.includes('Bootstrapped 100%')) {
        this.log('info', 'Tor is ready!');
        this.isRunning = true;
      } else if (output.includes('Bootstrapped')) {
        const match = output.match(/Bootstrapped (\d+)%/);
        if (match) {
          const percent = match[1];
          this.log('info', `Bootstrapping: ${percent}%`);
        }
      }
    });

    this.torProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Log all stderr output for debugging (Tor outputs warnings/errors here)
      this.log('info', `[STDERR] ${error.trim()}`);

      if (error.includes('Bootstrapped 100%')) {
        this.isRunning = true;
      }
    });

    this.torProcess.on('exit', (code) => {
      this.log('info', `Process exited with code ${code}`);
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
      // NOTE: It might still be running in the background or bootstrapped via stderr
      // Double check
      if (await this.verifyTorRunning()) {
        this.log('info', 'Tor verified running despite no 100% bootstrap message');
        this.isRunning = true;
        return true;
      }
      throw new Error(`Tor failed to bootstrap within ${maxAttempts} seconds`);
    }

    return true;
  }

  // Stop Tor daemon
  async stop() {
    this.log('info', 'Stopping Tor daemon...');

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
        this.log('info', 'Force killing Tor process...');
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
          this.log('info', 'Killed all Tor processes');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // No Tor processes running - that's fine
        }
      } else {
        // Unix: kill all tor processes
        try {
          await execPromise('pkill -9 tor 2>/dev/null || true');
          this.log('info', 'Killed all Tor processes');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // No Tor processes running - that's fine
        }
      }
    } catch (e) {
      this.log('warn', `Error killing Tor processes: ${e.message}`);
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
  // Get Tor status
  getStatus() {
    return {
      running: this.isRunning,
      pid: this.torProcess ? this.torProcess.pid : null,
      port: this.torPort,
      controlPort: this.controlPort,
      onionAddress: null // TODO: Store persistent address if needed
    };
  }

  /**
   * Interact with Tor Control Port
   * @param {string} command - Command to send
   * @returns {Promise<string>} - Response from Tor
   */
  async sendControlCommand(command) {
    const net = require('net');
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';
      let authenticated = false;

      socket.connect(this.controlPort, '127.0.0.1', () => {
        // Must authenticate first (even with empty password for CookieAuthentication 0)
        socket.write('AUTHENTICATE ""\r\n');
      });

      socket.on('data', (data) => {
        const raw = data.toString();

        if (!authenticated) {
          // Check auth response
          if (raw.includes('250 OK')) {
            authenticated = true;
            // Now send the actual command
            socket.write(command + '\r\n');
          } else {
            console.error('Tor Auth Failed:', raw); // Direct log if no logger attached yet
            reject(new Error(`Authentication failed: ${raw}`));
            socket.destroy();
          }
          return;
        }

        response += raw;
        // Check for completion (250 OK or error code)
        // Note: ADD_ONION returns "250-ServiceID=..." then "250 OK"
        if (response.includes('250 OK') || (response.match(/^\d{3}/) && !response.startsWith('250-'))) {
          socket.end();
        }
      });

      socket.on('end', () => {
        resolve(response);
      });

      socket.on('error', (err) => {
        reject(err);
      });

      // Safety timeout
      setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
          if (!response) reject(new Error('Control port timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Setup a Hidden Service
   * @param {number} localPort - Local port to forward to (e.g. 7777)
   * @param {number} targetPort - External onion port (default 80)
   * @returns {Promise<string>} - The Onion address (without .onion extension)
   */
  async setupHiddenService(localPort, targetPort = 80) {
    if (!this.isRunning) {
      throw new Error('Tor is not running');
    }

    try {
      this.log('info', `Creating Hidden Service forwarding ${targetPort} -> ${localPort}...`);

      // Persistence Logic
      const keyPath = path.join(this.torDataDir, 'hidden_service_key');
      let keyParam = 'NEW:BEST'; // Default: Generate new

      if (fs.existsSync(keyPath)) {
        try {
          const savedKey = fs.readFileSync(keyPath, 'utf8').trim();
          if (savedKey) {
            this.log('info', 'Loading persistent identity from storage...');
            keyParam = savedKey;
          }
        } catch (err) {
          this.log('warn', `Failed to read key file, generating new one: ${err.message}`);
        }
      } else {
        this.log('info', 'No persistent identity found. Generating new permanent address...');
      }

      const cmd = `ADD_ONION ${keyParam} Port=${targetPort},127.0.0.1:${localPort}`;
      const response = await this.sendControlCommand(cmd);

      if (response.includes('250-ServiceID=')) {
        const match = response.match(/ServiceID=([a-z2-7]+)/);
        if (match && match[1]) {
          const onionAddress = match[1];
          this.log('info', `Hidden Service active: ${onionAddress}.onion`);

          // If we generated a new key, save it for next time
          if (keyParam === 'NEW:BEST') {
            const keyMatch = response.match(/PrivateKey=(\S+)/);
            if (keyMatch && keyMatch[1]) {
              fs.writeFileSync(keyPath, keyMatch[1], { mode: 0o600 });
              this.log('info', 'Saved new identity key to secure storage.');
            } else {
              this.log('warn', 'Could not retrieve PrivateKey from Tor to save!');
            }
          }

          return onionAddress + '.onion';
        }
      }

      throw new Error(`Failed to create Hidden Service. Response: ${response}`);
    } catch (error) {
      this.log('error', `Hidden Service setup failed: ${error}`);

      // If setup failed with a specific key (maybe corrupted), try falling back to new?
      // For now, just throw to let user know.
      throw error;
    }
  }

  /**
   * Delete the persistent key to force a new address on next run
   */
  async regenerateOnionAddress() {
    try {
      const keyPath = path.join(this.torDataDir, 'hidden_service_key');
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        this.log('info', 'Persistent identity deleted.');
        return true;
      }
      return false;
    } catch (e) {
      this.log('error', `Failed to delete identity: ${e.message}`);
      return false;
    }
  }

  /**
   * Get current Tor circuits
   * @returns {Promise<Array>} - Array of circuit objects
   */
  async getCircuits() {
    if (!this.isRunning) return [];
    try {
      const response = await this.sendControlCommand('GETINFO circuit-status');
      // Parse response
      // Format: 250-circuit-status=...
      // ID STATUS PATH...
      const lines = response.split('\r\n');
      const circuits = [];

      for (const line of lines) {
        if (line.startsWith('250-circuit-status=') || line === '250 OK') continue;

        // Example: 10 BUILT $F123...~Guard,$A456...~Middle,$B789...~Exit BUILD_FLAGS=...
        const parts = line.split(' ');
        if (parts.length < 3) continue;

        const id = parts[0];
        const status = parts[1];
        const pathStr = parts[2]; // Comma separated nodes

        if (status === 'BUILT') {
          const nodes = pathStr.split(',').map(n => {
            // Extract name/fingerprint
            // $Fingerprint~Name
            const nodeParts = n.split('~');
            return {
              fingerprint: nodeParts[0].replace('$', ''),
              name: nodeParts[1] || 'Unknown'
            };
          });

          circuits.push({
            id,
            nodes,
            purpose: 'GENERAL' // Simplified
          });
        }
      }
      return circuits;
    } catch (e) {
      console.error('Failed to get circuits:', e);
      return [];
    }
  }
}

module.exports = new TorManager();
