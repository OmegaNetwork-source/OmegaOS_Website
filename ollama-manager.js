const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const os = require('os');

class OllamaManager {
  constructor() {
    this.process = null;
    this.ollamaPath = null;
    this.isRunning = false;
    this.port = 11434;
  }

  getOllamaPath() {
    // In development, look for Ollama in common locations
    // In production, use bundled Ollama
    const platform = process.platform;
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Development: Try to find system Ollama
      if (platform === 'win32') {
        // Common Windows locations
        const commonPaths = [
          process.env.LOCALAPPDATA + '\\Programs\\Ollama\\ollama.exe',
          'C:\\Program Files\\Ollama\\ollama.exe',
          path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'),
        ];
        
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            return p;
          }
        }
      }
      return null; // Not found in dev, user needs to install
    } else {
      // Production: Use bundled Ollama
      const appPath = app.getAppPath();
      const resourcesPath = process.resourcesPath || path.join(appPath, '..');
      
      if (platform === 'win32') {
        return path.join(resourcesPath, 'ollama', 'ollama.exe');
      } else if (platform === 'darwin') {
        return path.join(resourcesPath, 'ollama', 'ollama');
      } else {
        return path.join(resourcesPath, 'ollama', 'ollama');
      }
    }
  }

  async checkOllamaRunning() {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get(`http://localhost:${this.port}/api/tags`, { timeout: 1000 }, (res) => {
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
    const isRunning = await this.checkOllamaRunning();
    if (isRunning) {
      console.log('[Ollama] Already running');
      this.isRunning = true;
      return true;
    }

    this.ollamaPath = this.getOllamaPath();
    
    if (!this.ollamaPath) {
      throw new Error('Ollama not found. Please install Ollama from https://ollama.ai');
    }

    if (!fs.existsSync(this.ollamaPath)) {
      throw new Error(`Ollama executable not found at: ${this.ollamaPath}`);
    }

    console.log('[Ollama] Starting Ollama from:', this.ollamaPath);

    try {
      // Start Ollama serve (runs as a server)
      this.process = spawn(this.ollamaPath, ['serve'], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(this.ollamaPath),
      });

      this.process.stdout.on('data', (data) => {
        console.log(`[Ollama] ${data.toString().trim()}`);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[Ollama] ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('[Ollama] Process error:', error);
        this.isRunning = false;
      });

      this.process.on('exit', (code) => {
        console.log(`[Ollama] Process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
      });

      // Wait a bit for Ollama to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify it's running
      const running = await this.checkOllamaRunning();
      if (running) {
        this.isRunning = true;
        console.log('[Ollama] Started successfully');
        return true;
      } else {
        throw new Error('Ollama failed to start');
      }
    } catch (error) {
      console.error('[Ollama] Failed to start:', error);
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
      console.log('[Ollama] Stopping Ollama');
      this.process.kill();
      this.process = null;
      this.isRunning = false;
    }
  }

  isRunningCheck() {
    return this.isRunning;
  }
}

module.exports = new OllamaManager();



