const { app } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    this.isReady = false;
    this.isLoading = false;
    // Use 127.0.0.1 instead of localhost to force IPv4 (Ollama listens on IPv4 only)
    this.ollamaUrl = 'http://127.0.0.1:11434';
    
    // Custom AI configurations per app (loaded from storage)
    this.appConfigs = {};
    this.configPath = path.join(app.getPath('userData'), 'ai-configs.json');
    this.loadAppConfigs();
    
    // Recommended models for general content generation (Word, PowerPoint)
    this.recommendedContentModels = [
      'deepseek-r1:14b',      // Best for reasoning and content generation
      'deepseek-r1:7b',       // Smaller, faster version
      'deepseek-v2:236b',     // Latest, most capable (very large)
      'deepseek-v2:1.5b',     // Smaller, faster version
      'deepseek-chat',        // General chat model
      'llama3.1:8b',          // Good alternative
      'qwen2.5:7b',           // Good quality, faster
      'qwen2.5:1.5b'          // Fallback/default (fast, smaller)
    ];
    
    // Recommended models for code/formula generation (Excel)
    this.recommendedCodeModels = [
      'deepseek-coder:6.7b',  // Best for code/formula generation
      'deepseek-coder:1.3b',  // Smaller, faster version
      'codellama:7b',
      'qwen2.5-coder:7b',
      'llama3.1:8b',
      'mistral:7b',
      'qwen2.5:1.5b'          // Fallback/default
    ];
    
    // Try to use DeepSeek by default, fallback to qwen2.5 if not available
    this.modelName = 'deepseek-r1:7b'; // Default: DeepSeek R1 7B for better content generation
    this.preferredModels = this.recommendedContentModels; // Default preference
    
    // Custom AI configurations per app (loaded from storage)
    this.appConfigs = {};
    this.configPath = path.join(app.getPath('userData'), 'ai-configs.json');
    this.loadAppConfigs();
  }

  async checkOllama() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 10000, // 10 second timeout
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept any non-server-error status
        }
      });
      return { available: true, models: response.data.models || [] };
    } catch (error) {
      // Connection failed - Ollama is not available
      console.log(`[AI Service] Ollama check failed: ${error.message}`);
      return { available: false, error: error.message };
    }
  }

  async ensureModel() {
    // Check if model is available - retry multiple times with increasing delays
    let check = await this.checkOllama();
    let retries = 0;
    const maxRetries = 5;
    
    while (!check.available && retries < maxRetries) {
      console.log(`[AI Service] Ollama not responding, retry ${retries + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1))); // Exponential backoff
      check = await this.checkOllama();
      retries++;
    }
    
    if (!check.available) {
      throw new Error('Ollama is not running. Please restart Omega OS.');
    }

    // Check if model exists, if not try to find best available model
    const models = check.models || [];
    const modelNames = models.map(m => m.name);
    const hasModel = modelNames.includes(this.modelName);
    
    if (!hasModel) {
      // Try to find best available model from preference list
      const bestAvailable = await this.selectBestAvailableModel(this.preferredModels);
      if (bestAvailable && modelNames.includes(bestAvailable)) {
        console.log(`[AI Service] Using best available model: ${bestAvailable}`);
        this.isReady = true;
        return true;
      }
      
      // Check if bundled model exists and copy it
      const bundledModelCopied = await this.checkAndCopyBundledModel();
      if (bundledModelCopied) {
        // Re-check models after copying
        const recheck = await this.checkOllama();
        const recheckModels = recheck.models || [];
        const recheckNames = recheckModels.map(m => m.name);
        const nowHasModel = recheckNames.includes(this.modelName);
        if (nowHasModel) {
          console.log('[AI Service] Bundled model is now available');
          this.isReady = true;
          return true;
        }
      }
      
      // If bundled model not found, try to pull the model automatically
      try {
        console.log('[AI Service] Bundled model not found, pulling model:', this.modelName);
        
        // Start pull in background (fire and forget)
        axios.post(`${this.ollamaUrl}/api/pull`, {
          name: this.modelName,
          stream: false
        }, { timeout: 600000 }).catch(err => {
          console.log('[AI Service] Pull request completed (or failed):', err.message);
        });
        
        // Poll for model availability instead of waiting for pull request
        const startTime = Date.now();
        const maxWaitTime = 600000; // 10 minutes max
        const pollInterval = 5000; // Check every 5 seconds
        
        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          try {
            const statusCheck = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
            const availableModels = statusCheck.data.models || [];
            if (availableModels.some(m => m.name === this.modelName)) {
              console.log('[AI Service] Model downloaded and available');
              return true;
            }
          } catch (e) {
            // Continue polling even if check fails
            console.log('[AI Service] Polling for model...');
          }
        }
        
        // Timeout - check one more time
        const finalCheck = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
        const finalModels = finalCheck.data.models || [];
        if (!finalModels.some(m => m.name === this.modelName)) {
          throw new Error('Model download is taking longer than expected. Please wait a few minutes and try your message again.');
        }
        
        console.log('[AI Service] Model pulled successfully');
      } catch (error) {
        console.error('[AI Service] Failed to pull model:', error);
        throw new Error(`Failed to download AI model: ${error.message}`);
      }
    }

    this.isReady = true;
    return true;
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isReady;
    }

    this.isLoading = true;
    try {
      await this.ensureModel();
      return true;
    } catch (error) {
      console.error('[AI Service] Initialization error:', error);
      this.isLoading = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async chat(message, conversationHistory = []) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Check if this is a request for longer content (pages, essay, paper, story, paragraphs)
      const lowerMessage = message.toLowerCase();
      const isLongRequest = lowerMessage.includes('page') || 
                           lowerMessage.includes('pages') ||
                           lowerMessage.includes('essay') ||
                           lowerMessage.includes('paper') ||
                           lowerMessage.includes('paragraph') ||
                           lowerMessage.includes('paragraphs') ||
                           (lowerMessage.includes('story') && (lowerMessage.includes('long') || lowerMessage.match(/\d+\s*(page|pages)/)));
      
      // Extract page count if mentioned
      let pageCount = 0;
      const pageMatch = lowerMessage.match(/(\d+)\s*page/);
      if (pageMatch) {
        pageCount = parseInt(pageMatch[1]);
      }
      
      // Extract paragraph count if mentioned
      let paragraphCount = 0;
      const paragraphMatch = lowerMessage.match(/(\d+)\s*paragraph/);
      if (paragraphMatch) {
        paragraphCount = parseInt(paragraphMatch[1]);
      }
      
      // Format conversation context
      let prompt = message;
      if (isLongRequest) {
        // Enhance prompt for longer content requests with very explicit instructions
        if (paragraphCount > 0) {
          // Request for specific number of paragraphs
          prompt = `${message}\n\nInstructions: Write exactly ${paragraphCount} separate, distinct paragraphs. Each paragraph should be on its own line with a blank line between them. Each paragraph should cover a different aspect or topic. Write substantial content for each paragraph (at least 4-5 sentences per paragraph). DO NOT write any introductory phrases like "Here's", "Certainly", or "Title:". Begin directly with the first paragraph.`;
        } else if (pageCount > 0) {
          const wordCount = pageCount * 600; // ~600 words per page
          prompt = `${message}\n\nInstructions: Write a complete ${pageCount}-page paper (approximately ${wordCount} words). Format as follows:\n1. Start with a clear title (bold or as heading)\n2. Include multiple sections with descriptive headers for each major topic\n3. Write detailed paragraphs under each section header\n4. Use proper structure with introduction, body sections, and conclusion\nDO NOT write any introductory phrases like "Here's", "Certainly", or "Title:". Begin directly with the formatted content.`;
        } else {
          prompt = `${message}\n\nInstructions: Write a detailed, comprehensive response. Format with a title and section headers for major topics. Include substantial content with multiple paragraphs under each section. Start directly with the formatted content. DO NOT write any introductory phrases like "Here's", "Certainly", or "Here is".

FORMATTING CAPABILITIES: The AI can apply formatting to your text. You can request:
- Bold text: say "bold" or "make bold"
- Italic text: say "italic" or "make italic"  
- Underline: say "underline" or "underline the [text]"
- Font size: say "font size 12" or "make it size 14"
- Font family: say "use Arial" or "change font to Times New Roman"
- Text color: say "make it red" or "color it blue"
- Alignment: say "center it" or "align left"
Formatting instructions in the user's message will be automatically applied.`;
        }
      }
      
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        const context = recentHistory.map(msg => {
          return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
        }).join('\n');
        prompt = context + '\nUser: ' + prompt + '\nAssistant:';
      }

      // Optimize parameters for code models (deepseek-coder, codellama, etc.)
      const isCodeModel = this.modelName.includes('deepseek-coder') || 
                         this.modelName.includes('codellama') || 
                         this.modelName.includes('coder');
      
      // Check if this is a drawing/paint request (contains JSON array instructions for drawing commands)
      // Look for multiple indicators to reliably detect drawing prompts - check BEFORE setting temperature
      const lowerPrompt = message.toLowerCase();
      const isDrawingRequest = (
        (lowerPrompt.includes('json array') || 
         lowerPrompt.includes('respond with only the json') ||
         lowerPrompt.includes('respond with only') && lowerPrompt.includes('json')) &&
        (lowerPrompt.includes('drawing commands') || 
         lowerPrompt.includes('canvas size') ||
         lowerPrompt.includes('digital artist') ||
         lowerPrompt.includes('drawing assistant') ||
         lowerPrompt.includes('type": "circle') ||
         lowerPrompt.includes('type":"circle') ||
         lowerPrompt.includes('artistic guidelines'))
      );
      
      // Code models work better with lower temperature (more deterministic) and higher token limits
      // Also use lower temperature for drawing requests to ensure consistent JSON output
      const temperature = isCodeModel ? 0.2 : (isDrawingRequest ? 0.3 : 0.7); // Lower temp for drawing = more deterministic JSON
      const top_p = isCodeModel ? 0.95 : 0.9;
      
      // Check if this is a game generation request (usually in the prompt)
      const isGameRequest = message.toLowerCase().includes('game') || 
                           message.toLowerCase().includes('playable') ||
                           message.toLowerCase().includes('space invaders') ||
                           message.toLowerCase().includes('shoot');
      
      // Check if this is a code modification request (includes existing code)
      const isCodeModification = message.includes('```') && 
                                 (message.includes('existing code') || 
                                  message.includes('modifying existing') ||
                                  message.includes('PRESERVE all existing'));
      
      // For code generation, allow much longer outputs (code can be very long)
      let num_predict = -1; // Default: no limit
      if (isLongRequest) {
        num_predict = paragraphCount > 0 ? paragraphCount * 300 : (pageCount > 0 ? pageCount * 1500 : 4000); // Increased for longer content
      } else if (isDrawingRequest) {
        // Drawing requests need enough tokens for JSON arrays with multiple drawing commands
        // A complex drawing can have 15-20 objects, each ~100-200 tokens = 2000-4000 tokens
        // Use a generous limit to ensure JSON completes
        num_predict = 8000; // 8k tokens for complex drawings to ensure completion
        console.log('[AI Service] ✓ Detected drawing request, setting num_predict to 8000 tokens');
      } else if (isCodeModel) {
        if (isCodeModification) {
          // Code modifications need even more tokens - we're sending existing code + generating modified version
          // Estimate: existing code could be 2000-4000 tokens, plus generating new code
          num_predict = 32000; // 32k tokens for large code modifications
        } else if (isGameRequest) {
          // Games need even more tokens - they're complex
          num_predict = 16000; // 16k tokens for complete games
        } else {
          // Code models: allow up to 8000 tokens for complex code generation
          num_predict = 8000;
        }
      }

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
          top_p: top_p,
          num_predict: num_predict,
        }
      }, { timeout: 180000 }); // 3 minute timeout for very long generations

      return response.data.response.trim();
    } catch (error) {
      console.error('[AI Service] Chat error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama and try again.');
      }
      throw error;
    }
  }

  async summarizePage(content, maxLength = 200) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      const truncatedContent = content.length > 3000 
        ? content.substring(0, 3000) + '...'
        : content;

      const prompt = `You are summarizing webpage content that has been extracted and provided to you. The user has given you the text content from a webpage below. Please provide a concise summary in ${maxLength} words or less.

Webpage content:
${truncatedContent}

Summary:`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: Math.ceil(maxLength / 0.75),
        }
      }, { timeout: 60000 });

      let summary = response.data.response.trim();
      summary = summary.split('\n')[0].trim();
      return summary;
    } catch (error) {
      console.error('[AI Service] Summarize error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama and try again.');
      }
      throw error;
    }
  }

  async improveText(text, style = 'neutral', task = 'improve') {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Check for custom configuration
      const customConfig = this.getAppConfig('word');
      let prompt = '';
      
      if (customConfig && customConfig.prompt) {
        // Use custom prompt template
        prompt = customConfig.prompt
          .replace('{text}', text)
          .replace('{style}', style)
          .replace('{task}', task);
      } else {
        // Use default prompts
        switch (task) {
          case 'improve':
            prompt = `Improve the following text to be more ${style} and professional while keeping the original meaning:\n\n${text}\n\nImproved text:`;
            break;
          case 'rewrite':
            prompt = `Rewrite the following text in a ${style} style:\n\n${text}\n\nRewritten text:`;
            break;
          case 'expand':
            prompt = `Expand the following text with more detail while maintaining clarity:\n\n${text}\n\nExpanded text:`;
            break;
          case 'summarize':
            prompt = `Summarize the following text concisely:\n\n${text}\n\nSummary:`;
            break;
          default:
            prompt = `Improve the following text:\n\n${text}\n\nImproved text:`;
        }
      }
      
      // Apply custom instructions if available
      if (customConfig && customConfig.instructions) {
        prompt = `${customConfig.instructions}\n\n${prompt}`;
      }

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.5,
          num_predict: Math.min(512, text.length * 2),
        }
      }, { timeout: 60000 });

      let improved = response.data.response.trim();
      improved = improved.split('\n\n')[0].trim();
      return improved;
    } catch (error) {
      console.error('[AI Service] Improve text error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama and try again.');
      }
      throw error;
    }
  }

  async suggestFormula(description, dataContext = null) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Check for custom configuration
      const customConfig = this.getAppConfig('sheets');
      let prompt = '';
      
      if (customConfig && customConfig.prompt) {
        // Use custom prompt template
        prompt = customConfig.prompt
          .replace('{description}', description)
          .replace('{dataContext}', dataContext || '');
      } else {
        // Use default prompt
        prompt = `Given the user's request: "${description}"\n\n`;
        if (dataContext) {
          prompt += `Context: ${dataContext}\n\n`;
        }
        prompt += `Suggest an Excel/Sheets formula that accomplishes this. Only respond with the formula, no explanation.\n\nFormula:`;
      }
      
      // Apply custom instructions if available
      if (customConfig && customConfig.instructions) {
        prompt = `${customConfig.instructions}\n\n${prompt}`;
      }

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 100,
        }
      }, { timeout: 60000 });

      let formula = response.data.response.trim();
      formula = formula.split('\n')[0].trim();
      if (!formula.startsWith('=')) {
        formula = '=' + formula;
      }
      return formula;
    } catch (error) {
      console.error('[AI Service] Suggest formula error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama and try again.');
      }
      throw error;
    }
  }

  async analyzeData(dataDescription, dataSample = null) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      let prompt = `Analyze the following data and provide insights:\n\n`;
      prompt += `Data description: ${dataDescription}\n`;
      if (dataSample) {
        prompt += `Sample data: ${dataSample.substring(0, 500)}\n`;
      }
      prompt += `\nAnalysis and insights:`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.5,
          num_predict: 300,
        }
      }, { timeout: 60000 });

      return response.data.response.trim();
    } catch (error) {
      console.error('[AI Service] Analyze data error:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama and try again.');
      }
      throw error;
    }
  }

  // Check if Ollama is ready
  isReadyCheck() {
    return this.isReady;
  }

  // Get loading status
  isLoadingModel() {
    return this.isLoading;
  }

  // Get available models
  async getAvailableModels() {
    try {
      const check = await this.checkOllama();
      if (check.available) {
        return check.models || [];
      }
      return [];
    } catch (error) {
      console.error('[AI Service] Get models error:', error);
      return [];
    }
  }

  // Set model name
  setModel(modelName) {
    this.modelName = modelName;
    // Reset ready state when model changes
    this.isReady = false;
  }

  // Get current model
  getCurrentModel() {
    return this.modelName;
  }

  // Get recommended models for code generation
  getRecommendedCodeModels() {
    return this.recommendedCodeModels;
  }

  // Get recommended models for content generation (Word, PowerPoint)
  getRecommendedContentModels() {
    return this.recommendedContentModels;
  }

  // Automatically select the best available model from a preference list
  async selectBestAvailableModel(preferenceList = null) {
    if (!preferenceList) {
      preferenceList = this.recommendedContentModels;
    }

    try {
      const availableModels = await this.getAvailableModels();
      const modelNames = availableModels.map(m => m.name);

      // Find the first preferred model that's available
      for (const preferred of preferenceList) {
        if (modelNames.includes(preferred)) {
          console.log(`[AI Service] Selected best available model: ${preferred}`);
          this.modelName = preferred;
          this.isReady = false; // Reset to ensure model is loaded
          return preferred;
        }
      }

      // If no preferred model found, use first available or fallback
      if (modelNames.length > 0) {
        const fallback = modelNames[0];
        console.log(`[AI Service] No preferred model found, using: ${fallback}`);
        this.modelName = fallback;
        this.isReady = false;
        return fallback;
      }

      // No models available - will trigger download of default
      console.log('[AI Service] No models available, will use default');
      return null;
    } catch (error) {
      console.error('[AI Service] Error selecting model:', error);
      return null;
    }
  }

  // Switch to best model for specific app type
  async switchModelForApp(appType) {
    let preferenceList;
    switch (appType.toLowerCase()) {
      case 'word':
      case 'powerpoint':
      case 'content':
        preferenceList = this.recommendedContentModels;
        this.preferredModels = this.recommendedContentModels;
        break;
      case 'excel':
      case 'spreadsheet':
      case 'code':
        preferenceList = this.recommendedCodeModels;
        this.preferredModels = this.recommendedCodeModels;
        break;
      default:
        preferenceList = this.recommendedContentModels;
        this.preferredModels = this.recommendedContentModels;
    }

    return await this.selectBestAvailableModel(preferenceList);
  }

  // Check for bundled model and copy it to Ollama directory
  async checkAndCopyBundledModel() {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      
      // Paths
      const resourcesPath = process.resourcesPath || app.getAppPath();
      const bundledModelPath = path.join(resourcesPath, 'models', 'deepseek-coder-6.7b');
      const userDataPath = app.getPath('userData');
      const ollamaModelsPath = path.join(userDataPath, 'ollama', 'models', 'manifests', 'registry.ollama.ai', 'library', 'deepseek-coder');
      
      // Check if bundled model exists
      if (!fs.existsSync(bundledModelPath)) {
        console.log('[AI Service] Bundled model not found at:', bundledModelPath);
        return false;
      }
      
      // Check if model already copied
      if (fs.existsSync(ollamaModelsPath)) {
        console.log('[AI Service] Model already exists in Ollama directory');
        return true;
      }
      
      console.log('[AI Service] Copying bundled model to Ollama directory...');
      
      // Create directories if needed
      const modelDir = path.dirname(ollamaModelsPath);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }
      
      // Copy model files
      // Note: Ollama models have a specific structure, so we may need to adapt this
      // For now, we'll use Ollama's import mechanism if available
      // Otherwise, we'll trigger a pull which should use cached files if available
      
      return false; // Return false to trigger normal pull (which may use bundled files)
    } catch (error) {
      console.error('[AI Service] Error checking bundled model:', error);
      return false;
    }
  }

  // Load app-specific configurations
  loadAppConfigs() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.appConfigs = JSON.parse(data);
        console.log('[AI Service] Loaded app configurations:', Object.keys(this.appConfigs));
      }
    } catch (error) {
      console.error('[AI Service] Error loading app configs:', error);
      this.appConfigs = {};
    }
  }

  // Save app-specific configurations
  saveAppConfigs() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.appConfigs, null, 2));
      console.log('[AI Service] Saved app configurations');
    } catch (error) {
      console.error('[AI Service] Error saving app configs:', error);
    }
  }

  // Update configuration for a specific app
  updateAppConfig(appName, config) {
    this.appConfigs[appName] = {
      ...this.appConfigs[appName],
      ...config,
      lastUpdated: Date.now()
    };
    this.saveAppConfigs();
    console.log(`[AI Service] Updated config for ${appName}`);
  }

  // Get configuration for a specific app
  getAppConfig(appName) {
    return this.appConfigs[appName] || null;
  }
}

module.exports = new AIService();
