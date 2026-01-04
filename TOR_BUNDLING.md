# Bundling Tor with Omega OS

This guide explains how Tor is bundled with Omega OS for privacy features.

## Overview

Omega OS includes a **Tor daemon manager** that automatically downloads and manages the Tor network client. This allows users to route their traffic through the Tor network for enhanced privacy without needing to install Tor separately.

## What Gets Bundled

- **Tor Daemon** (not the full Tor Browser)
  - Windows: ~10-20MB (tor.exe)
  - macOS/Linux: Uses system Tor if available, or can download static binary
  - Automatically downloaded on first use
  - Stored in user data directory

## How It Works

1. **First Use**: When a user enables VPN/Tor mode, the Tor manager checks if Tor is installed
2. **Auto-Download**: If not found, it automatically downloads Tor for Windows (macOS/Linux users need system Tor)
3. **Auto-Start**: Tor daemon starts automatically when needed
4. **Auto-Stop**: Tor stops when the app closes or VPN is disabled

## Integration with VPN System

The bundled Tor integrates seamlessly with the existing VPN system:

- When a user selects a VPN location that uses Tor (`socks5://127.0.0.1:9050`)
- The system automatically checks if Tor is running
- If not running, it starts the bundled Tor daemon
- All browser traffic is routed through Tor

## API Usage

### From Renderer Process (JavaScript)

```javascript
// Check Tor status
const status = await window.electronAPI.torStatus();
console.log('Tor running:', status.isRunning);

// Start Tor (if not running)
await window.electronAPI.torStart();

// Stop Tor
await window.electronAPI.torStop();

// Initialize/Download Tor (first time)
await window.electronAPI.torInitialize();
```

### From Main Process (Node.js)

```javascript
const torManager = require('./tor-manager');

// Start Tor
await torManager.start();

// Check if running
const isRunning = await torManager.isTorRunning();

// Stop Tor
await torManager.stop();

// Get status
const status = torManager.getStatus();
```

## Platform Support

### Windows
- ✅ Fully supported
- Automatically downloads Tor Expert Bundle
- Extracts and manages tor.exe
- No user interaction required

### macOS
- ⚠️ Requires system Tor installation
- Uses `brew install tor` or system package manager
- Falls back to checking if Tor is in PATH

### Linux
- ⚠️ Requires system Tor installation
- Uses system package manager (`apt-get install tor`, `yum install tor`, etc.)
- Falls back to checking if Tor is in PATH

## File Locations

### Windows
- Tor executable: `%APPDATA%/omega-os/tor/tor.exe`
- Tor data: `%APPDATA%/omega-os/tor-data/`

### macOS/Linux
- Uses system Tor if available
- Data directory: `~/.config/omega-os/tor-data/`

## Configuration

Tor is configured with:
- SOCKS5 port: `9050` (default)
- Control port: `9051` (for future control features)
- Exit nodes: US, GB, DE, FR, NL (for better performance)
- Strict nodes: Disabled (allows faster connections)

## Privacy Considerations

- ✅ Tor daemon runs locally
- ✅ No data sent to external servers (except Tor network)
- ✅ User controls when Tor is enabled/disabled
- ✅ Tor stops automatically when app closes
- ⚠️ Users should understand Tor's limitations
- ⚠️ Some sites may block Tor exit nodes

## Troubleshooting

### Tor Won't Start

1. **Check if port 9050 is in use:**
   ```bash
   # Windows
   netstat -ano | findstr :9050
   
   # macOS/Linux
   lsof -i :9050
   ```

2. **Check Tor logs:**
   - Look in console output for `[Tor]` messages
   - Check `tor-data/tor.log` in user data directory

3. **Manual start:**
   ```javascript
   await window.electronAPI.torInitialize();
   await window.electronAPI.torStart();
   ```

### Tor Download Fails

- Check internet connection
- Verify firewall isn't blocking downloads
- Try manual download from https://www.torproject.org/download/tor/
- Place `tor.exe` in `%APPDATA%/omega-os/tor/`

### Slow Connections

- Tor adds latency (this is normal)
- Consider using non-Tor VPN locations for better speed
- Tor is best for privacy, not speed

## Future Enhancements

- [ ] Tor control port integration (circuit management)
- [ ] Bridge support for censored regions
- [ ] Onion service support
- [ ] Tor Browser integration (full browser)
- [ ] Automatic updates for bundled Tor

## Legal & Ethical Notes

- Tor is legal in most countries
- Some countries restrict or ban Tor
- Users are responsible for compliance with local laws
- Tor should be used responsibly and ethically
- Omega OS does not condone illegal activities

## Resources

- Tor Project: https://www.torproject.org/
- Tor Documentation: https://2019.www.torproject.org/docs/documentation.html
- Tor Expert Bundle: https://www.torproject.org/download/tor/

---

For questions or issues, please open an issue on GitHub.


