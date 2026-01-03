# How to Download SDXL Refiner Model

## Method 1: Direct Download (Recommended)

1. Visit: https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0
2. Click on "Files and versions" tab
3. Find `sd_xl_refiner_1.0.safetensors` (or the fp16 variant)
4. Click the download button
5. Place the file in: `stable-diffusion-webui/models/Stable-diffusion/`

## Method 2: Using Git LFS

If you have Git LFS installed:

```bash
cd stable-diffusion-webui/models/Stable-diffusion/
git lfs install
git clone https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0
# Then copy the .safetensors file to the parent directory
```

## Method 3: Using Python Script

Create a download script:

```python
from huggingface_hub import hf_hub_download
import os

# Set your model directory
model_dir = "C:/stable-diffusion-webui/models/Stable-diffusion"

# Download the refiner model
hf_hub_download(
    repo_id="stabilityai/stable-diffusion-xl-refiner-1.0",
    filename="sd_xl_refiner_1.0.safetensors",
    local_dir=model_dir,
    local_dir_use_symlinks=False
)
```

## Important Notes:

- The refiner model is used AFTER the base model generates an image
- You need BOTH the base model (`sd_xl_base_1.0.safetensors`) AND the refiner
- The refiner improves image quality in the final denoising steps
- Total size: ~6.5GB for the refiner model

## File Locations:

- Base model: `models/Stable-diffusion/sd_xl_base_1.0.safetensors`
- Refiner model: `models/Stable-diffusion/sd_xl_refiner_1.0.safetensors`

