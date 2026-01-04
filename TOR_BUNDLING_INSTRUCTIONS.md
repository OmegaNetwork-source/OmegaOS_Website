# Bundling Tor with Omega OS

## Quick Setup

To bundle Tor with your app:

### Option 1: Manual Placement (Recommended)

1. Download Tor Expert Bundle from: https://www.torproject.org/download/tor/
2. Extract the ZIP file
3. Find `tor.exe` in the extracted files
4. Create directory: `build/tor/`
5. Copy `tor.exe` to: `build/tor/tor.exe`
6. Run `npm run build:win` - Tor will be bundled automatically

### Option 2: Automatic Download Script

The build script will attempt to:
1. Use `winget` to install Tor Browser (if available)
2. Find Tor in common installation locations
3. Copy it to `build/tor/tor.exe`

If automatic download fails, you'll see instructions to place it manually.

## How It Works

- Tor is bundled in `build/tor/tor.exe` during build
- The Tor manager checks for bundled Tor first
- Falls back to system installations if bundled Tor not found
- Automatically starts when VPN is used

## Build Process

When you run `npm run build:win`:
1. `prebuild` script runs `download-tor`
2. Script checks for Tor and places it in `build/tor/`
3. Electron Builder bundles `build/tor/tor.exe` with the app
4. At runtime, Tor is found in `resources/build/tor/tor.exe`

## Testing

After bundling, Tor should:
- Start automatically when app launches
- Be available for VPN connections
- Work without user installation


