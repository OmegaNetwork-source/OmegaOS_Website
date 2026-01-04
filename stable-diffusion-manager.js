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

    // If using webui-user.bat, modify it to include --api flag
    if (this.sdPath.endsWith('webui-user.bat')) {
      const webuiUserBatPath = this.sdPath;
      const batContent = fs.readFileSync(webuiUserBatPath, 'utf8');
      
      // Check if --api is already in COMMANDLINE_ARGS
      if (!batContent.includes('--api')) {
        console.log('[SD] Adding --api flag to webui-user.bat');
        const modifiedContent = batContent.replace(
          'set COMMANDLINE_ARGS=',
          'set COMMANDLINE_ARGS=--api'
        );
        fs.writeFileSync(webuiUserBatPath, modifiedContent, 'utf8');
        console.log('[SD] Modified webui-user.bat to include --api flag');
      }
    }

    try {
      const platform = process.platform;
      const dir = path.dirname(this.sdPath);
      
      if (platform === 'win32') {
        // Windows: Prefer webui-user.bat (which calls webui.bat) as it handles all setup
        if (this.sdPath.endsWith('.bat')) {
          // Use the .bat file - we've already modified webui-user.bat to include --api
          console.log('[SD] Running webui-user.bat (with --api flag)');
          this.process = spawn('cmd.exe', ['/c', this.sdPath], {
            detached: true,
            stdio: ['pipe', 'pipe', 'pipe'], // Capture all output for debugging
            cwd: dir,
            shell: true,
            windowsVerbatimArguments: false
          });
        } else {
          // Direct Python execution with API flag (fallback)
          console.log('[SD] Running webui.py directly with Python');
          this.process = spawn('python', ['webui.py', '--api'], {
            detached: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: dir,
            shell: true
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

      let stdoutBuffer = '';
      let stderrBuffer = '';

      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;
        console.log(`[SD] ${output.trim()}`);
        // Check if WebUI is ready
        if (output.includes('Running on') || output.includes('127.0.0.1:7860') || output.includes('Startup time')) {
          this.isRunning = true;
        }
      });

      this.process.stderr.on('data', (data) => {
        const error = data.toString();
        stderrBuffer += error;
        console.error(`[SD Error] ${error.trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('[SD] Process error:', error);
        this.isRunning = false;
        throw new Error(`Failed to start Stable Diffusion: ${error.message}`);
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[SD] Process exited with code ${code}`);
          console.error(`[SD] stdout: ${stdoutBuffer.substring(0, 500)}`);
          console.error(`[SD] stderr: ${stderrBuffer.substring(0, 500)}`);
          this.isRunning = false;
          this.process = null;
          throw new Error(`Stable Diffusion WebUI exited with code ${code}. Check if Python is installed and dependencies are available. Error output: ${stderrBuffer.substring(0, 200)}`);
        }
      });

      // Wait for WebUI to start (it can take 30-120 seconds, especially on first run with model loading)
      console.log('[SD] Waiting for WebUI to start (this may take 1-2 minutes on first run)...');
      
      // Check every 5 seconds for up to 3 minutes (first run can be slow)
      for (let i = 0; i < 36; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if process exited early
        if (processExited && exitCode !== 0 && exitCode !== null) {
          const errorMsg = stderrBuffer ? stderrBuffer.substring(Math.max(0, stderrBuffer.length - 1000)) : 
                          stdoutBuffer ? stdoutBuffer.substring(Math.max(0, stdoutBuffer.length - 1000)) : 
                          'Unknown error - process exited immediately';
          throw new Error(`Stable Diffusion WebUI process exited with code ${exitCode}.\n\nThis usually means:\n1. Python dependencies are missing (run: pip install -r requirements.txt in the stable-diffusion-webui folder)\n2. There's an error in the WebUI installation\n3. Required system libraries are missing\n\nError output:\n${errorMsg}\n\nTry running "webui-user.bat" manually in C:\\Users\\richa\\stable-diffusion-webui\\ to see the full error.`);
        }
        
        const running = await this.checkStableDiffusionRunning();
        if (running) {
          this.isRunning = true;
          console.log('[SD] Started successfully and ready for image generation');
          return true;
        }
        // Log progress every 30 seconds
        if (i > 0 && i % 6 === 0) {
          console.log(`[SD] Still waiting... (${(i * 5) / 60} minutes elapsed)`);
          // Show recent output to help debug
          if (stdoutBuffer.length > 0) {
            const recentOutput = stdoutBuffer.substring(Math.max(0, stdoutBuffer.length - 300));
            console.log(`[SD] Recent output: ...${recentOutput}`);
          }
        }
      }

      const errorDetails = stderrBuffer ? `\n\nError details:\n${stderrBuffer.substring(Math.max(0, stderrBuffer.length - 1000))}` : 
                          stdoutBuffer ? `\n\nOutput:\n${stdoutBuffer.substring(Math.max(0, stdoutBuffer.length - 1000))}` : '';
      throw new Error(`Stable Diffusion WebUI failed to start within 3 minutes.${errorDetails}\n\nPlease check:\n1. Run "webui-user.bat" manually in C:\\Users\\richa\\stable-diffusion-webui\\ to see the actual error\n2. Ensure Python dependencies are installed: pip install -r requirements.txt\n3. Check if all required system libraries are available`);
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


