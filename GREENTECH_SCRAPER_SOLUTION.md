# Green Tech Renewables Scraper Solution

## 🔍 Problem Analysis

The scraper cannot access `www.greentechrenewables.com/products/solar-inverters` due to:

1. **Anti-bot Protection**: Advanced detection mechanisms
2. **JavaScript Rendering**: Dynamic content loading 
3. **Rate Limiting**: Aggressive request throttling
4. **Basic HTTP Limitations**: Current default scraper uses simple fetch requests

## ✅ Existing Solutions in Codebase

Your project already has the necessary tools implemented:

### 1. Browser Scraper (`useBrowser: true`)
- **Location**: `src/lib/browser-scraper-bql.ts`
- **Technology**: Real Chrome browser via Browserless API
- **Capabilities**: JavaScript execution, lazy loading, bot evasion
- **Required**: `BROWSERLESS_TOKEN` environment variable

### 2. AI Agent Scraper (`useAI: true`) 
- **Location**: `src/lib/ai-agent-scraper.ts`
- **Technology**: Claude AI with intelligent decision making
- **Capabilities**: Self-correction, adaptive scraping, structure analysis
- **Required**: `ANTHROPIC_API_KEY` environment variable

### 3. Dedicated Greentech Scraper
- **Location**: `src/lib/greentech-scraper.ts` + `scripts/scrape-greentech.ts`
- **Technology**: Site-specific implementation
- **Capabilities**: Pagination handling, product cards, detail pages
- **Status**: Ready to use, just needs proper environment setup

## 🛠 Implementation Solutions

### Option A: Quick Fix - Use Browser Mode
```bash
curl -X POST http://localhost:3000/api/distributors/scrape-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.greentechrenewables.com/products/solar-inverters",
    "useBrowser": true,
    "scrapeProducts": true,
    "saveToDatabase": true
  }'
```

### Option B: Intelligent Scraping - Use AI Agent
```bash
curl -X POST http://localhost:3000/api/distributors/scrape-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.greentechrenewables.com/products/solar-inverters", 
    "useAI": true,
    "scrapeProducts": true,
    "saveToDatabase": true
  }'
```

### Option C: Dedicated Scraper - Use Greentech-Specific Tool
```bash
npx tsx scripts/scrape-greentech.ts --rate-limit 5000 --max-detail-pages 50
```

## 🔧 Required Environment Variables

Create `.env.local` file with:

```bash
# For Browser Scraping (Browserless.io)
BROWSERLESS_TOKEN=your_browserless_token_here

# For AI Agent Scraping (Anthropic Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Additional scraper configuration
SCRAPER_RATE_LIMIT=5000
SCRAPER_TIMEOUT=30000
BROWSER_NAV_TIMEOUT=30000
```

## 🚀 Getting API Keys

### Browserless Token
1. Visit [browserless.io](https://browserless.io)
2. Sign up for account (free tier available)
3. Get API token from dashboard
4. Add to `.env.local` as `BROWSERLESS_TOKEN`

### Anthropic API Key  
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create account and get API key
3. Add to `.env.local` as `ANTHROPIC_API_KEY`

## 📊 Expected Results

With proper setup, you should be able to scrape:
- ✅ Product names and descriptions
- ✅ Manufacturer information  
- ✅ Technical specifications
- ✅ Pricing information
- ✅ Images and datasheets
- ✅ All paginated results

## 🔍 Troubleshooting

If scraping still fails:

1. **Check Logs**: Monitor console output for specific error messages
2. **Test Rate Limits**: Increase `--rate-limit` parameter to 10000ms
3. **Verify Environment**: Ensure API keys are valid and loaded
4. **Try Different Mode**: Switch between browser, AI, or HTTP modes
5. **Check robots.txt**: Verify site permissions at `/robots.txt`

## 🔄 Fallback Strategy

If all automated methods fail, consider:
1. **Manual Data Export**: Use browser developer tools
2. **API Endpoints**: Check if site offers product API
3. **Hybrid Approach**: Combine manual and automated methods
4. **Contact Site**: Request data access from Greentech directly
