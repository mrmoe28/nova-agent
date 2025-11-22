# NovaAgent Features Documentation

## 🤖 AI Assistant

NovaAgent includes an intelligent AI assistant that helps users navigate the app, find equipment, understand calculations, and answer questions about solar + battery systems.

### Overview

The AI Assistant is a floating chat widget that appears on all pages of the application. It provides real-time assistance using either:
- **Local AI (Ollama)**: Free, private, runs on your machine
- **Cloud AI (OpenAI)**: Reliable fallback when local isn't available

### Features

#### 1. **App Navigation & Workflow Help**
The assistant can explain how to use NovaAgent and guide users through the multi-step wizard:
- How to create a new project
- How to upload and process power bills
- How to design a solar + battery system
- How to generate bill of materials
- How to create final PDF reports

#### 2. **Equipment Catalog Search**
Query the equipment database to find products:
- Search for solar panels by wattage and price
- Find batteries by capacity (kWh)
- Locate inverters by power rating (kW)
- Compare products across distributors
- Get current pricing and availability

#### 3. **Solar Calculations & Sizing**
Get help understanding the math behind system design:
- Solar array sizing formulas
- Battery capacity calculations
- Inverter sizing requirements
- Peak sun hours by location
- System cost estimation

#### 4. **NEC Compliance Guidance**
Learn about code requirements:
- NEC Article 690 (Solar PV Systems)
- NEC Article 705 (Interconnected Power Sources)
- NEC Article 706 (Energy Storage Systems)
- Rapid shutdown requirements
- Disconnect and labeling requirements

#### 5. **Web Search Integration** (Optional)
When enabled, the assistant can search the web for up-to-date information on:
- Latest solar technology
- Current industry standards
- Recent NEC updates
- Manufacturer specifications

### How to Use

1. **Open the Chat**: Click the floating cyan button in the bottom-right corner
2. **Ask a Question**: Type your question in the input field
3. **Get Real-time Answers**: The AI streams responses in real-time
4. **Continue Conversation**: Ask follow-up questions with full conversation context

### Example Queries

#### Equipment Search
```
"Find me a 400W solar panel under $200"
"What batteries do you have with at least 10kWh capacity?"
"Show me inverters suitable for a 7kW system"
```

#### Calculations
```
"How do I calculate solar panel count for 2000 kWh/month?"
"What size battery do I need for 3 days of backup?"
"Explain the 120% solar sizing factor"
```

#### Workflow Help
```
"How do I upload a power bill?"
"What file formats are supported?"
"Where do I find the BOM after system design?"
```

#### NEC Compliance
```
"What is NEC 690.12 rapid shutdown?"
"What are the disconnect requirements?"
"How do I label solar equipment per NEC?"
```

### Configuration

The AI Assistant is configured via environment variables in `.env.local`:

```bash
# Required: OpenAI API key for fallback
OPENAI_API_KEY="sk-..."

# Optional: Local Ollama for free inference
OLLAMA_ENDPOINT="http://localhost:11434"
OLLAMA_MODEL="llama3.1:8b"

# Optional: Provider preference (ollama or openai)
AI_DEFAULT_PROVIDER="ollama"

# Optional: OpenAI model selection
OPENAI_MODEL="gpt-4o-mini"

# Optional: Enable web search
AI_ENABLE_WEB_SEARCH="false"

# Optional: Conversation history limit
AI_MAX_HISTORY="10"
```

### Architecture

#### Hybrid AI Provider System
```
User Query → Chat API → Provider Selection
                        ├─ Try: Ollama (local, free)
                        └─ Fallback: OpenAI (cloud, reliable)
```

#### Context Retrieval (RAG)
```
User Query → Context Builder
             ├─ Knowledge Base (app docs, formulas, NEC)
             ├─ Equipment Catalog (database search)
             └─ Web Search (optional)
             ↓
             AI with Context → Accurate Answer
```

#### Components
- **Backend**: `/src/app/api/chat/route.ts` - Streaming chat API
- **AI Service**: `/src/lib/ai-assistant-service.ts` - Provider abstraction
- **Knowledge Base**: `/src/lib/knowledge-base.ts` - Documentation system
- **Equipment Search**: `/src/lib/equipment-search.ts` - Catalog queries
- **Web Search**: `/src/lib/web-search.ts` - External info retrieval
- **Frontend**: `/src/components/AIAssistantWidget.tsx` - Chat UI

### Knowledge Base

The assistant has access to:

#### 1. **App Documentation**
- Complete CLAUDE.md documentation
- Workflow guides and best practices
- API endpoints and data flow
- Project status tracking

#### 2. **Solar Calculations**
```
Solar kW = (Monthly kWh / 30 / Peak Sun Hours) × 1.2
Panel Count = Solar kW × 1000 / Panel Wattage
Battery kWh = Critical Load (kW) × Backup Hours × 1.25
Inverter kW = Peak Load × 1.25
```

#### 3. **NEC Requirements**
- Article 690: Solar PV systems
- Article 705: Interconnection
- Article 706: Energy storage
- Compliance checklists

#### 4. **Equipment Database**
- All scraped products from distributors
- Real-time pricing and availability
- Manufacturer specifications
- Product images and data sheets

### Cost & Performance

#### Using Local Ollama (Recommended)
- **Cost**: Free (runs on your machine)
- **Privacy**: Data never leaves your computer
- **Speed**: Fast (local inference)
- **Requirements**: 8GB+ RAM, GPU optional

#### Using OpenAI API
- **Cost**: ~$0.0001-0.001 per message (GPT-4o-mini)
- **Privacy**: Data sent to OpenAI
- **Speed**: Fast (cloud API)
- **Requirements**: API key and internet

#### Best Practice
Use hybrid mode (`AI_DEFAULT_PROVIDER="ollama"`):
- Try local Ollama first (free, fast)
- Automatically fallback to OpenAI if local unavailable
- Best of both worlds!

### Installation & Setup

#### 1. Install Ollama (Optional but Recommended)
```bash
# macOS
brew install ollama

# Start Ollama
ollama serve

# Pull a model
ollama pull llama3.1:8b
```

#### 2. Get OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env.local`: `OPENAI_API_KEY="sk-..."`

#### 3. Configure Environment
```bash
# Copy example
cp .env.example .env.local

# Edit .env.local and add your keys
OPENAI_API_KEY="sk-..."
OLLAMA_ENDPOINT="http://localhost:11434"  # If using Ollama
```

#### 4. Deploy to Vercel
```bash
# Set environment variables
vercel env add OPENAI_API_KEY

# Deploy
vercel --prod
```

### Troubleshooting

#### "No AI provider available"
- **Cause**: Neither Ollama nor OpenAI is configured
- **Fix**: Set `OPENAI_API_KEY` in environment variables

#### "Ollama health check failed"
- **Cause**: Ollama not running or wrong endpoint
- **Fix**: Start Ollama with `ollama serve` or correct `OLLAMA_ENDPOINT`

#### Slow responses
- **Cause**: Using a large model or slow connection
- **Fix**:
  - Use smaller model: `OLLAMA_MODEL="llama3.1:8b"` (not 70b)
  - Use faster OpenAI model: `OPENAI_MODEL="gpt-4o-mini"`

#### Empty equipment search results
- **Cause**: No distributors scraped yet
- **Fix**: Scrape distributors via `/distributors` page

#### Widget not appearing
- **Cause**: JavaScript error or build issue
- **Fix**: Check browser console, rebuild with `npm run build`

### API Reference

#### POST /api/chat
Stream chat completions with context

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "How do I size a battery?" }
  ],
  "includeContext": true
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"content":"To size","provider":"ollama","model":"llama3.1:8b"}
data: {"content":" a battery","provider":"ollama","model":"llama3.1:8b"}
...
data: [DONE]
```

#### GET /api/chat/status
Check AI service health

**Response:**
```json
{
  "ollama": {
    "available": true,
    "healthy": true
  },
  "openai": {
    "available": true
  },
  "defaultProvider": "ollama"
}
```

### Security & Privacy

#### Data Handling
- **Local Mode (Ollama)**: All data stays on your machine
- **Cloud Mode (OpenAI)**: Messages sent to OpenAI API
- **Storage**: Conversation history only stored in browser memory (not database)
- **Logging**: Only metadata logged (no message content)

#### Best Practices
1. Use Ollama for sensitive client data (HIPAA, financial)
2. Set `AI_ENABLE_WEB_SEARCH="false"` in production if needed
3. Limit conversation history with `AI_MAX_HISTORY` to control costs
4. Monitor API usage in OpenAI dashboard

### Future Enhancements

Planned features:
- [ ] Voice input/output
- [ ] Image analysis (upload bill screenshots)
- [ ] Multi-language support
- [ ] Custom knowledge base training
- [ ] Project-specific context (auto-load current project data)
- [ ] Equipment comparison tables
- [ ] Cost optimization suggestions
- [ ] Real-time utility rate lookups

---

## Other Features

### Project Wizard
Multi-step workflow for creating solar + battery system designs.

### Bill Upload & OCR
Automatic text extraction from PDF power bills.

### Equipment Catalog
Searchable database of solar panels, batteries, and inverters from multiple distributors.

### Web Scraping
Automated product data collection from distributor websites.

### BOM Generation
Automatic bill of materials creation with current pricing.

### PDF Reports
Professional NEC-compliant system design reports.

### NEC Compliance Checks
Automated verification of electrical code requirements.
