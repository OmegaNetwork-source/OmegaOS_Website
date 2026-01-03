# Manual script to copy Tor after extraction
# Instructions:
# 1. Run the portable Tor Browser executable (it will extract and launch)
# 2. Close Tor Browser
# 3. Run this script to copy tor.exe

$torBrowserDir = "C:\Users\richa\Downloads\tor-browser"
$torExeSource = "$torBrowserDir\Browser\TorBrowser\Tor\tor.exe"
$buildTorDir = "build\tor"
$buildTorExe = "$buildTorDir\tor.exe"

Write-Host "Looking for Tor in extracted Tor Browser...`n"

# Check if tor.exe exists in the extracted location
if (Test-Path $torExeSource) {
    Write-Host "✅ Found tor.exe at: $torExeSource"
    
    # Create build/tor directory
    if (-not (Test-Path $buildTorDir)) {
        New-Item -ItemType Directory -Path $buildTorDir -Force | Out-Null
        Write-Host "✅ Created directory: $buildTorDir"
    }
    
    # Copy tor.exe
    Copy-Item -Path $torExeSource -Destination $buildTorExe -Force
    Write-Host "✅ Tor copied to: $buildTorExe"
    Write-Host "`n✅ Tor is ready for bundling!`n"
} else {
    Write-Host "❌ Tor not found at: $torExeSource"
    Write-Host "`nPlease extract Tor Browser first:"
    Write-Host "1. Run: C:\Users\richa\Downloads\tor-browser-windows-x86_64-portable-15.0.3.exe"
    Write-Host "2. Wait for it to extract (it will launch Tor Browser)"
    Write-Host "3. Close Tor Browser"
    Write-Host "4. Run this script again"
    Write-Host "`nThe extraction creates a 'tor-browser' folder in your Downloads directory."
    exit 1
}

