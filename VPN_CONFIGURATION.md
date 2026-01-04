# VPN Configuration Guide

## Issue: VPN Not Working

The VPN feature in Omega OS was **cosmetic only** - it displayed fake IP addresses and locations in the UI but didn't actually route traffic through a VPN server. This is why websites detected your real IP address instead of the VPN location.

## Solution: Real VPN Proxy Support

I've updated the code to support **real VPN routing** through proxy servers. Now when you select a VPN location, the browser will attempt to route traffic through a configured proxy server for that location.

## How It Works

1. **Fake Location Mode (Default)**: If no proxy is configured for a location, it will show a fake IP/location in the UI (cosmetic only) and display a warning "Using spoofed location".

2. **Real VPN Mode**: If a proxy server is configured for a location, traffic will be routed through that proxy, and the browser will fetch your real IP from the proxy to display in the UI.

## Configuration

### Option 1: Environment Variables (Recommended)

Set environment variables for each VPN location before starting the app:

```bash
# Windows PowerShell
$env:VPN_PROXY_UK="socks5://your-proxy-server:1080"
$env:VPN_PROXY_US="socks5://your-proxy-server:1080"
npm start

# Windows CMD
set VPN_PROXY_UK=socks5://your-proxy-server:1080
set VPN_PROXY_US=socks5://your-proxy-server:1080
npm start

# Linux/Mac
export VPN_PROXY_UK="socks5://your-proxy-server:1080"
export VPN_PROXY_US="socks5://your-proxy-server:1080"
npm start
```

### Option 2: Edit main.js

Edit the `VPN_PROXY_MAP` object in `main.js` (around line 2400) to add proxy servers:

```javascript
const VPN_PROXY_MAP = {
  'United Kingdom-London': 'socks5://your-proxy-server:1080',
  'United States-New York': 'socks5://your-proxy-server:1080',
  // ... etc
};
```

### Proxy Format

Supported proxy formats:
- `socks5://host:port` (recommended for VPN)
- `socks4://host:port`
- `http://host:port`
- `https://host:port`

## Using a Real VPN Service

To use this feature with a real VPN service, you need:

1. **A VPN service** that provides proxy/SOCKS5 access (many VPNs do)
2. **Proxy server credentials** from your VPN provider
3. **Configure the proxy** using one of the methods above

### Popular VPN Services with Proxy Support

- **NordVPN**: Provides SOCKS5 proxies
- **ExpressVPN**: Provides proxy servers
- **Surfshark**: Provides proxy access
- **Private Internet Access (PIA)**: Provides SOCKS5 proxies
- **Tor**: Can be used via `socks5://127.0.0.1:9050` (if Tor is running)

### Example: Using Tor

If you have Tor running locally:

```bash
# Set Tor proxy for all locations
$env:VPN_PROXY_UK="socks5://127.0.0.1:9050"
$env:VPN_PROXY_US="socks5://127.0.0.1:9050"
npm start
```

## Current Status

- ✅ VPN proxy routing implemented
- ✅ Location selector connects to proxy when configured
- ✅ Real IP detection after proxy connection
- ✅ Warning shown when using fake location
- ⚠️ **You need to configure proxy servers** for real VPN to work

## Testing

1. Select a VPN location in the browser
2. Check the VPN panel - if you see "Using spoofed location", no proxy is configured
3. Visit `https://whatismyipaddress.com/` - it should show your real IP if no proxy is configured
4. After configuring a proxy, refresh and check again - it should show the proxy's IP

## Troubleshooting

- **Still seeing real IP**: Make sure the proxy server is running and accessible
- **Connection errors**: Check proxy server address and port
- **"Using spoofed location" warning**: This means no proxy is configured for the selected location
- **Proxy not working**: Verify proxy credentials and server status


