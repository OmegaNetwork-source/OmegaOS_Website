# VPN Setup Guide

## ✅ Tor is Now the Default VPN!

**Great news!** The VPN now uses **Tor by default** for all locations. This means:
- ✅ **No configuration needed** - it works out of the box!
- ✅ Just make sure **Tor is running** (see below)
- ✅ All VPN locations automatically route through Tor

## Quick Start

### Step 1: Install and Start Tor

The VPN uses Tor by default, so you need Tor running on your system:

**Option A: Tor Browser (Easiest)**
1. Download and install [Tor Browser](https://www.torproject.org/download/)
2. **Start Tor Browser** - this will start the Tor service on `127.0.0.1:9050`
3. You can close the browser window, but keep Tor running
4. Now your VPN will work!

**Option B: Tor Service (Advanced)**
If you have Tor installed as a service, make sure it's running on port 9050.

### Step 2: Use the VPN

1. **Start the app** (make sure Tor is running first)
2. **Select a VPN location** from the VPN panel
3. **That's it!** Your traffic will route through Tor

The browser will automatically:
- ✅ Connect to Tor when you select a location
- ✅ Show your real Tor IP address
- ✅ Route all traffic through Tor
- ✅ Auto-reconnect on startup if location was previously selected

## Testing

1. **Select a VPN location** in the browser
2. **Check the VPN panel** - should show "Connected" without "Using spoofed location" warning
3. **Visit https://whatismyipaddress.com/**:
   - Should show a Tor exit node IP (not your real IP)
   - Location will vary (Tor routes through multiple nodes)

## Custom Proxy Servers (Optional)

If you want to use different proxy servers instead of Tor, you can override the default:

### Method 1: Environment Variables

Set environment variables before starting the app:

**Windows PowerShell:**
```powershell
$env:VPN_PROXY_UK="socks5://your-proxy-server:1080"
$env:VPN_PROXY_US="socks5://your-proxy-server:1080"
npm start
```

**Windows CMD:**
```cmd
set VPN_PROXY_UK=socks5://your-proxy-server:1080
set VPN_PROXY_US=socks5://your-proxy-server:1080
npm start
```

**Linux/Mac:**
```bash
export VPN_PROXY_UK="socks5://your-proxy-server:1080"
export VPN_PROXY_US="socks5://your-proxy-server:1080"
npm start
```

### Method 2: Edit main.js

1. Open `main.js`
2. Find the `VPN_PROXY_MAP` object (around line 2407)
3. Replace `TOR_PROXY` with your proxy server address:

```javascript
const VPN_PROXY_MAP = {
  'United Kingdom-London': 'socks5://your-proxy-server:1080',
  'United States-New York': 'socks5://your-proxy-server:1080',
  // ... etc
};
```

**Proxy Format:**
- `socks5://host:port` (recommended)
- `socks4://host:port`
- `http://host:port`
- `https://host:port`
- `socks5://username:password@host:port` (with auth)

## Troubleshooting

**"Using spoofed location" warning:**
- This means Tor (or configured proxy) is not running or not accessible
- Make sure Tor Browser is running, or your proxy server is accessible

**Still seeing real IP:**
- Check that Tor is running: `127.0.0.1:9050` should be accessible
- Verify firewall/network settings aren't blocking Tor
- Try restarting Tor Browser

**Connection errors:**
- Verify Tor is running on port 9050
- Check firewall settings
- For custom proxies, verify the proxy address and port are correct

**VPN not auto-connecting on startup:**
- Make sure you've selected a location at least once
- The location preference is saved and will auto-connect on next startup

## How It Works

1. **Default**: All locations use Tor (`socks5://127.0.0.1:9050`)
2. **On Location Selection**: Browser connects to Tor proxy
3. **On Startup**: If location was previously selected, automatically reconnects to Tor
4. **IP Detection**: Fetches real IP from Tor exit node to display in UI
5. **Override**: Environment variables or code edits can override Tor for specific locations

## Summary

- ✅ **Tor is the default** - no configuration needed!
- ✅ **Just start Tor Browser** before using the app
- ✅ **Select a location** and VPN works automatically
- ✅ **Optional**: Override with custom proxies if needed

That's it! The VPN now works out of the box with Tor.
