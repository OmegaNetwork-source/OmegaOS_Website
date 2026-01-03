# Analytics & Metrics Tracking for Omega OS

This document explains how to track downloads and user metrics for Omega OS.

## Overview

Omega OS includes a privacy-focused analytics system that tracks:
- App launches
- Active users (via periodic heartbeats)
- Session duration
- Platform and version information

**All tracking is anonymous and respects user privacy.** No personal data is collected.

## 1. GitHub Releases Download Statistics

### Using the Download Stats Script

The easiest way to track downloads is using the built-in GitHub Releases API script:

```bash
# Get download stats for your repository
node scripts/get-download-stats.js OmegaNetwork-source/Omega_OS

# With GitHub token (increases rate limit)
$env:GITHUB_TOKEN="your_token_here"
node scripts/get-download-stats.js OmegaNetwork-source/Omega_OS
```

This script shows:
- Total downloads across all releases
- Downloads per release
- Downloads by platform (Windows/macOS/Linux)
- Download counts for each asset file

### Creating a GitHub Token (Optional)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `public_repo` scope
3. Use it as shown above

**Note:** The script works without a token, but GitHub's rate limit is lower (60 requests/hour vs 5,000/hour with token).

### Programmatic Access

You can also use the script programmatically:

```javascript
const { getReleaseStats } = require('./scripts/get-download-stats');

getReleaseStats().then(stats => {
  console.log('Total downloads:', stats.totalDownloads);
  console.log('Platform breakdown:', stats.platformStats);
});
```

## 2. In-App Analytics (Optional)

### Setup

1. **Set up an analytics endpoint** (or use a service like Plausible, PostHog, or custom endpoint)

2. **Configure the endpoint** by setting an environment variable:
   ```bash
   # Windows
   $env:OMEGA_ANALYTICS_ENDPOINT="https://your-analytics-endpoint.com/api/track"
   
   # Linux/Mac
   export OMEGA_ANALYTICS_ENDPOINT="https://your-analytics-endpoint.com/api/track"
   ```

3. **The analytics module automatically:**
   - Tracks app launches
   - Sends periodic heartbeats (every 5 minutes) to track active users
   - Tracks session duration on app close
   - Collects anonymous system info (platform, version, OS type)

### What Data is Collected

The analytics module sends the following data:

```javascript
{
  event: "app_launch" | "heartbeat" | "app_close",
  data: {
    userId: "user_abc123...",        // Anonymous user ID (local only)
    sessionId: "session_xyz...",     // Session ID
    timestamp: 1234567890,
    platform: "win32",               // Platform
    arch: "x64",                     // Architecture
    version: "1.0.0",                // App version
    electronVersion: "28.0.0",       // Electron version
    osVersion: "10.0.26200",         // OS version
    osType: "Windows_NT",            // OS type
    sessionDuration: 300000          // Only in app_close (ms)
  }
}
```

### Privacy Features

- ✅ Anonymous user IDs (not tied to personal information)
- ✅ No IP address tracking
- ✅ No location data
- ✅ No personal information collected
- ✅ Can be disabled by users (if you add a UI toggle)

### Setting Up a Custom Analytics Endpoint

Your endpoint should accept POST requests with this format:

```javascript
POST /api/track
Content-Type: application/json

{
  "event": "app_launch",
  "data": { /* event data */ },
  "timestamp": 1234567890
}
```

Example endpoint implementation (Node.js/Express):

```javascript
const express = require('express');
const app = express();

app.use(express.json());

const events = []; // Or use a database

app.post('/api/track', (req, res) => {
  const { event, data, timestamp } = req.body;
  
  // Store the event
  events.push({ event, data, timestamp });
  
  // Or save to database, send to analytics service, etc.
  
  res.json({ success: true });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    totalLaunches: events.filter(e => e.event === 'app_launch').length,
    activeUsers: new Set(events.map(e => e.data.userId)).size,
    // ... more stats
  };
  res.json(stats);
});

app.listen(3000);
```

### Recommended Analytics Services

1. **Plausible Analytics** (Privacy-focused, GDPR compliant)
   - Self-hosted or cloud
   - Simple API integration
   - https://plausible.io/

2. **PostHog** (Open source, self-hostable)
   - Full-featured analytics
   - Event tracking
   - https://posthog.com/

3. **Custom Endpoint**
   - Full control
   - Use any database/backend
   - Privacy-focused by design

## 3. Disabling Analytics

Users can disable analytics by setting:

```bash
$env:OMEGA_ANALYTICS_ENDPOINT=""
```

Or by modifying the `analytics.js` file to set `enabled: false` by default.

You can also add a settings UI toggle to let users opt out.

## 4. Viewing Your Metrics

### GitHub Downloads
Run the download stats script regularly to track growth:
```bash
node scripts/get-download-stats.js
```

### In-App Analytics
If you've set up an endpoint, query it for statistics:
- Total launches
- Active users (unique user IDs)
- Session durations
- Platform distribution
- Version adoption

## Example Workflow

1. **After each release:**
   ```bash
   node scripts/get-download-stats.js > stats.txt
   ```

2. **Monitor active users:**
   - Set up analytics endpoint
   - Check endpoint dashboard/API for active user counts
   - Track growth over time

3. **Combine data:**
   - GitHub downloads = Total installations
   - Analytics active users = Current user base
   - Compare to see retention rates

## Privacy Considerations

- Always be transparent about data collection
- Consider adding a privacy policy
- Allow users to opt out
- Only collect necessary data
- Don't collect personal information
- Comply with GDPR, CCPA, and other regulations

---

For questions or issues, please open an issue on GitHub.

