# Browser Scraping Setup Guide

## Overview

NovaAgent uses remote managed browser services for reliable web scraping that bypasses bot detection. This guide explains how to set up and configure browser scraping.

## Why Remote Browser Scraping?

Traditional HTTP-based scraping often fails because:
- Websites block scrapers with 403 errors
- JavaScript-rendered content isn't accessible
- Lazy-loaded images don't appear in static HTML
- Bot detection systems block automated requests

Remote browser services solve these issues by providing real Chrome browsers accessed via WebSocket connection.

## Supported Browser Services

### 1. Browserless (Recommended for Beginners)

**Pros:**
- Easy setup with free tier
- Good documentation
- WebSocket connection is straightforward

**Setup:**
1. Sign up at https://www.browserless.io/
2. Get your API token from the dashboard
3. Set `BROWSER_WS_ENDPOINT`:
   ```
   wss://chrome.browserless.io?token=YOUR_TOKEN_HERE
   ```

**Free Tier:** 6 hours/month

### 2. Browserbase

**Pros:**
- High performance
- Advanced anti-detection features
- Good for production workloads

**Setup:**
1. Sign up at https://www.browserbase.com/
2. Create a project and get API key
3. Set `BROWSER_WS_ENDPOINT`:
   ```
   wss://connect.browserbase.com?apiKey=YOUR_API_KEY&projectId=YOUR_PROJECT_ID
   ```

**Free Tier:** Limited usage

### 3. Bright Data Scraping Browser

**Pros:**
- Enterprise-grade infrastructure
- Excellent anti-bot detection
- Proxy network included

**Setup:**
1. Sign up at https://brightdata.com/
2. Set up Scraping Browser
3. Set `BROWSER_WS_ENDPOINT`:
   ```
   wss://brd.superproxy.io:9222?token=YOUR_TOKEN
   ```

**Free Tier:** Trial available

## Configuration Steps

### Local Development

1. Add to your `.env` file:
```bash
BROWSER_WS_ENDPOINT="wss://chrome.browserless.io?token=YOUR_TOKEN"
```

2. Restart your development server:
```bash
npm run dev
```

### Production (Vercel)

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add new variable:
   - **Name:** `BROWSER_WS_ENDPOINT`
   - **Value:** Your WebSocket URL
   - **Environments:** Production, Preview, Development

5. Redeploy your application

## How to Use Browser Mode

1. Go to a distributor's detail page
2. Check the **"Browser Mode"** checkbox
3. Click **"Rescrape"** button
4. Wait for scraping to complete (slower than regular mode)

## Troubleshooting

### "BROWSER_WS_ENDPOINT not configured" Error

**Problem:** Environment variable is not set

**Solution:** Follow the configuration steps above and ensure the variable is set in both local `.env` and Vercel dashboard

### Connection Timeout

**Problem:** Can't connect to browser service

**Solution:**
- Verify your token/API key is correct
- Check if your browser service account is active
- Ensure you haven't exceeded usage limits

### Images Still Not Loading

**Problem:** Even with browser mode, images aren't captured

**Solution:**
- Check browser service logs for errors
- Verify the website allows automated access
- Try increasing timeout in the scraper configuration
- Some sites may require additional headers or authentication

## Cost Considerations

| Service | Free Tier | Paid Plans Start At |
|---------|-----------|-------------------|
| Browserless | 6 hours/month | $29/month |
| Browserbase | Limited | $49/month |
| Bright Data | Trial | Contact sales |

**Recommendation:** Start with Browserless free tier for testing, upgrade as needed.

## Performance Impact

- **Regular Scraping:** ~500ms per page
- **Browser Mode:** ~5-10 seconds per page

Use browser mode only when:
- Regular scraping returns 403 errors
- Images are not loading
- JavaScript-rendered content is needed
- Bot detection is blocking access

## Technical Details

Our implementation uses:
- Puppeteer-core for WebSocket connection
- Live DOM extraction for lazy-loaded images
- Intelligent scrolling to trigger image loading
- 1920x1080 viewport for maximum content visibility

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review browser service dashboard for errors
3. Verify environment variables are set correctly

---

**Last Updated:** 2025-10-17
