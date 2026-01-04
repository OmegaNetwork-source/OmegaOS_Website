# How to Create Omega OS Release

## Step 1: Build the Application

Run the build command (you may need to run as Administrator):

```bash
npm run build:win
```

Or to build for all platforms:
```bash
npm run build:all
```

The built files will be in the `dist` folder.

## Step 2: Create GitHub Release

1. Go to https://github.com/OmegaNetwork-source/Omega_OS/releases
2. Click "Create a new release"
3. Fill in:
   - **Tag version**: `v1.0.0` (or your version)
   - **Release title**: `Omega OS v1.0.0`
   - **Description**: Add release notes
4. **Upload files** from the `dist` folder:
   - Windows: `Omega OS Setup 1.0.0.exe` and/or `Omega OS 1.0.0.exe` (portable)
   - macOS: `Omega OS-1.0.0.dmg`
   - Linux: `Omega OS-1.0.0.AppImage` and/or `Omega OS_1.0.0_amd64.deb`
5. Click "Publish release"

## Step 3: Update Download Links

Once the release is created, the download links will automatically work because they use the pattern:
- `https://github.com/OmegaNetwork-source/Omega_OS/releases/latest/download/[filename]`

The current filenames in the code are:
- Windows: `Omega-OS-Setup.exe`
- macOS: `Omega-OS.dmg`
- Linux: `Omega-OS.AppImage`

**You may need to update these filenames in `index.html` to match your actual release asset names.**

## Alternative: Automatic Release with electron-builder

If you set up a GitHub token, electron-builder can automatically create releases:

1. Create a GitHub Personal Access Token with `repo` permissions
2. Set it as an environment variable: `GH_TOKEN=your_token_here`
3. Run: `npm run build:win` (or build:all)

This will automatically create the release and upload files!



