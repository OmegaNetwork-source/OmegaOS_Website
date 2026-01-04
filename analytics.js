// Omega OS Analytics - Privacy-focused usage tracking
// This module tracks basic metrics while respecting user privacy

const { app } = require('electron');
const os = require('os');
const axios = require('axios');

class Analytics {
  constructor() {
    this.enabled = true; // Can be disabled by users
    this.endpoint = process.env.OMEGA_ANALYTICS_ENDPOINT || 'https://analytics.omeganetwork.io/api/track';
    this.userId = this.getOrCreateUserId();
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.heartbeatInterval = null;
  }

  // Get or create a unique user ID (stored locally, not tied to personal info)
  getOrCreateUserId() {
    const fs = require('fs');
    const path = require('path');
    const userIdFile = path.join(app.getPath('userData'), 'analytics-user-id.json');
    
    try {
      if (fs.existsSync(userIdFile)) {
        const data = JSON.parse(fs.readFileSync(userIdFile, 'utf8'));
        return data.userId;
      }
    } catch (e) {
      // File doesn't exist or is corrupted
    }

    // Generate new user ID
    const userId = this.generateUserId();
    try {
      fs.writeFileSync(userIdFile, JSON.stringify({ userId, createdAt: Date.now() }), 'utf8');
    } catch (e) {
      console.error('[Analytics] Failed to save user ID:', e);
    }
    
    return userId;
  }

  generateUserId() {
    // Generate a random UUID-like identifier
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Collect basic system info (no personal data)
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      osVersion: os.release(),
      osType: os.type()
    };
  }

  // Track app launch
  async trackLaunch() {
    if (!this.enabled) return;

    try {
      await this.sendEvent('app_launch', {
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        ...this.getSystemInfo()
      });
    } catch (error) {
      console.error('[Analytics] Failed to track launch:', error.message);
    }
  }

  // Track app close (with session duration)
  async trackClose() {
    if (!this.enabled) return;

    const sessionDuration = Date.now() - this.sessionStartTime;

    try {
      await this.sendEvent('app_close', {
        userId: this.userId,
        sessionId: this.sessionId,
        sessionDuration,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[Analytics] Failed to track close:', error.message);
    }

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send periodic heartbeat to track active users
  startHeartbeat() {
    if (!this.enabled) return;

    // Send heartbeat every 5 minutes
    this.heartbeatInterval = setInterval(() => {
      this.sendEvent('heartbeat', {
        userId: this.userId,
        sessionId: this.sessionId,
        sessionDuration: Date.now() - this.sessionStartTime,
        timestamp: Date.now()
      }).catch(err => console.error('[Analytics] Heartbeat failed:', err.message));
    }, 5 * 60 * 1000);
  }

  // Send event to analytics endpoint
  async sendEvent(eventType, data) {
    if (!this.enabled) return;

    try {
      await axios.post(this.endpoint, {
        event: eventType,
        data: data,
        timestamp: Date.now()
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Omega-OS/${app.getVersion()}`
        }
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (error.code !== 'ECONNREFUSED' && error.response?.status !== 404) {
        console.error('[Analytics] Event send failed:', error.message);
      }
    }
  }

  // Enable/disable analytics
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isEnabled() {
    return this.enabled;
  }
}

module.exports = new Analytics();


