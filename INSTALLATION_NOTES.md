# Omega OS Installation Notes

## Windows SmartScreen Warning

When you download and run the installer, Windows may show an orange warning saying "Windows protected your PC" or "Windows can't install this app". This is **normal** for unsigned applications and is a Windows security feature.

### To Install:

1. Click **"More info"** on the warning screen
2. Click **"Run anyway"** button
3. The installer will proceed normally

**Why this happens:** Omega OS is not code-signed (code signing certificates cost money). This warning appears for all unsigned Windows applications. The app is safe to install.

## Installation Location

After installation, Omega OS will be installed to:
- **Default location:** `C:\Users\[YourUsername]\AppData\Local\Programs\Omega OS\`
- **Or custom location:** If you chose a different directory during installation

The main executable is: `Omega OS.exe`

## Desktop Shortcut

A desktop shortcut will be created automatically. If you see a "Problem with Shortcut" dialog:
- Click **"Fix it"** to update the shortcut to the correct location
- Or delete the old shortcut and use the Start Menu shortcut instead

## Troubleshooting

### Icon Missing
If the app icon doesn't appear:
1. The icon should be embedded in the executable
2. Try restarting Windows Explorer: Press `Ctrl+Shift+Esc`, find "Windows Explorer", right-click and "Restart"
3. Clear icon cache: Run `ie4uinit.exe -show` in Command Prompt as Administrator

### App Won't Start
1. Make sure you installed to the default location or a location you have write access to
2. Check Windows Event Viewer for error messages
3. Try running as Administrator (right-click → Run as administrator)

### Only See Uninstall File
If you only see `uninstall.exe` in the installation folder:
- The main executable should be in the same folder: `Omega OS.exe`
- If it's missing, the installation may have failed - try reinstalling
- Check if Windows Defender or antivirus removed it

