# AI Integration Plan for Omega OS

## Overview
Integrate AI capabilities across Omega OS while maintaining privacy-first principles.

## Implementation Strategy

### Phase 1: Browser AI Chat (Foundation)
**Status:** Placeholder exists, ready for implementation

**Options:**
1. **Ollama Integration (Recommended for Privacy)**
   - Run local models (Llama 3.1 8B, Mistral, etc.)
   - No data leaves device
   - Works offline
   - Implementation: Node.js backend service in Electron main process

2. **API Integration (For Power Users)**
   - OpenAI, Anthropic, Google Gemini
   - User provides API key (stored locally, encrypted)
   - Optional: User chooses provider
   - Implementation: Direct API calls from renderer

3. **Hybrid Mode**
   - Default: Local (Ollama)
   - Optional: Switch to API for complex queries
   - User control in settings

### Phase 2: Word Processor AI
**Features to Add:**
- ✨ Writing suggestions and completions
- 📝 Grammar and spelling correction (AI-powered)
- 🎯 Tone adjustment (formal, casual, professional)
- 📄 Document summarization
- 🔄 Text rewriting/paraphrasing
- 💡 Content ideas and outlines

**UI Integration:**
- Add "AI" button in toolbar
- Sidebar panel for AI features
- Context menu: "Improve with AI", "Summarize", etc.

### Phase 3: Spreadsheet AI
**Features to Add:**
- 📊 Formula suggestions based on data
- 📈 Data analysis and insights
- 📝 Text generation (emails, descriptions from data)
- 🎯 Smart data cleaning suggestions
- 💬 Natural language queries ("Show me sales > $1000")

**UI Integration:**
- AI button in toolbar
- Formula bar AI suggestions
- "Ask AI" sidebar

### Phase 4: System-Wide AI Assistant
**Features:**
- 🎯 Desktop search enhancement (natural language)
- 📁 Smart file organization suggestions
- ⚡ System optimization recommendations
- 🎨 Theme/background suggestions
- 📝 Quick notes and reminders

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│         Electron Main Process           │
│  ┌───────────────────────────────────┐  │
│  │   AI Service Manager              │  │
│  │   - Ollama client (if enabled)    │  │
│  │   - API key management            │  │
│  │   - Request routing               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │ IPC Communication
┌─────────────────────────────────────────┐
│      Renderer Processes (Apps)          │
│  ┌──────────┬──────────┬─────────────┐  │
│  │ Browser  │  Word    │   Sheets    │  │
│  │ AI Chat  │ AI Panel │  AI Helper  │  │
│  └──────────┴──────────┴─────────────┘  │
└─────────────────────────────────────────┘
```

### Dependencies Needed

**For Ollama (Local AI):**
```json
{
  "ollama": "^0.5.0" // or axios/fetch to Ollama HTTP API
}
```

**For API Integration:**
```json
{
  "openai": "^4.0.0",
  "anthropic": "^0.9.0"
  // Optional, users install what they need
}
```

### IPC Handlers (main.js)

```javascript
// AI Service IPC Handlers
ipcMain.handle('ai-chat', async (event, message, context = null) => {
  // Route to Ollama or API based on user settings
  return await aiService.chat(message, context);
});

ipcMain.handle('ai-improve-text', async (event, text, style = 'neutral') => {
  // Text improvement for Word
  return await aiService.improveText(text, style);
});

ipcMain.handle('ai-suggest-formula', async (event, data, description) => {
  // Formula suggestions for Sheets
  return await aiService.suggestFormula(data, description);
});

ipcMain.handle('ai-analyze-data', async (event, data) => {
  // Data analysis for Sheets
  return await aiService.analyzeData(data);
});
```

### Preload API (preload.js)

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs ...
  
  // AI APIs
  aiChat: (message, context) => ipcRenderer.invoke('ai-chat', message, context),
  aiImproveText: (text, style) => ipcRenderer.invoke('ai-improve-text', text, style),
  aiSuggestFormula: (data, description) => ipcRenderer.invoke('ai-suggest-formula', data, description),
  aiAnalyzeData: (data) => ipcRenderer.invoke('ai-analyze-data', data),
  
  // AI Settings
  aiGetSettings: () => ipcRenderer.invoke('ai-get-settings'),
  aiSetProvider: (provider, apiKey = null) => ipcRenderer.invoke('ai-set-provider', provider, apiKey),
  aiCheckOllama: () => ipcRenderer.invoke('ai-check-ollama'),
});
```

## Privacy Considerations

1. **Default to Local**: Use Ollama by default (no data leaves device)
2. **Optional API**: User must explicitly opt-in to API usage
3. **API Key Storage**: Encrypt API keys in Electron's safeStorage
4. **No Telemetry**: Never send usage data without explicit consent
5. **Clear Indicators**: Show user which mode is active (Local/API)

## User Settings

Create AI Settings panel:
- Provider selection (Ollama/OpenAI/Anthropic/Custom)
- API key management (encrypted storage)
- Model selection (for Ollama)
- Enable/disable features per app
- Privacy warnings and explanations

## Getting Started

**Quick Start - Browser AI Chat:**

1. **Option A: Ollama (Recommended)**
   - User installs Ollama separately (ollama.ai)
   - App connects to local Ollama instance (localhost:11434)
   - No API keys needed
   - Fully private

2. **Option B: API Integration**
   - User provides OpenAI/Anthropic API key
   - Stored encrypted in Electron safeStorage
   - Direct API calls from app

3. **Option C: Hybrid**
   - Try Ollama first, fallback to API
   - User chooses default in settings

## Next Steps

1. ✅ Browser AI chat implementation
2. ⬜ Word processor AI features
3. ⬜ Spreadsheet AI features  
4. ⬜ System-wide AI assistant
5. ⬜ AI Settings UI
6. ⬜ Documentation and user guides

## Resources

- Ollama: https://ollama.ai
- Transformers.js: https://huggingface.co/docs/transformers.js
- OpenAI API: https://platform.openai.com
- Anthropic API: https://docs.anthropic.com


