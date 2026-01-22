# Monitor deployment status
# Checks transaction status every 30 seconds

$txHash = "0x222b4306ccf818af58481dfa61f3bedfab39c98d6d059a11af25da3e232d0cf0"

Write-Host "🔍 Monitoring deployment transaction..." -ForegroundColor Cyan
Write-Host "Transaction: $txHash" -ForegroundColor White
Write-Host "Checking every 30 seconds..." -ForegroundColor Yellow
Write-Host ""

$maxChecks = 20
$checkCount = 0

while ($checkCount -lt $maxChecks) {
    $checkCount++
    Write-Host "[$checkCount/$maxChecks] Checking status..." -ForegroundColor Cyan
    
    $result = node check-deployment.js 2>&1
    
    if ($result -match "Contract address:") {
        Write-Host ""
        Write-Host "✅ CONTRACT DEPLOYED!" -ForegroundColor Green
        Write-Host $result
        Write-Host ""
        Write-Host "Next: Update index.html with the contract address" -ForegroundColor Yellow
        break
    } elseif ($result -match "Transaction is still pending") {
        Write-Host "⏳ Still pending..." -ForegroundColor Yellow
    } else {
        Write-Host $result
    }
    
    if ($checkCount -lt $maxChecks) {
        Write-Host "Waiting 30 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
        Write-Host ""
    }
}

if ($checkCount -eq $maxChecks) {
    Write-Host ""
    Write-Host "⚠️  Max checks reached. Transaction may still be processing." -ForegroundColor Yellow
    Write-Host "Check manually: https://explorer.omeganetwork.co/tx/$txHash" -ForegroundColor Cyan
}
