# Equipment Web Search Setup

This document explains how to set up the web search functionality for finding equipment and comparing prices.

## Features

- Search the web for solar equipment
- Compare prices from multiple distributors
- Results sorted by price (lowest first)
- Add equipment directly to database from search results
- Automatic distributor creation if not exists

## Required Environment Variables

### Option 1: SerpAPI (Recommended)
SerpAPI provides reliable Google Shopping search results with price information.

```bash
SERP_API_KEY=your_serpapi_key_here
```

Get your API key at: https://serpapi.com/

### Option 2: Google Custom Search API
Alternative to SerpAPI using Google's Custom Search Engine.

```bash
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CSE_ID=your_custom_search_engine_id_here
```

Setup instructions:
1. Create a Custom Search Engine at https://programmablesearchengine.google.com/
2. Get API key from https://console.cloud.google.com/apis/credentials

### Option 3: Fallback Mode
If no API keys are configured, the system will use a fallback method that searches known solar equipment retailers. This is less accurate but still functional.

## How It Works

1. **Search**: User enters equipment search query (e.g., "EG4 5kW inverter")
2. **Web Search**: System searches using configured API (SerpAPI, Google, or fallback)
3. **Price Extraction**: Scrapes product pages to extract:
   - Price
   - Product name
   - Manufacturer
   - Model number
   - Stock status
   - Specifications
   - Product image
4. **Sorting**: Results are automatically sorted by price (lowest first)
5. **Add to Database**: User can click "Add to Database" on any result to save it

## Usage

1. Navigate to the Distributors page
2. Use the search box in the top right
3. Enter your search query (e.g., "solar panels 400W", "EG4 battery", etc.)
4. Review results sorted by price
5. Click "Add to Database" on items you want to save
6. Equipment will be added with distributor information

## API Endpoints

### POST /api/equipment/search-web
Searches the web for equipment and returns price comparison results.

**Request:**
```json
{
  "query": "EG4 5kW inverter",
  "category": "INVERTER" // optional
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "source": "Product Name",
      "url": "https://...",
      "price": 1299.99,
      "currency": "USD",
      "inStock": true,
      "distributorName": "example.com",
      "manufacturer": "EG4",
      "modelNumber": "EG4-5000",
      "imageUrl": "https://...",
      "specifications": "..."
    }
  ],
  "count": 10
}
```

### POST /api/equipment/add-from-search
Adds equipment from search results to the database.

**Request:**
```json
{
  "distributorName": "Example Distributor",
  "distributorUrl": "https://example.com",
  "itemName": "EG4 5kW Inverter",
  "manufacturer": "EG4",
  "modelNumber": "EG4-5000",
  "category": "INVERTER",
  "unitPrice": 1299.99,
  "specifications": "...",
  "imageUrl": "https://...",
  "sourceUrl": "https://...",
  "inStock": true
}
```

## Best Practices

1. **Use specific search terms**: Include brand, model, and specifications for better results
2. **Verify prices**: Always verify prices before adding to database
3. **Check stock status**: Ensure items are in stock before adding
4. **Review specifications**: Make sure product details match before saving

## Troubleshooting

### No results returned
- Check that API keys are correctly set in environment variables
- Verify API quota/limits haven't been exceeded
- Try more specific search terms

### Prices seem incorrect
- Prices are extracted from product pages, may need manual verification
- Some sites may require JavaScript rendering (not fully supported in fallback mode)

### Adding to database fails
- Ensure distributor information is provided
- Check that category is valid (SOLAR_PANEL, BATTERY, INVERTER, MOUNTING, ELECTRICAL)
- Verify price is a valid number

