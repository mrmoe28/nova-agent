/**
 * Centralized Configuration System
 *
 * All configurable values should be defined here with environment variable overrides.
 * This allows for easy deployment-specific configuration without code changes.
 */

// ============================================================================
// SYSTEM SIZING CONFIGURATION
// ============================================================================

/**
 * Solar and battery system sizing parameters
 * Used in: /api/size
 */
export const SYSTEM_SIZING = {
  /** Solar array oversizing factor (default: 1.2 = 120%) */
  SOLAR_SIZING_FACTOR: parseFloat(process.env.SOLAR_SIZING_FACTOR || "1.2"),

  /** Average peak sun hours per day (varies by geography) */
  PEAK_SUN_HOURS: parseFloat(process.env.PEAK_SUN_HOURS || "4"),

  /** Standard solar panel wattage in watts */
  SOLAR_PANEL_WATTAGE: parseInt(process.env.SOLAR_PANEL_WATTAGE || "400"),

  /** Battery capacity safety factor for depth of discharge and efficiency (default: 1.25 = 25% overhead for 80% DOD) */
  BATTERY_OVERHEAD: parseFloat(process.env.BATTERY_OVERHEAD || "1.25"),

  /** Inverter oversizing multiplier (default: 1.25 = 25% oversizing) */
  INVERTER_MULTIPLIER: parseFloat(process.env.INVERTER_MULTIPLIER || "1.25"),

  /** Solar installation cost per watt (USD) */
  SOLAR_COST_PER_WATT: parseFloat(process.env.SOLAR_COST_PER_WATT || "2.20"),

  /** Battery cost per kWh (USD) - Updated to realistic market pricing */
  BATTERY_COST_PER_KWH: parseFloat(process.env.BATTERY_COST_PER_KWH || "350"),

  /** Inverter cost per kW (USD) */
  INVERTER_COST_PER_KW: parseFloat(process.env.INVERTER_COST_PER_KW || "800"),

  /** Base installation labor cost (USD) */
  INSTALLATION_BASE_COST: parseFloat(
    process.env.INSTALLATION_BASE_COST || "8000",
  ),
} as const;

// ============================================================================
// WEB SCRAPING CONFIGURATION
// ============================================================================

/**
 * HTTP scraper configuration
 * Used in: src/lib/scraper.ts
 * Optimized for Greentech Renewables and similar sites with anti-bot protection
 */
export const SCRAPER_CONFIG = {
  /** Default rate limit between requests (milliseconds) - Conservative for bot detection avoidance */
  DEFAULT_RATE_LIMIT: parseInt(process.env.SCRAPER_RATE_LIMIT || "3000"),

  /** Default HTTP request timeout (milliseconds) - Generous for slow-loading sites */
  DEFAULT_TIMEOUT: parseInt(process.env.SCRAPER_TIMEOUT || "45000"),

  /** Maximum retry attempts for failed requests - Aggressive for reliability */
  MAX_RETRIES: parseInt(process.env.SCRAPER_MAX_RETRIES || "5"),

  /** Base delay for exponential backoff (milliseconds) - Conservative start */
  BASE_DELAY: parseInt(process.env.SCRAPER_BASE_DELAY || "2000"),

  /** Maximum delay for exponential backoff (milliseconds) - Patient max wait */
  MAX_DELAY: parseInt(process.env.SCRAPER_MAX_DELAY || "15000"),

  /** Exponential backoff multiplier - Moderate progression */
  BACKOFF_FACTOR: parseFloat(process.env.SCRAPER_BACKOFF_FACTOR || "2.5"),

  /** User-Agent identifier - More generic to avoid blocking */
  USER_AGENT_ID:
    process.env.SCRAPER_USER_AGENT ||
    "Mozilla/5.0 (compatible; NovaAgent/1.0; +https://novaagent-kappa.vercel.app)",
} as const;

/**
 * Browser scraper configuration
 * Used in: src/lib/browser-scraper.ts, src/lib/browser-scraper-bql.ts
 * Optimized for Greentech Renewables with patient timing for dynamic content
 */
export const BROWSER_CONFIG = {
  /** Browser viewport width - Standard desktop resolution */
  VIEWPORT_WIDTH: parseInt(process.env.BROWSER_WIDTH || "1920"),

  /** Browser viewport height - Standard desktop resolution */
  VIEWPORT_HEIGHT: parseInt(process.env.BROWSER_HEIGHT || "1080"),

  /** Page navigation timeout (milliseconds) - Patient for slow sites */
  NAVIGATION_TIMEOUT: parseInt(process.env.BROWSER_NAV_TIMEOUT || "45000"),

  /** Initial wait before scrolling (milliseconds) - Allow JS to load */
  INITIAL_WAIT: parseInt(process.env.BROWSER_INITIAL_WAIT || "3000"),

  /** Wait after scrolling for lazy load (milliseconds) - Patient for dynamic loading */
  POST_SCROLL_WAIT: parseInt(process.env.BROWSER_POST_SCROLL_WAIT || "2000"),

  /** Maximum scroll attempts for pagination - Thorough coverage */
  MAX_SCROLL_ATTEMPTS: parseInt(process.env.BROWSER_MAX_SCROLLS || "15"),

  /** Scroll interval delay (milliseconds) - Human-like scrolling pace */
  SCROLL_INTERVAL: parseInt(process.env.BROWSER_SCROLL_INTERVAL || "2500"),

  /** BrowserQL endpoint URL - Browserless.io cloud service */
  BROWSERLESS_ENDPOINT:
    process.env.BROWSERLESS_ENDPOINT ||
    "https://chrome.browserless.io",

  /** BrowserQL wait timeout (milliseconds) - Patient for element loading */
  BQL_WAIT_TIMEOUT: parseInt(process.env.BQL_WAIT_TIMEOUT || "3000"),
} as const;

// ============================================================================
// AI AGENT CONFIGURATION
// ============================================================================

/**
 * AI-powered scraper configuration
 * Used in: src/lib/ai-agent-scraper.ts
 * Optimized for Greentech Renewables with enhanced analysis capabilities
 */
export const AI_CONFIG = {
  /** Claude model ID - Latest Sonnet for best reasoning */
  MODEL: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",

  /** Maximum tokens for AI responses - Generous for detailed analysis */
  MAX_TOKENS: parseInt(process.env.CLAUDE_MAX_TOKENS || "4000"),

  /** Maximum diagnosis tokens - Sufficient for complex error analysis */
  MAX_DIAGNOSIS_TOKENS: parseInt(
    process.env.CLAUDE_MAX_DIAGNOSIS_TOKENS || "2500",
  ),

  /** Maximum self-correction attempts - Persistent for difficult sites */
  MAX_ATTEMPTS: parseInt(process.env.AI_MAX_ATTEMPTS || "5"),

  /** Maximum link samples for analysis - Thorough coverage */
  MAX_LINK_SAMPLES: parseInt(process.env.AI_MAX_LINK_SAMPLES || "100"),

  /** Link text truncation length - More context for decisions */
  LINK_TEXT_MAX_LENGTH: parseInt(process.env.AI_LINK_TEXT_LENGTH || "150"),

  /** Initial analysis rate limit (milliseconds) - Conservative for API limits */
  ANALYSIS_RATE_LIMIT: parseInt(process.env.AI_ANALYSIS_RATE_LIMIT || "2000"),

  /** Initial analysis timeout (milliseconds) - Patient for complex sites */
  ANALYSIS_TIMEOUT: parseInt(process.env.AI_ANALYSIS_TIMEOUT || "15000"),
} as const;

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

/**
 * File upload constraints
 * Used in: src/app/api/upload/route.ts
 */
export const UPLOAD_CONFIG = {
  /** Maximum file size in bytes (default: 10 MB) */
  MAX_FILE_SIZE: parseInt(
    process.env.MAX_FILE_SIZE || (10 * 1024 * 1024).toString(),
  ),

  /** Allowed file types */
  ALLOWED_FILE_TYPES: (
    process.env.ALLOWED_FILE_TYPES || "pdf,png,jpg,jpeg,csv"
  ).split(","),
} as const;

// ============================================================================
// OCR CONFIGURATION
// ============================================================================

/**
 * OCR and data validation thresholds
 * Used in: src/lib/ocr.ts
 */
export const OCR_CONFIG = {
  /** PDF extraction confidence threshold (0-1) */
  PDF_CONFIDENCE: parseFloat(process.env.OCR_PDF_CONFIDENCE || "0.95"),

  /** Maximum monthly kWh usage (sanity check) */
  MAX_KWH_USAGE: parseInt(process.env.OCR_MAX_KWH || "100000"),

  /** Maximum peak kW demand (sanity check) */
  MAX_KW_DEMAND: parseInt(process.env.OCR_MAX_KW || "10000"),

  /** Maximum bill cost in USD (sanity check) */
  MAX_BILL_COST: parseInt(process.env.OCR_MAX_COST || "100000"),
} as const;

// ============================================================================
// CACHING CONFIGURATION
// ============================================================================

/**
 * Cache timeouts and limits
 * Used in: src/lib/robots-checker.ts and other caching systems
 */
export const CACHE_CONFIG = {
  /** robots.txt cache timeout (milliseconds, default: 24 hours) */
  ROBOTS_TXT_TIMEOUT: parseInt(
    process.env.CACHE_ROBOTS_TIMEOUT || (24 * 60 * 60 * 1000).toString(),
  ),
} as const;

// ============================================================================
// API ROUTE CONFIGURATION
// ============================================================================

/**
 * API route runtime limits
 * Used in: API routes with maxDuration export
 * Optimized for Greentech with conservative rate limits
 */
export const API_CONFIG = {
  /** Maximum function execution time (seconds) - Vercel limit */
  MAX_FUNCTION_DURATION: parseInt(process.env.MAX_FUNCTION_DURATION || "300"),

  /** Cron job scraping rate limit (milliseconds) - Conservative for bulk operations */
  CRON_RATE_LIMIT: parseInt(process.env.CRON_RATE_LIMIT || "3000"),
} as const;

// ============================================================================
// EXPORT ALL CONFIGS
// ============================================================================

/**
 * Complete configuration object for easy imports
 */
export const CONFIG = {
  SYSTEM_SIZING,
  SCRAPER_CONFIG,
  BROWSER_CONFIG,
  AI_CONFIG,
  UPLOAD_CONFIG,
  OCR_CONFIG,
  CACHE_CONFIG,
  API_CONFIG,
} as const;

// Type exports for TypeScript
export type SystemSizingConfig = typeof SYSTEM_SIZING;
export type ScraperConfig = typeof SCRAPER_CONFIG;
export type BrowserConfig = typeof BROWSER_CONFIG;
export type AIConfig = typeof AI_CONFIG;
export type UploadConfig = typeof UPLOAD_CONFIG;
export type OCRConfig = typeof OCR_CONFIG;
export type CacheConfig = typeof CACHE_CONFIG;
export type APIConfig = typeof API_CONFIG;
export type AppConfig = typeof CONFIG;
