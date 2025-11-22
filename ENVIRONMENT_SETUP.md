# Environment Setup for Greentech Scraping

## 🔧 Required Environment File

Create a file named `.env.local` in your project root with the following content:

```bash
# =============================================================================
# SCRAPER API KEYS (Required for Advanced Scraping)
# =============================================================================

# Browserless.io API Token (for Browser Mode scraping)
# Get token from: https://browserless.io (free tier available)
BROWSERLESS_TOKEN=your_browserless_token_here

# Anthropic API Key (for AI Agent scraping)  
# Get key from: https://console.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# =============================================================================
# GREENTECH-OPTIMIZED SCRAPER SETTINGS
# =============================================================================

# Rate limiting (milliseconds between requests)
SCRAPER_RATE_LIMIT=5000
CRON_RATE_LIMIT=3000

# Request timeouts (milliseconds) 
SCRAPER_TIMEOUT=45000
BROWSER_NAV_TIMEOUT=45000

# Retry configuration
SCRAPER_MAX_RETRIES=5
SCRAPER_BASE_DELAY=2000
SCRAPER_MAX_DELAY=15000
SCRAPER_BACKOFF_FACTOR=2.5

# Browser configuration for Greentech
BROWSER_WIDTH=1920
BROWSER_HEIGHT=1080
BROWSER_INITIAL_WAIT=3000
BROWSER_POST_SCROLL_WAIT=2000
BROWSER_MAX_SCROLLS=15
BROWSER_SCROLL_INTERVAL=2000

# BrowserQL configuration
BQL_WAIT_TIMEOUT=3000
BROWSERLESS_ENDPOINT=https://chrome.browserless.io

# AI Agent configuration
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4000
AI_MAX_ATTEMPTS=5
AI_ANALYSIS_RATE_LIMIT=2000
AI_ANALYSIS_TIMEOUT=15000

# Database
DATABASE_URL="file:./dev.db"

# Logging
LOG_LEVEL=debug
NODE_ENV=development

# File upload limits
MAX_FILE_SIZE=20971520
ALLOWED_FILE_TYPES=pdf,png,jpg,jpeg,csv

# Security
CRON_SECRET=your_cron_secret_here
```

## 🚀 Quick Setup Commands

```bash
# Create the environment file
cp ENVIRONMENT_SETUP.md .env.local
# Then edit .env.local to add your actual API keys

# Test the setup
npm run dev
```

## 🔑 Getting API Keys

### 1. Browserless Token (Recommended)
1. Go to [browserless.io](https://browserless.io)
2. Sign up (free tier available)  
3. Get your API token from the dashboard
4. Replace `your_browserless_token_here` in `.env.local`

### 2. Anthropic API Key (Alternative)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account and verify
3. Generate API key in settings
4. Replace `your_anthropic_api_key_here` in `.env.local`

## ✅ Testing the Setup

Once configured, test with:

```bash
# Test browser scraping
curl -X POST http://localhost:3000/api/distributors/scrape-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.greentechrenewables.com/products/solar-inverters",
    "useBrowser": true,
    "scrapeProducts": true
  }'

# Test AI scraping  
curl -X POST http://localhost:3000/api/distributors/scrape-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.greentechrenewables.com/products/solar-inverters",
    "useAI": true,
    "scrapeProducts": true
  }'

# Test dedicated Greentech scraper
npx tsx scripts/scrape-greentech.ts --rate-limit 5000
```
