const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function downloadModel() {
  console.log('📦 Starting model download process...');
  
  const modelName = 'deepseek-coder:6.7b';
  const buildDir = path.join(__dirname, '..', 'build');
  const modelsDir = path.join(buildDir, 'models');
  
  // Create build/models directory if it doesn't exist
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  try {
    // Check if Ollama is available
    console.log('🔍 Checking Ollama availability...');
    try {
      await execAsync('ollama --version');
      console.log('✅ Ollama is available');
    } catch (error) {
      console.error('❌ Ollama is not installed or not in PATH');
      console.error('Please install Ollama from https://ollama.ai');
      process.exit(1);
    }
    
    // Check if model already exists locally (with timeout)
    console.log(`🔍 Checking if ${modelName} is already downloaded...`);
    try {
      const { stdout } = await execAsync(`ollama list`, { timeout: 10000 }); // 10 second timeout
      if (stdout.includes('deepseek-coder')) {
        console.log('✅ Model already exists locally');
      } else {
        console.log('📥 Model not found, downloading...');
        console.log(`⏳ This may take several minutes (~4GB download)...`);
        
        // Download the model with timeout handling
        const pullProcess = exec(`ollama pull ${modelName}`);
        
        // Set a maximum timeout for the download (4 hours for slow connections)
        const DOWNLOAD_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
        let downloadTimeoutId = null;
        let downloadResolved = false;
        let sigintHandler = null;
        
        pullProcess.stdout.on('data', (data) => {
          process.stdout.write(data);
        });
        
        pullProcess.stderr.on('data', (data) => {
          process.stderr.write(data);
        });
        
        await new Promise((resolve) => {
          // Set timeout to prevent indefinite hanging
          downloadTimeoutId = setTimeout(() => {
            if (!downloadResolved) {
              downloadResolved = true;
              pullProcess.kill('SIGTERM');
              console.log('\n⚠️  Download timeout after 4 hours');
              console.log('💡 Build will continue. Model can be downloaded later: ollama pull deepseek-coder:6.7b');
              resolve();
            }
          }, DOWNLOAD_TIMEOUT);
          
          pullProcess.on('close', (code, signal) => {
            if (downloadTimeoutId) {
              clearTimeout(downloadTimeoutId);
              downloadTimeoutId = null;
            }
            if (downloadResolved) {
              return; // Already handled by timeout or interrupt
            }
            downloadResolved = true;
            
            if (code === 0) {
              console.log('✅ Model downloaded successfully');
              resolve();
            } else if (code === null || code === 130 || signal === 'SIGTERM' || signal === 'SIGINT') {
              // Actually interrupted (SIGINT, Ctrl+C, SIGTERM, etc.)
              console.log('⚠️  Model download was interrupted. Build will continue without bundled model.');
              console.log('💡 Users can download the model later or it will auto-download on first use.');
              resolve();
            } else {
              // Network failure or other error (codes 1, 2, etc.)
              console.warn(`⚠️  Model download failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}.`);
              console.log('💡 This often happens with slow/unstable internet connections.');
              console.log('💡 You can download the model manually with: ollama pull deepseek-coder:6.7b');
              console.log('💡 Ollama will automatically resume from partial downloads, so you can keep retrying.');
              console.log('💡 Build will continue without bundled model.');
              resolve(); // Always continue build
            }
          });
          
          pullProcess.on('error', (error) => {
            if (downloadTimeoutId) {
              clearTimeout(downloadTimeoutId);
              downloadTimeoutId = null;
            }
            if (!downloadResolved) {
              downloadResolved = true;
              console.warn('⚠️  Model download error:', error.message);
              console.log('💡 Build will continue. Model can be downloaded later.');
              resolve(); // Continue build
            }
          });
          
          // Handle SIGINT (Ctrl+C)
          sigintHandler = () => {
            if (!downloadResolved) {
              downloadResolved = true;
              if (downloadTimeoutId) {
                clearTimeout(downloadTimeoutId);
                downloadTimeoutId = null;
              }
              pullProcess.kill('SIGINT');
              console.log('\n⚠️  Download interrupted. Build will continue.');
              resolve();
            }
          };
          process.on('SIGINT', sigintHandler);
        });
        
        // Clean up SIGINT handler
        if (sigintHandler) {
          process.removeListener('SIGINT', sigintHandler);
        }
      }
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log('⚠️  Ollama list command timed out, assuming model needs to be downloaded');
        console.log('📥 Downloading model...');
        console.log(`⏳ This may take several minutes (~4GB download)...`);
        
        // Try to download anyway with timeout handling
        const pullProcess = exec(`ollama pull ${modelName}`);
        const DOWNLOAD_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours for slow connections
        let downloadTimeoutId = null;
        let downloadResolved = false;
        let sigintHandler = null;
        
        pullProcess.stdout.on('data', (data) => {
          process.stdout.write(data);
        });
        
        pullProcess.stderr.on('data', (data) => {
          process.stderr.write(data);
        });
        
        await new Promise((resolve) => {
          // Set timeout to prevent indefinite hanging
          downloadTimeoutId = setTimeout(() => {
            if (!downloadResolved) {
              downloadResolved = true;
              pullProcess.kill('SIGTERM');
              console.log('\n⚠️  Download timeout after 4 hours');
              console.log('💡 Build will continue. Model can be downloaded later: ollama pull deepseek-coder:6.7b');
              resolve();
            }
          }, DOWNLOAD_TIMEOUT);
          
          pullProcess.on('close', (code, signal) => {
            if (downloadTimeoutId) {
              clearTimeout(downloadTimeoutId);
              downloadTimeoutId = null;
            }
            if (downloadResolved) {
              return; // Already handled by timeout or interrupt
            }
            downloadResolved = true;
            
            if (code === 0) {
              console.log('✅ Model downloaded successfully');
              resolve();
            } else if (code === null || code === 130 || signal === 'SIGTERM' || signal === 'SIGINT') {
              // Actually interrupted (SIGINT, Ctrl+C, SIGTERM, etc.)
              console.log('⚠️  Model download was interrupted. Build will continue without bundled model.');
              console.log('💡 Users can download the model later or it will auto-download on first use.');
              resolve();
            } else {
              // Network failure or other error (codes 1, 2, etc.)
              console.warn(`⚠️  Model download failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}.`);
              console.log('💡 This often happens with slow/unstable internet connections.');
              console.log('💡 You can download the model manually with: ollama pull deepseek-coder:6.7b');
              console.log('💡 Ollama will automatically resume from partial downloads, so you can keep retrying.');
              console.log('💡 Build will continue without bundled model.');
              resolve(); // Always continue build
            }
          });
          
          pullProcess.on('error', (error) => {
            if (downloadTimeoutId) {
              clearTimeout(downloadTimeoutId);
              downloadTimeoutId = null;
            }
            if (!downloadResolved) {
              downloadResolved = true;
              console.warn('⚠️  Model download error:', error.message);
              console.log('💡 Build will continue. Model can be downloaded later.');
              resolve(); // Continue build
            }
          });
          
          // Handle SIGINT (Ctrl+C)
          sigintHandler = () => {
            if (!downloadResolved) {
              downloadResolved = true;
              if (downloadTimeoutId) {
                clearTimeout(downloadTimeoutId);
                downloadTimeoutId = null;
              }
              pullProcess.kill('SIGINT');
              console.log('\n⚠️  Download interrupted. Build will continue.');
              resolve();
            }
          };
          process.on('SIGINT', sigintHandler);
        });
        
        // Clean up SIGINT handler
        if (sigintHandler) {
          process.removeListener('SIGINT', sigintHandler);
        }
      } else {
        console.error('❌ Error checking/downloading model:', error.message);
        throw error;
      }
    }
    
    // Get Ollama model path
    const platform = process.platform;
    let ollamaModelsPath;
    const os = require('os');
    
    if (platform === 'win32') {
      // Ollama on Windows can store models in two locations:
      // 1. %USERPROFILE%\.ollama\models (newer default)
      // 2. %LOCALAPPDATA%\ollama\models (older location)
      // Check the newer location first
      const homeDir = process.env.USERPROFILE || os.homedir();
      const newPath = path.join(homeDir, '.ollama', 'models');
      const oldPath = path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), 'ollama', 'models');
      
      // Use whichever exists, prefer the newer location
      if (fs.existsSync(newPath)) {
        ollamaModelsPath = newPath;
      } else if (fs.existsSync(oldPath)) {
        ollamaModelsPath = oldPath;
      } else {
        // Default to newer location if neither exists yet
        ollamaModelsPath = newPath;
      }
    } else if (platform === 'darwin') {
      ollamaModelsPath = path.join(process.env.HOME, '.ollama', 'models');
    } else {
      ollamaModelsPath = path.join(process.env.HOME, '.ollama', 'models');
    }
    
    // Find the model manifest files
    console.log('🔍 Locating model files...');
    const modelManifestPath = path.join(ollamaModelsPath, 'manifests', 'registry.ollama.ai', 'library', 'deepseek-coder');
    
    if (!fs.existsSync(modelManifestPath)) {
      console.warn('⚠️  Model manifest not found at expected location:', modelManifestPath);
      console.warn('💡 Model will not be bundled with installer, but can be downloaded later.');
      console.warn('💡 Users can run: ollama pull deepseek-coder:6.7b');
      console.log('📦 Continuing build without bundled model...');
      return; // Exit gracefully, don't fail build
    }
    
    // Find the blobs directory
    const blobsPath = path.join(ollamaModelsPath, 'blobs');
    if (!fs.existsSync(blobsPath)) {
      console.warn('⚠️  Blobs directory not found. Model will not be bundled.');
      console.log('📦 Continuing build without bundled model...');
      return; // Exit gracefully
    }
    
    // Copy model manifest to build directory
    console.log('📋 Copying model files to build directory...');
    const targetManifestPath = path.join(modelsDir, 'manifests', 'registry.ollama.ai', 'library', 'deepseek-coder');
    
    if (fs.existsSync(targetManifestPath)) {
      console.log('⚠️  Model manifest already exists in build directory, skipping copy');
    } else {
      fs.mkdirSync(path.dirname(targetManifestPath), { recursive: true });
      copyRecursiveSync(modelManifestPath, targetManifestPath);
      console.log('✅ Model manifest copied to build directory');
    }
    
    // Copy blobs directory (contains the actual model weights)
    const targetBlobsPath = path.join(modelsDir, 'blobs');
    if (fs.existsSync(targetBlobsPath)) {
      console.log('⚠️  Blobs already exist in build directory, skipping copy');
    } else {
      console.log('📋 Copying model blobs (this may take a while, ~4GB)...');
      fs.mkdirSync(targetBlobsPath, { recursive: true });
      copyRecursiveSync(blobsPath, targetBlobsPath);
      console.log('✅ Blobs copied to build directory');
    }
    
    console.log('✅ Model preparation complete!');
    console.log(`📁 Model manifest location: ${targetManifestPath}`);
    console.log(`📁 Model blobs location: ${targetBlobsPath}`);
    console.log('🚀 Ready for build');
    
  } catch (error) {
    console.warn('⚠️  Error during model download:', error.message);
    console.warn('💡 Build will continue without bundled model.');
    console.warn('💡 Model can be downloaded later: ollama pull deepseek-coder:6.7b');
    // Don't exit - allow build to continue
    process.exit(0); // Exit with success so build continues
  }
}

// Helper function to copy directories recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Run the download
downloadModel().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

