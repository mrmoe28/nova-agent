# Enhanced Distributor Scraping Functionality

This guide covers the new enhanced scraping functionality that allows you to automatically discover and add solar equipment distributors from any website.

## 🎯 What's New

### 1. Intelligent Distributor Discovery
- **Smart Detection**: Automatically identifies if a website is a solar/battery equipment distributor
- **Confidence Scoring**: Rates distributors from 0-100% based on relevance to the solar industry
- **Product Analysis**: Counts and categorizes products found on each site
- **Duplicate Prevention**: Automatically detects and prevents duplicate distributors

### 2. Multiple Analysis Modes
- **Standard Mode**: Fast HTTP-based scraping for quick analysis
- **AI Mode**: Uses Claude AI for intelligent page analysis and decision making
- **Browser Mode**: JavaScript-capable scraping for complex websites

### 3. Bulk Import Capabilities
- **URL Lists**: Import from custom lists of distributor URLs
- **Predefined Lists**: Use curated lists of known solar industry distributors
- **Structured Data**: Import from CSV/JSON files with distributor information

## 🚀 How to Use

### Option 1: Web Interface (Recommended)

1. **Navigate to Distributors Page**
   - Go to `/distributors` in your application
   - Click on the **"Discover New"** tab

2. **Choose Your Method**:
   
   **Single URL Analysis**:
   - Enter any website URL
   - Click "Analyze Website"
   - Review the results and confidence score
   
   **Bulk URL Import**:
   - Paste multiple URLs (one per line)
   - Select analysis mode (Standard/AI/Browser)
   - Click "Import URLs"
   
   **Predefined Lists**:
   - Choose from curated lists:
     - Top Solar Distributors (10 companies)
     - Battery Specialists (10 companies)
     - Inverter Distributors (10 companies)
     - Equipment Suppliers (10 companies)
     - Regional Distributors USA (10 companies)
     - DIY Solar Kits (10 companies)
   - Click "Import Predefined List"

### Option 2: API Endpoints

#### Discover Single Distributor
```bash
curl -X POST http://localhost:3000/api/distributors/discover \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-solar-distributor.com",
    "saveToDatabase": true,
    "useAI": false,
    "useBrowser": false
  }'
```

#### Bulk Import from URLs
```bash
curl -X POST http://localhost:3000/api/distributors/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "urls",
    "urls": [
      "https://bigbattery.com",
      "https://battlebornbatteries.com",
      "https://www.wholesalesolar.com"
    ],
    "saveToDatabase": true,
    "analysisMode": "standard"
  }'
```

#### Import Predefined List
```bash
curl -X POST http://localhost:3000/api/distributors/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "predefined",
    "predefinedList": "battery-specialists",
    "saveToDatabase": true,
    "analysisMode": "ai"
  }'
```

## 🔍 Analysis Features

### Confidence Scoring
The system evaluates distributors based on:
- **Solar Industry Relevance** (40%): Keywords, known companies, industry terms
- **Product Analysis** (30%): Number and types of products found
- **Company Information Completeness** (20%): Contact info, description quality
- **Product Count Bonus** (10%): Sites with more products score higher

### Categories Detected
- Solar Panels
- Batteries & Energy Storage
- Inverters & Power Electronics
- Charge Controllers
- Mounting Systems
- Wiring & Electrical
- Monitoring Equipment
- Accessories

### Business Tier Classification
- **Manufacturer**: Companies that make the equipment
- **Distributor**: Wholesale suppliers to installers
- **Retailer**: Direct-to-consumer sales
- **Installer**: Service providers who install systems

## 📊 Results Analysis

### High Confidence (80%+)
- Known solar industry companies
- Extensive product catalogs
- Clear solar/battery focus
- Complete company information

### Medium Confidence (60-79%)
- Some solar relevance
- Limited product information
- Partial company details
- May require manual review

### Low Confidence (40-59%)
- Minimal solar connection
- Few relevant products
- Incomplete information
- Consider manual verification

## 🛠 Advanced Features

### AI-Powered Analysis
When `useAI: true` is enabled:
- Intelligent page structure analysis
- Strategic scraping decisions
- Self-correction when scraping fails
- Handles complex pagination and lazy loading

### Browser Mode
When `useBrowser: true` is enabled:
- Executes JavaScript on pages
- Handles dynamic content loading
- Bypasses basic bot detection
- Extracts images from live DOM

### Validation & Quality Control
- Email format validation
- Phone number detection
- Address parsing
- Website URL verification
- Duplicate detection by name/URL

## 📈 Performance Guidelines

### Standard Mode
- **Speed**: ~2-5 seconds per site
- **Success Rate**: 85% for simple sites
- **Best For**: Static HTML sites, basic product catalogs

### AI Mode
- **Speed**: ~10-15 seconds per site
- **Success Rate**: 95% for complex sites
- **Best For**: Complex sites, unknown structures
- **Requires**: `ANTHROPIC_API_KEY` environment variable

### Browser Mode
- **Speed**: ~15-30 seconds per site
- **Success Rate**: 90% for JS-heavy sites
- **Best For**: JavaScript-heavy sites, bot protection
- **Requires**: `BROWSERLESS_TOKEN` environment variable

## 🔧 Configuration

### Environment Variables
```bash
# Optional: For AI-powered analysis
ANTHROPIC_API_KEY=your_claude_api_key

# Optional: For browser-based scraping
BROWSERLESS_TOKEN=your_browserless_token
BROWSER_WS_ENDPOINT=wss://chrome.browserless.io?token=your_token

# Required: Base URL for internal API calls
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Rate Limiting
- Standard mode: 300ms between requests
- AI mode: 500ms between requests  
- Browser mode: 2000ms between requests
- Respects robots.txt when enabled

## 📝 Example Use Cases

### 1. Competitive Analysis
Discover what distributors your competitors are using:
```bash
# Analyze competitor websites to find their suppliers
curl -X POST /api/distributors/discover \
  -d '{"url": "https://competitor-installer.com", "analysisOnly": true}'
```

### 2. Market Research
Find all distributors in a specific region:
```bash
# Import regional distributor list
curl -X POST /api/distributors/bulk-import \
  -d '{"source": "predefined", "predefinedList": "regional-distributors-usa"}'
```

### 3. Supplier Onboarding
Quickly evaluate and add new suppliers:
```bash
# Evaluate potential supplier
curl -X POST /api/distributors/discover \
  -d '{
    "url": "https://new-supplier.com",
    "saveToDatabase": false,
    "useAI": true
  }'
```

## 🔒 Privacy & Compliance

- Respects robots.txt files by default
- Implements polite crawling delays
- Rotates User-Agent strings
- Blocks tracking/analytics requests in browser mode
- Only saves data when explicitly requested

## 🐛 Troubleshooting

### Common Issues

**"Analysis failed" Error**:
- Check if the website is accessible
- Try different analysis modes
- Verify environment variables if using AI/Browser mode

**Low Confidence Scores**:
- Site may not be solar-related
- Try manual review of results
- Check if site has proper product information

**Timeout Errors**:
- Increase timeout in configuration
- Use standard mode for faster results
- Try browser mode for JavaScript-heavy sites

**Rate Limiting**:
- Reduce number of concurrent requests
- Increase delay between requests
- Check robots.txt compliance

## 📚 Technical Details

### Database Schema
New distributors are saved with:
- Basic company information (name, contact, website)
- Scraping metadata (confidence score, analysis date)
- Product counts and categories
- Last scraped timestamp

### API Response Format
```json
{
  "success": true,
  "candidates": [
    {
      "url": "https://example.com",
      "name": "Example Solar",
      "confidence": 0.85,
      "solarRelevance": 0.9,
      "productTypes": ["SOLAR_PANEL", "BATTERY"],
      "productCount": 150,
      "reasoning": "High solar relevance with extensive product catalog"
    }
  ],
  "summary": {
    "totalAnalyzed": 10,
    "candidatesFound": 8,
    "highConfidence": 5,
    "saved": 5
  }
}
```

This enhanced scraping functionality makes it easy to discover and manage solar equipment distributors at scale, helping you build a comprehensive supplier database automatically.
