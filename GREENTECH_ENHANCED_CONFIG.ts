/**
 * Enhanced Configuration for Greentech Renewables Scraping
 * 
 * This file contains specialized settings optimized for scraping
 * www.greentechrenewables.com while avoiding bot detection.
 * 
 * Import and use these settings with your existing scrapers.
 */

import type { ScraperConfig } from "./src/lib/scraper";

/**
 * Greentech-optimized scraper configuration
 * Use with: scrapeGreentechInverters(GREENTECH_CONFIG)
 */
export const GREENTECH_CONFIG: Partial<ScraperConfig> = {
  // Conservative rate limiting to avoid triggering anti-bot measures
  rateLimit: 5000, // 5 seconds between requests
  
  // Generous timeouts for slow-loading pages with lots of JavaScript
  timeout: 60000, // 60 second timeout
  
  // Aggressive retry strategy for flaky connections
  maxRetries: 7,
  
  // Always respect robots.txt for ethical scraping
  respectRobotsTxt: true,
  
  // Enable random delays to mimic human behavior
  randomDelay: true,
  
  // Use realistic browser headers
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

/**
 * Browser-specific configuration for Greentech
 * Use with: useBrowser: true and these settings
 */
export const GREENTECH_BROWSER_CONFIG = {
  // Standard desktop viewport to avoid mobile redirects
  viewport: {
    width: 1920,
    height: 1080
  },
  
  // Patient timing for JavaScript-heavy pages
  navigationTimeout: 60000,
  initialWait: 4000,
  postScrollWait: 3000,
  
  // Thorough scrolling for lazy-loaded content
  maxScrollAttempts: 20,
  scrollInterval: 3000,
  
  // BrowserQL specific settings
  bqlWaitTimeout: 5000
};

/**
 * AI Agent configuration for Greentech
 * Use with: useAI: true
 */
export const GREENTECH_AI_CONFIG = {
  // Use latest Claude model for best reasoning
  model: "claude-3-5-sonnet-20241022",
  
  // Generous token limits for complex analysis
  maxTokens: 8000,
  maxDiagnosisTokens: 4000,
  
  // Persistent retry attempts for difficult sites
  maxAttempts: 7,
  
  // Comprehensive link analysis
  maxLinkSamples: 150,
  linkTextMaxLength: 200,
  
  // Conservative API rate limiting
  analysisRateLimit: 3000,
  analysisTimeout: 30000
};

/**
 * Enhanced User-Agent rotation pool specifically for e-commerce sites
 * More diverse than the default pool to avoid detection patterns
 */
export const GREENTECH_USER_AGENTS = [
  // Recent Chrome on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  
  // Recent Firefox on macOS  
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0",
  
  // Recent Safari on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  
  // Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  
  // Edge on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
];

/**
 * Complete Greentech scraping configuration
 * Combines all optimizations for maximum success rate
 */
export const GREENTECH_COMPLETE_CONFIG = {
  // Basic scraper settings
  ...GREENTECH_CONFIG,
  
  // Browser enhancement
  browser: GREENTECH_BROWSER_CONFIG,
  
  // AI enhancement  
  ai: GREENTECH_AI_CONFIG,
  
  // User agent pool
  userAgents: GREENTECH_USER_AGENTS,
  
  // Site-specific optimizations
  siteOptimizations: {
    // Greentech-specific selectors and patterns
    productSelectors: [
      'article.commerce-product',
      'article[class*="product"]', 
      '.product-card',
      '.product-item'
    ],
    
    paginationSelectors: [
      'li.pager__item--next a',
      '.pager__item--next a',
      'a[rel="next"]',
      '.pagination .next'
    ],
    
    // Common anti-bot indicators to watch for
    botDetectionIndicators: [
      'captcha',
      'blocked',
      'rate limit',
      'access denied',
      'cloudflare',
      'security check'
    ]
  }
};

/**
 * Usage examples:
 * 
 * 1. With existing Greentech scraper:
 *    const results = await scrapeGreentechInverters(GREENTECH_CONFIG);
 * 
 * 2. With API endpoint (browser mode):
 *    POST /api/distributors/scrape-from-url
 *    { "url": "...", "useBrowser": true, "config": GREENTECH_BROWSER_CONFIG }
 * 
 * 3. With API endpoint (AI mode):
 *    POST /api/distributors/scrape-from-url  
 *    { "url": "...", "useAI": true, "config": GREENTECH_AI_CONFIG }
 * 
 * 4. CLI usage:
 *    npx tsx scripts/scrape-greentech.ts --rate-limit 5000 --max-detail-pages 100
 */
