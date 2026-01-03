const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const os = require('os');

class StableDiffusionManager {
  constructor() {
    this.process = null;
    this.sdPath = null;
    this.isRunning = false;
    this.port = 7860; // Automatic1111 default port
  }

  getStableDiffusionPath() {
    // Look for Automatic1111 WebUI in common locations
    const platform = process.platform;
    const isDev = !app.isPackaged;
    
    if (platform === 'win32') {
      // Common Windows locations for Automatic1111
      const commonPaths = [
        path.join(os.homedir(), 'stable-diffusion-webui', 'webui-user.bat'),
        path.join(os.homedir(), 'automatic1111', 'webui-user.bat'),
        path.join('C:', 'stable-diffusion-webui', 'webui-user.bat'),
        path.join('C:', 'automatic1111', 'webui-user.bat'),
        // Also check for python venv with webui.py
        path.join(os.homedir(), 'stable-diffusion-webui', 'webui.py'),
        path.join(os.homedir(), 'automatic1111', 'webui.py'),
      ];
      
      for (const p of commonPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    } else if (platform === 'darwin') {
      // macOS locations
      const commonPaths = [
        path.join(os.homedir(), 'stable-diffusion-webui', 'webui.sh'),
        path.join(os.homedir(), 'automatic1111', 'webui.sh'),
      ];
      
      for (const p of commonPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    } else {
      // Linux locations
      const commonPaths = [
        path.join(os.homedir(), 'stable-diffusion-webui', 'webui.sh'),
        path.join(os.homedir(), 'automatic1111', 'webui.sh'),
      ];
      
      for (const p of commonPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }
    
    return null;
  }

  async checkStableDiffusionRunning() {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get(`http://127.0.0.1:${this.port}/sdapi/v1/options`, { timeout: 2000 }, (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async start() {
    // Check if already running
    const isRunning = await this.checkStableDiffusionRunning();
    if (isRunning) {
      console.log('[SD] Already running');
      this.isRunning = true;
      return true;
    }

    this.sdPath = this.getStableDiffusionPath();
    
    if (!this.sdPath) {
      throw new Error('Stable Diffusion WebUI not found. Please install Automatic1111 WebUI from https://github.com/AUTOMATIC1111/stable-diffusion-webui');
    }

    if (!fs.existsSync(this.sdPath)) {
      throw new Error(`Stable Diffusion WebUI not found at: ${this.sdPath}`);
    }

    console.log('[SD] Starting Stable Diffusion WebUI from:', this.sdPath);

    try {
      const platform = process.platform;
      const dir = path.dirname(this.sdPath);
      
      if (platform === 'win32') {
        // Windows: Run webui-user.bat or webui.py
        if (this.sdPath.endsWith('.bat')) {
          this.process = spawn('cmd.exe', ['/c', this.sdPath], {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: dir,
          });
        } else {
          // Direct Python execution
          this.process = spawn('python', ['webui.py', '--api', '--xformers'], {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: dir,
          });
        }
      } else {
        // macOS/Linux: Run webui.sh
        this.process = spawn('bash', [this.sdPath, '--api', '--xformers'], {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: dir,
        });
      }

      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[SD] ${output}`);
        // Check if WebUI is ready
        if (output.includes('Running on') || output.includes('127.0.0.1:7860')) {
          this.isRunning = true;
        }
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[SD] ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('[SD] Process error:', error);
        this.isRunning = false;
      });

      this.process.on('exit', (code) => {
        console.log(`[SD] Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
      });

      // Wait for WebUI to start (it can take 30-60 seconds)
      console.log('[SD] Waiting for WebUI to start (this may take 30-60 seconds)...');
      
      // Check every 5 seconds for up to 2 minutes
      for (let i = 0; i < 24; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const running = await this.checkStableDiffusionRunning();
        if (running) {
          this.isRunning = true;
          console.log('[SD] Started successfully');
          return true;
        }
      }

      throw new Error('Stable Diffusion WebUI failed to start within timeout');
    } catch (error) {
      console.error('[SD] Failed to start:', error);
      this.isRunning = false;
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
      throw error;
    }
  }

  async stop() {
    if (this.process) {
      console.log('[SD] Stopping Stable Diffusion WebUI');
      this.process.kill();
      this.process = null;
      this.isRunning = false;
    }
  }

  isRunningCheck() {
    return this.isRunning;
  }
}

module.exports = new StableDiffusionManager();

