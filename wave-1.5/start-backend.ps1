# PowerShell script to start the backend API server
# Run this from the wave-1.5 directory

Write-Host "Starting Wave 1.5 Backend API..." -ForegroundColor Green
Write-Host ""

cd backend

# Check if .env exists, if not create from example
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env and set ADMIN_SECRET!" -ForegroundColor Yellow
    Write-Host ""
}

# Start the server
Write-Host "Starting server on http://localhost:3000" -ForegroundColor Cyan
npm start
