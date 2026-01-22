# Complete Setup Script for Wave 1.5
# This script sets up everything needed

Write-Host "🚀 Wave 1.5 Complete Setup" -ForegroundColor Green
Write-Host ""

# Check if backend dependencies are installed
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}

# Create .env file if it doesn't exist
Write-Host ""
Write-Host "⚙️  Setting up backend configuration..." -ForegroundColor Cyan
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "⚠️  Please edit backend\.env and set ADMIN_SECRET!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check contract deployment status: node check-deployment.js" -ForegroundColor White
Write-Host "2. Once contract is deployed, update address: node update-contract-address.js <address>" -ForegroundColor White
Write-Host "3. Start backend: .\start-backend.ps1" -ForegroundColor White
Write-Host "4. Update frontend API_BASE_URL and hCaptcha key in index.html" -ForegroundColor White
Write-Host ""
