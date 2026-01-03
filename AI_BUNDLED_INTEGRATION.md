# Bundled AI Integration - Transformers.js Approach

## Overview
Bundle AI directly with Omega OS using Transformers.js - no user setup required!

## Why Transformers.js?

✅ **No separate installation** - Runs directly in Electron  
✅ **Bundled models** - Include a small model (~1-2GB) with the app  
✅ **Fully private** - Everything runs locally  
✅ **Works offline** - No internet needed  
✅ **Lightweight** - Smaller than Ollama server approach  

## Implementation Strategy

### Phase 1: Basic Chat (Browser AI)
1. Install `@xenova/transformers` package
2. Bundle a small model (Qwen2.5-1.5B or Llama 3.2-1B) - ~1-2GB
3. Implement chat interface using the bundled model
4. Cache model in Electron's userData directory

### Phase 2: Advanced Features
- Word processor AI features
- Spreadsheet AI features
- System assistant

## Model Selection

### Recommended Models (Small & Fast):
1. **Qwen2.5-1.5B-Instruct** (~1GB)
   - Excellent performance for size
   - Good for chat, writing assistance
   - Fast inference

2. **Llama 3.2-1B-Instruct** (~700MB)
   - Meta's latest small model
   - Very fast
   - Good for general tasks

3. **Phi-3-mini** (~2GB)
   - Microsoft's efficient model
   - Great quality/size ratio

### Model Bundling Strategy:

**Option A: Include in installer (Recommended)**
- Bundle 1 small model (~1-2GB) directly in installer
- User gets AI immediately, no download needed
- Installer size: ~500MB (app) + 1-2GB (model) = 1.5-2.5GB total

**Option B: Download on first use**
- Smaller installer (~500MB)
- Download model on first AI use
- Cache in userData directory
- Optional: Let user choose model size

**Option C: Hybrid**
- Bundle tiny model for instant start
- Offer to download larger model for better quality

## Technical Implementation

### 1. Install Dependencies

```bash
npm install @xenova/transformers
```

### 2. Create AI Service (main.js or ai-service.js)

```javascript
const { pipeline } = require('@xenova/transformers');
const path = require('path');
const os = require('os');
const fs = require('fs');

class AIService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.modelPath = null;
  }

  async initialize() {
    if (this.model) return this.model;
    if (this.isLoading) {
      // Wait for existing load
      while (this.isLoading) await new Promise(r => setTimeout(r, 100));
      return this.model;
    }

    this.isLoading = true;
    try {
      // Set cache directory to Electron's userData
      const userDataPath = app.getPath('userData');
      const modelCachePath = path.join(userDataPath, 'ai-models');
      
      // Use bundled model or download
      const modelName = 'Qwen/Qwen2.5-1.5B-Instruct';
      
      console.log('Loading AI model...');
      this.model = await pipeline(
        'text-generation',
        modelName,
        {
          cache_dir: modelCachePath,
          quantized: true, // Use quantized model for smaller size
        }
      );
      console.log('AI model loaded!');
      return this.model;
    } catch (error) {
      console.error('Error loading AI model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async chat(message, conversationHistory = []) {
    if (!this.model) {
      await this.initialize();
    }

    // Format conversation
    let prompt = conversationHistory.map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');
    prompt += `\nUser: ${message}\nAssistant:`;

    // Generate response
    const result = await this.model(prompt, {
      max_new_tokens: 512,
      temperature: 0.7,
      do_sample: true,
    });

    return result[0].generated_text.split('Assistant:').pop().trim();
  }

  async improveText(text, style = 'neutral') {
    const prompt = `Improve this text to be more ${style}:\n\n${text}\n\nImproved text:`;
    const result = await this.model(prompt, {
      max_new_tokens: 256,
      temperature: 0.5,
    });
    return result[0].generated_text.split('Improved text:').pop().trim();
  }
}

module.exports = new AIService();
```

### 3. Add IPC Handlers (main.js)

```javascript
const aiService = require('./ai-service');

// In setupIPCHandlers()
ipcMain.handle('ai-chat', async (event, message, history = []) => {
  try {
    const response = await aiService.chat(message, history);
    return { success: true, response };
  } catch (error) {
    console.error('AI chat error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai-improve-text', async (event, text, style = 'neutral') => {
  try {
    const improved = await aiService.improveText(text, style);
    return { success: true, text: improved };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### 4. Update Preload (preload.js)

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs ...
  
  // AI APIs
  aiChat: (message, history) => ipcRenderer.invoke('ai-chat', message, history),
  aiImproveText: (text, style) => ipcRenderer.invoke('ai-improve-text', text, style),
});
```

### 5. Update Browser Chat UI (browser.html/js)

Enable the existing chat interface and connect to AI service.

## Bundle Configuration

### package.json

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0"
  },
  "build": {
    "files": [
      "**/*",
      "!ai-models/**/*", // Models downloaded/cached separately
      // ... other exclusions
    ],
    "extraResources": [
      {
        "from": "ai-models/",
        "to": "ai-models/",
        "filter": ["*.onnx", "*.json", "*.txt"]
      }
    ]
  }
}
```

## Model Bundling Options

### Option 1: Include in Installer (Larger Download, Instant Start)
- Bundle model files in installer
- User gets AI immediately
- Installer: ~2-3GB total

### Option 2: Download on First Use (Smaller Installer)
- Installer: ~500MB
- Download model (~1-2GB) on first AI use
- Cache in userData
- Show progress indicator

### Option 3: Optional Download (Best UX)
- Start with message: "AI features available - download model? (1.5GB)"
- User chooses when to download
- Small installer, full control

## Performance Considerations

- **First Load**: Model loads on first use (~5-10 seconds)
- **Subsequent Uses**: Instant (model cached in memory)
- **RAM Usage**: ~2-4GB for small models
- **Inference Speed**: ~5-20 tokens/second (CPU)
- **GPU Acceleration**: Can use GPU if available (WebGPU)

## User Experience

1. User opens Omega OS
2. Clicks AI chat button
3. First time: "Loading AI model... (this may take a moment)"
4. Model loads (~5-10 seconds)
5. Chat ready to use!
6. Future uses: Instant

## Next Steps

1. ✅ Install @xenova/transformers
2. ✅ Create ai-service.js
3. ✅ Add IPC handlers
4. ✅ Implement browser chat
5. ✅ Test with small model
6. ✅ Decide on bundling strategy
7. ⬜ Add to Word/Sheets
8. ⬜ Optimize model loading
9. ⬜ Add model selection UI

## Resources

- Transformers.js: https://huggingface.co/docs/transformers.js
- Model Hub: https://huggingface.co/models?library=transformers.js
- Qwen Models: https://huggingface.co/Qwen
- Llama Models: https://huggingface.co/meta-llama


