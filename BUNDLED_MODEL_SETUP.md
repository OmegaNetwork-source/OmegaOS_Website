# Bundled DeepSeek Coder Model Setup

## Overview
Omega OS bundles `deepseek-coder:6.7b` (~4GB) directly with the installer for optimal code generation quality.

## Model Details
- **Model**: `deepseek-coder:6.7b`
- **Size**: ~4GB
- **Purpose**: Best-in-class code generation (HTML, CSS, JavaScript, Python, etc.)
- **Performance**: Significantly better than smaller models for complex code generation

## Build Process

### Automatic Download During Build
The build process automatically downloads the model:

1. **Pre-build Script**: `npm run download-model` runs automatically before build
2. **Download**: Uses Ollama to pull `deepseek-coder:6.7b`
3. **Copy**: Copies model files to `build/models/` directory
4. **Bundle**: electron-builder includes the model in the installer

### Manual Download (if needed)
If you need to download the model manually:
```bash
npm run download-model
```

### Build Commands
```bash
# Build with automatic model download
npm run build

# Or build for specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

## Installation Process
1. **Installer**: Includes the model (~4.6GB total installer size)
2. **First Run**: Model is automatically available (no download needed)
3. **User Experience**: Instant AI code generation ready

## Model Location
- **Bundled**: `resources/models/deepseek-coder-6.7b/`
- **Runtime**: `userData/ollama/models/` (Ollama's standard location)

## Requirements
- **Ollama**: Must be installed and in PATH before building
  - Download from: https://ollama.ai
  - The script will check for Ollama before downloading

## Fallback Behavior
If bundled model is not found at runtime:
- App will attempt to download from Ollama registry
- User can manually pull: `ollama pull deepseek-coder:6.7b`

## Benefits
✅ **No download wait** - Model ready immediately  
✅ **Better quality** - Professional-grade code generation  
✅ **Consistent experience** - All users get the same model  
✅ **Offline capable** - Works without internet after install  
✅ **Automatic** - No manual steps needed during build

## Installer Size
- **App**: ~500MB
- **Ollama Binaries**: ~100MB
- **DeepSeek Model**: ~4GB
- **Total**: ~4.6GB installer

## Build Script Details
The `scripts/download-model.js` script:
1. Checks if Ollama is installed
2. Downloads the model if not already present
3. Copies model files to `build/models/` directory
4. Prepares files for electron-builder bundling

## Notes
- Model download takes ~5-10 minutes depending on internet speed
- Ensure you have ~5GB free disk space for the build process
- The model is included in the installer, so final installer is ~4.6GB
- NSIS compression may reduce installer size slightly

