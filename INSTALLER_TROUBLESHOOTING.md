# Installer Troubleshooting Guide

## Issue: Users Only See Uninstaller After Installation

### Problem Description
When users download and install Omega OS from GitHub releases, they only see `uninstall.exe` in the installation directory instead of `Omega OS.exe` and other application files.

### Root Causes Identified

1. **Repository Name Mismatch** ✅ FIXED
   - `package.json` had incorrect repository name (`Omega_OS` instead of `OmegaOS_Website`)
   - This could cause issues with GitHub Actions builds

2. **NSIS Installer Configuration** ✅ IMPROVED
   - Added `allowElevation: true` to allow proper file installation
   - Fixed installer script to use `ExecWait` instead of `Exec`

3. **Missing Files After Installation**
   - If only uninstaller is visible, installation likely failed partway through
   - Could be caused by permissions, antivirus, or installer script errors

### Fixes Applied

#### 1. Fixed Repository Name
```json
"publish": {
  "provider": "github",
  "owner": "OmegaNetwork-source",
  "repo": "OmegaOS_Website"  // Fixed from "Omega_OS"
}
```

#### 2. Improved NSIS Configuration
- Added `allowElevation: true` to enable proper installation permissions
- Fixed installer script to properly handle process termination

### Verification Steps

1. **Test the installer locally:**
   ```bash
   npm run build:win
   ```
   - Check that `dist/Omega OS Setup 1.0.0.exe` is created
   - Test install on a clean Windows 11 VM or machine
   - Verify `Omega OS.exe` exists in installation directory

2. **Check installation directory after install:**
   - Default: `C:\Users\[Username]\AppData\Local\Programs\Omega OS\`
   - Should contain:
     - `Omega OS.exe` (main executable)
     - `resources/` (folder with app files)
     - `uninstall.exe` (uninstaller)
     - Other Electron runtime files

3. **Test on different Windows 11 machines:**
   - Install as regular user (not admin)
   - Check Windows Defender/antivirus logs
   - Verify installation completes successfully

### Common User Issues

#### Windows Defender Blocking Installation
- Users may need to add exception for the installer
- Or click "More info" → "Run anyway" on SmartScreen warning

#### Insufficient Permissions
- Installer should request elevation automatically (with `allowElevation: true`)
- Users should grant admin privileges when prompted

#### Installation Directory Issues
- Default location: `%LOCALAPPDATA%\Programs\Omega OS\`
- Users can choose custom location during installation
- Ensure chosen directory has write permissions

### Build Process

#### Local Build (Recommended for testing)
```bash
npm run build:win
```
- Output: `dist/Omega OS Setup 1.0.0.exe`
- Also creates portable version: `dist/Omega OS-1.0.0-x64.exe`

#### GitHub Actions Build
- Automatically builds when release is created
- Builds for Windows, macOS, and Linux
- Uploads artifacts to release

### Next Steps

1. **Rebuild the installer** with the fixes applied:
   ```bash
   npm run build:win
   ```

2. **Test installation** on a clean Windows 11 machine or VM

3. **Upload to a new release** or update existing release

4. **Verify file structure** after installation:
   ```
   C:\Users\[Username]\AppData\Local\Programs\Omega OS\
   ├── Omega OS.exe          ← Main executable (must exist!)
   ├── resources/
   │   ├── app.asar          ← Packaged application
   │   ├── build/
   │   └── ...
   ├── uninstall.exe         ← Uninstaller
   └── ...
   ```

### If Issue Persists

1. **Check build logs** for errors during `npm run build:win`
2. **Review Windows Event Viewer** for installation errors
3. **Test with Windows Defender disabled** (temporarily) to rule out AV interference
4. **Verify file paths** in the installer using NSIS logging:
   - Add `SetDetailsView show` to installer.nsh for verbose logging
5. **Check disk space** - large installer (~4.6GB) needs adequate space

### Related Files
- `package.json` - Build configuration
- `build/installer.nsh` - Custom NSIS installer script
- `.github/workflows/build.yml` - GitHub Actions build workflow

