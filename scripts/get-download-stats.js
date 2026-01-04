#!/usr/bin/env node
/**
 * GitHub Releases Download Statistics
 * 
 * Fetches download counts for all assets in GitHub releases
 * Usage: node scripts/get-download-stats.js [owner/repo]
 * 
 * Example: node scripts/get-download-stats.js OmegaNetwork-source/Omega_OS
 */

const axios = require('axios');
const https = require('https');

const REPO = process.argv[2] || 'OmegaNetwork-source/Omega_OS';
const [owner, repo] = REPO.split('/');

if (!owner || !repo) {
  console.error('Error: Invalid repository format. Use: owner/repo');
  console.error('Example: OmegaNetwork-source/Omega_OS');
  process.exit(1);
}

const GITHUB_API = `https://api.github.com/repos/${owner}/${repo}/releases`;

// Custom axios instance with longer timeout
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Omega-OS-Download-Stats',
    'Accept': 'application/vnd.github.v3+json'
  },
  // Add GitHub token if available (optional, but increases rate limit)
  ...(process.env.GITHUB_TOKEN && {
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'Omega-OS-Download-Stats',
      'Accept': 'application/vnd.github.v3+json'
    }
  })
});

async function getReleaseStats() {
  try {
    console.log(`\n📊 Fetching download statistics for ${owner}/${repo}...\n`);
    
    const response = await apiClient.get(GITHUB_API);
    const releases = response.data;

    if (releases.length === 0) {
      console.log('No releases found.');
      return;
    }

    let totalDownloads = 0;
    let totalReleases = 0;
    const platformStats = {
      windows: { downloads: 0, releases: [] },
      mac: { downloads: 0, releases: [] },
      linux: { downloads: 0, releases: [] }
    };

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    RELEASE STATISTICS                      ');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const release of releases) {
      if (release.draft || release.prerelease) {
        continue; // Skip drafts and pre-releases
      }

      totalReleases++;
      let releaseDownloads = 0;

      console.log(`📦 ${release.tag_name} - ${release.name || 'Release'}`);
      console.log(`   Published: ${new Date(release.published_at).toLocaleDateString()}`);
      
      if (release.assets.length === 0) {
        console.log('   No assets found\n');
        continue;
      }

      console.log('   Assets:');
      
      for (const asset of release.assets) {
        releaseDownloads += asset.download_count;
        totalDownloads += asset.download_count;

        // Categorize by platform
        const name = asset.name.toLowerCase();
        if (name.includes('.exe') || name.includes('windows') || name.includes('win-')) {
          platformStats.windows.downloads += asset.download_count;
          if (!platformStats.windows.releases.includes(release.tag_name)) {
            platformStats.windows.releases.push(release.tag_name);
          }
        } else if (name.includes('.dmg') || name.includes('.pkg') || name.includes('mac') || name.includes('darwin')) {
          platformStats.mac.downloads += asset.download_count;
          if (!platformStats.mac.releases.includes(release.tag_name)) {
            platformStats.mac.releases.push(release.tag_name);
          }
        } else if (name.includes('.deb') || name.includes('.rpm') || name.includes('.AppImage') || name.includes('linux')) {
          platformStats.linux.downloads += asset.download_count;
          if (!platformStats.linux.releases.includes(release.tag_name)) {
            platformStats.linux.releases.push(release.tag_name);
          }
        }

        const sizeMB = (asset.size / (1024 * 1024)).toFixed(2);
        console.log(`      • ${asset.name}`);
        console.log(`        Downloads: ${asset.download_count.toLocaleString()} | Size: ${sizeMB} MB`);
      }

      console.log(`   Total for this release: ${releaseDownloads.toLocaleString()} downloads\n`);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                      SUMMARY                               ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`📈 Total Releases: ${totalReleases}`);
    console.log(`📥 Total Downloads: ${totalDownloads.toLocaleString()}\n`);
    
    console.log('📊 By Platform:');
    console.log(`   Windows: ${platformStats.windows.downloads.toLocaleString()} downloads`);
    console.log(`   macOS:   ${platformStats.mac.downloads.toLocaleString()} downloads`);
    console.log(`   Linux:   ${platformStats.linux.downloads.toLocaleString()} downloads\n`);

    console.log('═══════════════════════════════════════════════════════════\n');

    // Return data for programmatic use
    return {
      totalDownloads,
      totalReleases,
      platformStats,
      releases: releases.map(r => ({
        tag: r.tag_name,
        name: r.name,
        published: r.published_at,
        downloads: r.assets.reduce((sum, a) => sum + a.download_count, 0),
        assets: r.assets.map(a => ({
          name: a.name,
          downloads: a.download_count,
          size: a.size
        }))
      }))
    };

  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        console.error(`❌ Repository not found: ${owner}/${repo}`);
        console.error('   Make sure the repository exists and is public.');
      } else if (error.response.status === 403) {
        console.error('❌ Rate limit exceeded or access denied.');
        console.error('   Tip: Set GITHUB_TOKEN environment variable to increase rate limit.');
        console.error('   Example: $env:GITHUB_TOKEN="your_token" node scripts/get-download-stats.js');
      } else {
        console.error(`❌ API Error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      console.error('❌ Network error: Could not connect to GitHub API');
      console.error('   Please check your internet connection.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  getReleaseStats().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { getReleaseStats };


