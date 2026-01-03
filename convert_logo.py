#!/usr/bin/env python3
"""Convert logo.webp to logo.png and build/icon.ico"""

import os
import sys

try:
    from PIL import Image
    
    # Read the webp file
    webp_path = 'logo.webp'
    if not os.path.exists(webp_path):
        print(f"Error: {webp_path} not found")
        sys.exit(1)
    
    img = Image.open(webp_path)
    
    # Convert to PNG (for website)
    png_path = 'logo.png'
    # Convert RGBA to RGB if needed for better compatibility
    if img.mode == 'RGBA':
        # Create white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        background.save(png_path, 'PNG')
        print(f"[OK] Created {png_path}")
    else:
        img.save(png_path, 'PNG')
        print(f"[OK] Created {png_path}")
    
    # Create ICO file (for Electron app icon)
    # ICO format requires multiple sizes
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = []
    
    for size in ico_sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        ico_images.append(resized)
    
    # Create build directory if it doesn't exist
    os.makedirs('build', exist_ok=True)
    
    # Save as ICO
    ico_path = 'build/icon.ico'
    # PIL's save with ICO format
    # Use the largest size as base and include all sizes
    img.save(ico_path, 'ICO', sizes=[(s[0], s[1]) for s in ico_sizes])
    print(f"[OK] Created {ico_path}")
    
    print("\n[OK] Logo conversion complete!")
    
except ImportError:
    print("Error: PIL/Pillow library not found")
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow'])
    print("Please run this script again")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

