# Wave 1.5 Backend API

Backend API server for anti-bot protection on the Wave 1.5 airdrop.

## Features

- **IP Rate Limiting**: Maximum 2 claims per IP address
- **Wallet Verification**: Checks transaction count (minimum 3 transactions)
- **Claim Recording**: Tracks successful claims
- **Statistics**: Provides claim statistics endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional):
```bash
export PORT=3000
export ADMIN_SECRET=your-secret-key
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "maxClaimsPerIP": 2,
    "minTransactionCount": 3
  }
}
```

### `POST /api/verify-ip`
Verify if an IP address can make a claim.

**Response (allowed):**
```json
{
  "allowed": true,
  "remaining": 1,
  "currentCount": 1,
  "maxAllowed": 2
}
```

**Response (blocked):**
```json
{
  "allowed": false,
  "reason": "Maximum 2 claims per IP address exceeded",
  "remaining": 0,
  "currentCount": 2
}
```

### `POST /api/verify-wallet`
Verify wallet eligibility based on transaction count.

**Request:**
```json
{
  "address": "0x..."
}
```

**Response (eligible):**
```json
{
  "eligible": true,
  "transactionCount": 5,
  "hasBalance": true,
  "balance": "0.1",
  "address": "0x..."
}
```

**Response (not eligible):**
```json
{
  "eligible": false,
  "reason": "Wallet must have at least 3 transactions. Current: 1",
  "transactionCount": 1,
  "required": 3
}
```

### `POST /api/record-claim`
Record a successful claim after on-chain transaction.

**Request:**
```json
{
  "address": "0x...",
  "txHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "ip": "127.0.0.1",
  "address": "0x...",
  "txHash": "0x..."
}
```

### `GET /api/stats`
Get claim statistics.

**Response:**
```json
{
  "totalIPs": 10,
  "totalWallets": 15,
  "ipClaims": {
    "127.0.0.1": 2,
    "192.168.1.1": 1
  },
  "config": {
    "maxClaimsPerIP": 2,
    "minTransactionCount": 3
  }
}
```

### `POST /api/admin/reset-ip`
Reset IP claim counts (admin only).

**Request:**
```json
{
  "ip": "127.0.0.1",
  "secret": "your-admin-secret"
}
```

## Configuration

Edit `server.js` to change:
- `MAX_CLAIMS_PER_IP`: Maximum claims per IP (default: 2)
- `MIN_TRANSACTION_COUNT`: Minimum transactions required (default: 3)
- `RPC_URL`: Omega Network RPC endpoint

## Production Considerations

1. **Use a database**: Replace in-memory storage with Redis or PostgreSQL
2. **Add authentication**: Protect admin endpoints
3. **Add rate limiting**: Use express-rate-limit middleware
4. **Add logging**: Use winston or similar
5. **Add monitoring**: Set up health checks and alerts
6. **Use environment variables**: Store secrets securely

## Deployment

The server can be deployed to:
- Heroku
- Railway
- DigitalOcean
- AWS EC2
- Any Node.js hosting service

Make sure to:
- Set `PORT` environment variable
- Set `ADMIN_SECRET` for admin endpoints
- Configure CORS if needed
- Set up reverse proxy (nginx) for production
