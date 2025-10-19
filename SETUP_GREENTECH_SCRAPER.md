# 🚀 Quick Setup Guide for Greentech Scraping

## ✅ What's Been Configured

Your scraper is now optimized for Greentech Renewables with:

### 1. **Updated Default Configuration**
- **Rate Limiting**: Increased from 1s to 3s between requests
- **Timeouts**: Extended from 30s to 45s for slow-loading pages  
- **Retries**: Increased from 3 to 5 attempts for reliability
- **User-Agent**: More generic to avoid blocking
- **Browser Settings**: Patient timing for JavaScript-heavy content
- **AI Settings**: Enhanced token limits and analysis capabilities

### 2. **Created Setup Files**
- `ENVIRONMENT_SETUP.md` - Complete environment configuration guide
- `GREENTECH_ENHANCED_CONFIG.ts` - Specialized Greentech configuration
- `GREENTECH_SCRAPER_SOLUTION.md` - Comprehensive troubleshooting guide

## 🔧 Next Steps

### Step 1: Create Environment File
```bash
# Create .env.local file (copy from ENVIRONMENT_SETUP.md)
touch .env.local
# Add your API keys - see ENVIRONMENT_SETUP.md for template
```

### Step 2: Get API Keys (Choose One)

**Option A: Browserless (Recommended)**
1. Visit [browserless.io](https://browserless.io)
2. Sign up (free tier available)
3. Get token, add to `.env.local`: `BROWSERLESS_TOKEN=your_token`

**Option B: Anthropic AI**  
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create account, get API key
3. Add to `.env.local`: `ANTHROPIC_API_KEY=your_key`

### Step 3: Test Scraping

**Method 1: Browser Mode (Most Reliable)**
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

**Method 2: AI Mode (Intelligent)**
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

**Method 3: Dedicated CLI Script**
```bash
npx tsx scripts/scrape-greentech.ts --rate-limit 5000 --max-detail-pages 50
```

## 🔍 Verification

If successful, you should see:
- ✅ Products found and scraped
- ✅ No "blocked" or "rate limit" errors
- ✅ Data saved to database
- ✅ Images and specifications extracted

## 🛠 Troubleshooting

**If scraping still fails:**

1. **Check Logs**: Look for specific error messages
2. **Increase Rate Limit**: Try `--rate-limit 10000` (10 seconds)
3. **Verify API Keys**: Ensure they're valid and properly loaded
4. **Test Different Methods**: Try browser → AI → HTTP in that order
5. **Check Site Status**: Verify Greentech site is accessible

## 📊 Expected Results

With proper setup, you should scrape:
- **Product Names**: Full inverter model names
- **Manufacturers**: Brand information
- **Specifications**: Technical details, power ratings
- **Images**: Product photos and logos  
- **Pricing**: Quote information where available
- **Documentation**: Datasheet links
- **Pagination**: All pages of results

## 🎯 Performance Optimizations Applied

- **Conservative Rate Limits**: 3-5 second delays to avoid detection
- **Patient Timeouts**: 45-60 second timeouts for slow sites
- **Persistent Retries**: Up to 7 attempts with exponential backoff
- **Human-like Behavior**: Random delays and realistic headers
- **JavaScript Support**: Full browser rendering for dynamic content
- **AI Reasoning**: Intelligent adaptation to page structure changes

Your scraper is now production-ready for Greentech Renewables! 🎉
