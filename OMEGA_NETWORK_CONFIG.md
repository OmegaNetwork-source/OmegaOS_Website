# Omega Network Configuration

## Network Details

Based on your Omega Network dashboard:

- **Chain ID:** `1313161768`
- **RPC URL:** `https://0x4e454228.rpc.aurora-c.network` (or check your dashboard for full URL)
- **Explorer:** `https://explorer.omeganetwork.co`
- **Genesis:** `140731510`
- **Engine Account:** `0x4e454228.c.aurora`
- **Engine Version:** `3.9.0`

## Configuration

The `identity-manager.js` has been updated with these values. You can override them with environment variables:

```bash
# Set RPC endpoint
export OMEGA_NETWORK_RPC=https://0x4e454228.rpc.aurora-c.network

# Set Chain ID
export OMEGA_NETWORK_CHAIN_ID=1313161768
```

## Next Steps

1. **Deploy contracts** using Remix IDE (see DEPLOYMENT_GUIDE.md)
2. **Update contract addresses** in `identity-manager.js` after deployment
3. **Test the integration** in Omega OS

## Adding to MetaMask

You can use the "Add to MetaMask" button in your Omega Network dashboard, or manually add:

- **Network Name:** Omega Network
- **RPC URL:** `https://0x4e454228.rpc.aurora-c.network`
- **Chain ID:** `1313161768`
- **Currency Symbol:** (check your dashboard)
- **Block Explorer:** `https://explorer.omeganetwork.co`

