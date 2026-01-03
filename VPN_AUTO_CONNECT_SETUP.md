# VPN Auto-Connect Setup - Step by Step

## What You Need to Do

To make the VPN **automatically connect on initial startup**, follow these steps:

## Step 1: Get VPN Service Proxy Servers

You need a VPN service that provides proxy/SOCKS5 servers. Get the proxy details:

- **Proxy server address** (e.g., `us1234.nordvpn.com`)
- **Port** (usually `1080` for SOCKS5)
- **Protocol** (SOCKS5 recommended)

**Example formats:**
- `socks5://us1234.nordvpn.com:1080`
- `socks5://username:password@proxy.example.com:1080` (if auth required)

## Step 2: Configure VPN Proxies in main.js

1. **Open `main.js`**
2. **Find `VPN_PROXY_MAP`** (around line 2407)
3. **Replace `null` with your VPN proxy addresses:**

```javascript
const VPN_PROXY_MAP = {
  'United Kingdom-London': 'socks5://uk-proxy.yourvpn.com:1080',
  'United States-New York': 'socks5://us-proxy.yourvpn.com:1080',  // ← Configure this one!
  'Germany-Frankfurt': 'socks5://de-proxy.yourvpn.com:1080',
  // Add more locations as needed
};
```

**Important:** Configure at least the **"United States-New York"** location since that's the default for auto-connect.

## Step 3: That's It!

The code is already set up to:
- ✅ **Auto-connect on initial startup** to "United States-New York"
- ✅ **Auto-reconnect on subsequent startups** if location was previously selected
- ✅ **Show real VPN IP** after connecting

## Step 4: Test It

1. **Start the app** (first time)
2. **Check console** - should see: `[VPN] Auto-connected to VPN on initial startup`
3. **Check VPN panel** - should show "Connected" with VPN IP
4. **Visit https://whatismyipaddress.com/** - should show VPN IP, not your real IP

## Change Default Location (Optional)

To auto-connect to a different location on startup, edit `desktop.js`:

1. Find `initializeVpn()` function (around line 1776)
2. Change the `defaultLocationKey`:

```javascript
const defaultLocationKey = 'United Kingdom-London'; // Change this
```

Or find the location in the code:
```javascript
const defaultLocation = VPN_LOCATIONS.find(loc => 
    loc.country === 'United Kingdom' && loc.city === 'London'  // Change this
);
```

## Example: NordVPN Setup

```javascript
// In main.js, VPN_PROXY_MAP:
'United States-New York': 'socks5://us1234.nordvpn.com:1080',
'United Kingdom-London': 'socks5://uk1234.nordvpn.com:1080',
```

## Example: PIA (Private Internet Access)

```javascript
'United States-New York': 'socks5://proxy-nl.privateinternetaccess.com:1080',
```

## Troubleshooting

**VPN not auto-connecting:**
- Check that you configured the proxy in `VPN_PROXY_MAP`
- Verify the proxy server address and port are correct
- Check console for error messages

**Still seeing real IP:**
- Verify proxy server is accessible
- Check firewall settings
- Test proxy connection outside the app

**"Using spoofed location" warning:**
- This means the proxy isn't configured or not accessible
- Double-check your proxy address in `VPN_PROXY_MAP`

## Summary

1. **Get VPN proxy servers** from your VPN service
2. **Edit `main.js`** → `VPN_PROXY_MAP` → add proxy addresses (at least "United States-New York")
3. **Done!** VPN will auto-connect on initial startup

The code is already configured to auto-connect - you just need to add your VPN proxy addresses!

