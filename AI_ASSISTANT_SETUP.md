# AI Assistant Setup Guide

## 🚀 Quick Start

The NovaAgent AI Assistant has been successfully installed! Follow these steps to configure and deploy.

### Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-...`)
4. **IMPORTANT**: This is your personal API key for the assistant

### Step 2: Configure Local Development

```bash
# Edit .env.local and add your OpenAI key
OPENAI_API_KEY="sk-your-actual-key-here"
```

### Step 3: (Optional) Install Ollama for Free Local AI

```bash
# macOS
brew install ollama

# Start Ollama
ollama serve

# In another terminal, pull a model
ollama pull llama3.1:8b

# Test it works
ollama run llama3.1:8b
```

Once Ollama is running, your AI assistant will automatically use it first (free!) and only fallback to OpenAI if needed.

### Step 4: Test Locally

```bash
# Start the dev server
npm run dev

# Open http://localhost:3000
# Click the cyan chat button in bottom-right corner
# Ask: "How do I upload a power bill?"
```

### Step 5: Deploy to Vercel

```bash
# Add your OpenAI key to Vercel
vercel env add OPENAI_API_KEY

# When prompted, paste your key: sk-...
# Select: Production, Preview, Development (all environments)

# Deploy
vercel --prod
```

### Step 6: Configure Ollama Endpoint (Optional)

If you have Ollama running on a server:

```bash
# Add Ollama endpoint to Vercel
vercel env add OLLAMA_ENDPOINT

# Enter: http://your-server-ip:11434
# Select: Production, Preview, Development
```

## ✅ Verification Checklist

- [ ] OpenAI API key added to `.env.local`
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] Chat button appears in bottom-right corner
- [ ] Chat opens when clicked
- [ ] Can send a message and get a response
- [ ] OpenAI API key added to Vercel (`vercel env add OPENAI_API_KEY`)
- [ ] Production deployment successful (`vercel --prod`)

## 📊 What Was Built

### New Files Created
```
src/
├── app/api/chat/
│   └── route.ts                  # Chat API endpoint (streaming)
├── components/
│   └── AIAssistantWidget.tsx     # Chat UI widget
└── lib/
    ├── ai-assistant-service.ts   # Hybrid Ollama/OpenAI provider
    ├── knowledge-base.ts         # App documentation & knowledge
    ├── equipment-search.ts       # Equipment catalog queries
    └── web-search.ts             # Optional web search
```

### Modified Files
```
.env.example              # Added AI assistant configuration
src/lib/config.ts         # Added AI_ASSISTANT_CONFIG
src/app/layout.tsx        # Added AIAssistantWidget
.claude.md/.../doc-features.md  # Complete documentation
```

### Dependencies Added
```
openai@latest    # OpenAI SDK (works with Ollama too)
ai@latest        # Vercel AI SDK for streaming
```

## 🎯 Features

The AI assistant can help with:

1. **App Navigation** - Explain how to use NovaAgent
2. **Equipment Search** - Find panels, batteries, inverters
3. **Calculations** - Solar sizing, battery capacity, costs
4. **NEC Compliance** - Code requirements and safety
5. **Web Search** - Latest info (when enabled)

## 💡 Example Queries

Try asking:
- "Find me a 400W solar panel under $200"
- "How do I calculate battery size for 3 days backup?"
- "What is NEC 690.12 rapid shutdown?"
- "How do I upload a power bill?"
- "Show me all available inverters"

## 🔧 Configuration Options

All options in `.env.local` / Vercel:

```bash
# REQUIRED
OPENAI_API_KEY=""                 # Your OpenAI API key

# OPTIONAL - Local AI (Ollama)
OLLAMA_ENDPOINT=""                # http://localhost:11434
OLLAMA_MODEL="llama3.1:8b"        # Model to use
AI_DEFAULT_PROVIDER="ollama"      # Try local first

# OPTIONAL - Cloud AI Settings
OPENAI_MODEL="gpt-4o-mini"        # OpenAI model to use

# OPTIONAL - Features
AI_ENABLE_WEB_SEARCH="false"      # Enable web search
AI_MAX_HISTORY="10"               # Conversation history limit
```

## 💰 Cost Estimates

### Using Ollama (Local)
- **Cost**: $0 (completely free)
- **Privacy**: All data stays on your machine
- **Requirements**: 8GB+ RAM

### Using OpenAI API
- **gpt-4o-mini**: ~$0.0001-0.0005 per message
- **gpt-4o**: ~$0.001-0.005 per message
- **Example**: 1000 messages/month ≈ $0.10-$5

**Recommendation**: Use hybrid mode (Ollama + OpenAI fallback) for best value!

## 🐛 Troubleshooting

### Chat button doesn't appear
- Clear browser cache
- Check browser console for errors
- Verify build succeeded: `npm run build`

### "No AI provider available" error
- Make sure `OPENAI_API_KEY` is set
- Restart dev server after adding env vars

### Ollama not connecting
- Check Ollama is running: `ollama list`
- Verify endpoint: `curl http://localhost:11434/api/tags`
- Check `OLLAMA_ENDPOINT` in `.env.local`

### Slow responses
- Use smaller model: `llama3.1:8b` not `llama3.1:70b`
- Use `gpt-4o-mini` instead of `gpt-4o`
- Check internet connection

## 📚 Documentation

Full documentation available in:
- `.claude.md/commands.md/doc-features.md` - Complete feature guide
- `CLAUDE.md` - Project architecture & development guide

## 🎉 Success!

Your AI assistant is ready! Users can now:
- Click the cyan chat button (bottom-right)
- Ask questions about the app
- Search for equipment
- Get help with calculations
- Learn about NEC compliance

The assistant has full knowledge of:
- ✅ NovaAgent app workflows
- ✅ Solar/battery calculations
- ✅ NEC compliance requirements
- ✅ Your equipment catalog
- ✅ Current pricing & availability

---

**Need help?** Check the full docs in `/doc-features` or ask the AI assistant itself: "How do I use you?"
