const { app } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sdManager = require('./stable-diffusion-manager');

class StableDiffusionService {
  constructor() {
    this.isReady = false;
    this.isLoading = false;
    // Automatic1111 WebUI default port: 7860
    this.sdUrl = 'http://127.0.0.1:7860';
    this.apiType = 'automatic1111';
    this.preferredModel = 'sd_xl_base_1.0.safetensors'; // SDXL base model
  }

  async checkStableDiffusion() {
    // Try Automatic1111 first
    try {
      const response = await axios.get(`${this.sdUrl}/sdapi/v1/options`, {
        timeout: 5000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      this.apiType = 'automatic1111';
      return { available: true, apiType: 'automatic1111', models: [] };
    } catch (error) {
      console.log(`[SD Service] Automatic1111 check failed: ${error.message}`);
    }

    // Try ComfyUI
    try {
      const comfyUrl = 'http://127.0.0.1:8188';
      const response = await axios.get(`${comfyUrl}/system_stats`, {
        timeout: 5000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      this.sdUrl = comfyUrl;
      this.apiType = 'comfyui';
      return { available: true, apiType: 'comfyui', models: [] };
    } catch (error) {
      console.log(`[SD Service] ComfyUI check failed: ${error.message}`);
    }

    return { available: false, error: 'Stable Diffusion not running' };
  }

  async initialize() {
    if (this.isLoading) {
      return;
    }

    if (this.isReady) {
      return;
    }

    this.isLoading = true;
    console.log('[SD Service] Initializing Stable Diffusion service...');

    try {
      // First, try to start Stable Diffusion if not running
      const isRunning = await this.checkStableDiffusionRunning();
      if (!isRunning) {
        console.log('[SD Service] Stable Diffusion not running, attempting to start...');
        try {
          await sdManager.start();
          // Wait a bit for it to fully initialize
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.warn('[SD Service] Could not auto-start Stable Diffusion:', error.message);
          // Continue to check if it's running anyway (user might have started it manually)
        }
      }

      const check = await this.checkStableDiffusion();
      
      if (!check.available) {
        throw new Error('Stable Diffusion is not running. Please start Automatic1111 WebUI manually or ensure it is installed.');
      }

      // Ensure SDXL model is loaded
      await this.ensureSDXLModel();

      this.isReady = true;
      this.apiType = check.apiType;
      console.log(`[SD Service] Initialized with ${this.apiType}`);
    } catch (error) {
      console.error('[SD Service] Initialization error:', error);
      this.isReady = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async checkStableDiffusionRunning() {
    return await sdManager.checkStableDiffusionRunning();
  }

  async ensureSDXLModel() {
    try {
      // Get current model
      const response = await axios.get(`${this.sdUrl}/sdapi/v1/options`, { timeout: 5000 });
      const currentModel = response.data?.sd_model_checkpoint || '';
      
      // Check if SDXL model is loaded
      if (currentModel.includes('sd_xl') || currentModel.includes('sdxl')) {
        console.log('[SD Service] SDXL model already loaded:', currentModel);
        return true;
      }

      // Try to find and switch to SDXL model
      const models = await this.getModels();
      const sdxlModel = models.find(m => 
        m.model_name.includes('sd_xl') || 
        m.model_name.includes('sdxl') ||
        m.title.toLowerCase().includes('sdxl')
      );

      if (sdxlModel) {
        console.log('[SD Service] Switching to SDXL model:', sdxlModel.model_name);
        await this.setModel(sdxlModel.model_name);
        return true;
      } else {
        console.warn('[SD Service] SDXL model not found. Please download SDXL model to use SDXL features.');
        return false;
      }
    } catch (error) {
      console.error('[SD Service] Error ensuring SDXL model:', error);
      return false;
    }
  }

  async generateImage(prompt, negativePrompt = '', width = 512, height = 512, steps = 20, cfgScale = 7, seed = -1) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (this.apiType === 'automatic1111') {
        return await this.generateImageAutomatic1111(prompt, negativePrompt, width, height, steps, cfgScale, seed);
      } else if (this.apiType === 'comfyui') {
        return await this.generateImageComfyUI(prompt, negativePrompt, width, height, steps, cfgScale, seed);
      } else {
        throw new Error('Unknown API type');
      }
    } catch (error) {
      console.error('[SD Service] Generate image error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Stable Diffusion is not running. Please start Automatic1111 WebUI or ComfyUI.');
      }
      throw error;
    }
  }

  async generateImageAutomatic1111(prompt, negativePrompt, width, height, steps, cfgScale, seed) {
    // For SDXL, default to 1024x1024 if not specified
    const finalWidth = width || 1024;
    const finalHeight = height || 1024;
    
    const payload = {
      prompt: prompt,
      negative_prompt: negativePrompt || 'blurry, low quality, distorted, ugly, bad anatomy',
      width: finalWidth,
      height: finalHeight,
      steps: steps || 30, // SDXL benefits from more steps
      cfg_scale: cfgScale || 7,
      seed: seed === -1 ? -1 : seed,
      sampler_name: 'DPM++ 2M Karras', // Good for SDXL
      enable_hr: false,
      denoising_strength: 0.7,
    };

    const response = await axios.post(`${this.sdUrl}/sdapi/v1/txt2img`, payload, {
      timeout: 300000, // 5 minutes timeout for image generation
      responseType: 'json'
    });

    if (response.data && response.data.images && response.data.images.length > 0) {
      // Return base64 image data
      return {
        success: true,
        image: response.data.images[0],
        info: response.data.info || {}
      };
    } else {
      throw new Error('No image generated');
    }
  }

  async generateImageComfyUI(prompt, negativePrompt, width, height, steps, cfgScale, seed) {
    // ComfyUI requires a workflow JSON, which is more complex
    // For now, we'll use a simplified approach
    // Note: ComfyUI implementation would need a proper workflow template
    throw new Error('ComfyUI support coming soon. Please use Automatic1111 WebUI for now.');
  }

  async getModels() {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (this.apiType === 'automatic1111') {
        const response = await axios.get(`${this.sdUrl}/sdapi/v1/sd-models`, {
          timeout: 10000
        });
        return response.data.map(model => ({
          title: model.title || model.model_name,
          model_name: model.model_name,
          hash: model.hash
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('[SD Service] Get models error:', error);
      return [];
    }
  }

  async setModel(modelName) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (this.apiType === 'automatic1111') {
        await axios.post(`${this.sdUrl}/sdapi/v1/options`, {
          sd_model_checkpoint: modelName
        }, { timeout: 10000 });
        return { success: true };
      } else {
        throw new Error('Model switching not supported for this API type');
      }
    } catch (error) {
      console.error('[SD Service] Set model error:', error);
      throw error;
    }
  }

  isReadyCheck() {
    return this.isReady;
  }
}

module.exports = new StableDiffusionService();

