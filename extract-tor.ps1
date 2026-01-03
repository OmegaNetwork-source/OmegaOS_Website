# Extract Tor from portable Tor Browser
$torExe = "C:\Users\richa\Downloads\tor-browser-windows-x86_64-portable-15.0.3.exe"
$extractDir = "C:\Users\richa\Downloads\tor-browser"
$buildTorDir = "build\tor"
$buildTorExe = "$buildTorDir\tor.exe"

Write-Host "Extracting Tor Browser portable..."
Write-Host "This will launch Tor Browser - you can close it after extraction`n"

# Create build/tor directory
if (-not (Test-Path $buildTorDir)) {
    New-Item -ItemType Directory -Path $buildTorDir -Force | Out-Null
}

# Check if already extracted
$torBrowserPath = "$extractDir\Browser\TorBrowser\Tor\tor.exe"
if (Test-Path $torBrowserPath) {
    Write-Host "Found extracted Tor Browser"
} else {
    Write-Host "Running portable executable to extract..."
    Write-Host "Please wait for Tor Browser to extract (it will launch the browser)"
    Write-Host "You can close Tor Browser once it opens`n"
    
    # Run the portable executable
    Start-Process -FilePath $torExe -Wait -NoNewWindow
    
    # Wait a bit for extraction
    $timeout = 60
    $elapsed = 0
    while (-not (Test-Path $torBrowserPath) -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host -NoNewline "."
    }
    Write-Host "`n"
    
    # Try to close Tor Browser if it's running
    Get-Process firefox -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Copy tor.exe
if (Test-Path $torBrowserPath) {
    Copy-Item -Path $torBrowserPath -Destination $buildTorExe -Force
    Write-Host "`n✅ Tor copied to: $buildTorExe"
    Write-Host "✅ Tor is ready for bundling!`n"
} else {
    Write-Host "`n❌ Could not find tor.exe after extraction"
    Write-Host "Expected location: $torBrowserPath"
    Write-Host "`nPlease extract Tor Browser manually:"
    Write-Host "1. Run the portable executable"
    Write-Host "2. Wait for it to extract (creates 'tor-browser' folder)"
    Write-Host "3. Find tor.exe at: Browser\TorBrowser\Tor\tor.exe"
    Write-Host "4. Copy it to: $buildTorExe"
    exit 1
}

