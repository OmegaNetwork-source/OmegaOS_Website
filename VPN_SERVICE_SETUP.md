# VPN Service Setup - Auto-Connect on Startup

## Step-by-Step Guide to Use a VPN Service

### Step 1: Choose a VPN Service

You need a VPN service that provides **SOCKS5 or HTTP proxy servers**. Popular options:

- **NordVPN** - Provides SOCKS5 proxies (check account dashboard)
- **ExpressVPN** - Provides proxy servers  
- **Surfshark** - Provides proxy access
- **Private Internet Access (PIA)** - Provides SOCKS5 proxies
- **ProtonVPN** - Provides proxy servers
- **Any VPN with proxy support**

### Step 2: Get Your Proxy Server Details

From your VPN service, get:
- **Proxy server address** (e.g., `us1234.nordvpn.com`)
- **Port** (usually `1080` for SOCKS5, `8080` for HTTP)
- **Protocol** (SOCKS5, SOCKS4, HTTP, HTTPS)
- **Authentication** (username/password if required)

Example formats:
- `socks5://us1234.nordvpn.com:1080`
- `socks5://username:password@proxy.example.com:1080`
- `http://proxy.example.com:8080`

### Step 3: Configure VPN Proxies in main.js

1. Open `main.js`
2. Find the `VPN_PROXY_MAP` object (around line 2407)
3. Replace the proxy addresses with your VPN service proxies:

```javascript
const VPN_PROXY_MAP = {
  'United Kingdom-London': 'socks5://uk-proxy.yourvpn.com:1080',
  'United States-New York': 'socks5://us-proxy.yourvpn.com:1080',
  'Germany-Frankfurt': 'socks5://de-proxy.yourvpn.com:1080',
  // Add your VPN proxy servers for each location
  // ... etc
};
```

**Or use environment variables** (see Step 4)

### Step 4: Set Default Location for Auto-Connect

To auto-connect on initial startup, you need to set a default location. You have two options:

#### Option A: Set Default in Code (Recommended)

1. Open `desktop.js`
2. Find the `initializeVpn()` function (around line 1759)
3. Add code to auto-select a default location on first startup:

```javascript
// In initializeVpn() function, add this:
if (!hasSelectedLocation && !hasChosenRealLocation) {
    // Auto-select default location on first startup
    const defaultLocation = {
        country: 'United States',
        city: 'New York',
        region: 'NY',
        ip: '104.248.90.212',
        isp: 'Your VPN Service',
        flag: '🇺🇸'
    };
    
    localStorage.setItem('selectedVpnLocation', JSON.stringify(defaultLocation));
    
    // Connect to VPN immediately
    if (window.electronAPI && window.electronAPI.vpnSetProxy) {
        window.electronAPI.vpnSetProxy({
            country: defaultLocation.country,
            city: defaultLocation.city
        }).then(result => {
            if (result.success) {
                console.log('[VPN] Auto-connected to VPN on startup');
                setTimeout(() => fetchVpnInfo(0), 2000);
            }
        });
    }
    
    // Update display
    vpnInfo = {
        ip: defaultLocation.ip,
        location: `${defaultLocation.city}, ${defaultLocation.region}`,
        country: defaultLocation.country,
        isp: defaultLocation.isp,
        connected: true,
        isFakeLocation: false
    };
    updateVpnDisplay();
    updateVpnIndicator();
    return;
}
```

#### Option B: Use Environment Variable

Set a default location via environment variable:

**Windows PowerShell:**
```powershell
$env:VPN_DEFAULT_LOCATION="United States-New York"
npm start
```

### Step 5: Test It

1. **Start the app**
2. **Check console** - should see "[VPN] Auto-connected to VPN on startup"
3. **Check VPN panel** - should show "Connected" with your VPN IP
4. **Visit https://whatismyipaddress.com/** - should show VPN IP, not your real IP

## Quick Configuration Examples

### Example 1: NordVPN

```javascript
const VPN_PROXY_MAP = {
  'United States-New York': 'socks5://us1234.nordvpn.com:1080',
  'United Kingdom-London': 'socks5://uk1234.nordvpn.com:1080',
  // ... add more
};
```

### Example 2: PIA (Private Internet Access)

```javascript
const VPN_PROXY_MAP = {
  'United States-New York': 'socks5://proxy-nl.privateinternetaccess.com:1080',
  // ... add more
};
```

### Example 3: Custom VPN with Authentication

```javascript
const VPN_PROXY_MAP = {
  'United States-New York': 'socks5://username:password@proxy.example.com:1080',
  // ... add more
};
```

## Troubleshooting

**VPN not connecting on startup:**
- Check that proxy server addresses are correct
- Verify proxy server is accessible
- Check firewall settings
- Look at console logs for error messages

**Still seeing real IP:**
- Verify proxy server is running and accessible
- Check proxy credentials if authentication is required
- Test proxy connection outside the app first

**Connection errors:**
- Verify proxy format is correct (socks5://, http://, etc.)
- Check port numbers
- Verify authentication credentials if required

## Summary

1. **Get VPN proxy servers** from your VPN service
2. **Edit `main.js`** → `VPN_PROXY_MAP` → add your proxy addresses
3. **Edit `desktop.js`** → `initializeVpn()` → add auto-connect code
4. **Test** - VPN should auto-connect on startup!

