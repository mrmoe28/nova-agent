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
 */
export const SCRAPER_CONFIG = {
  /** Default rate limit between requests (milliseconds) */
  DEFAULT_RATE_LIMIT: parseInt(process.env.SCRAPER_RATE_LIMIT || "1000"),

  /** Default HTTP request timeout (milliseconds) */
  DEFAULT_TIMEOUT: parseInt(process.env.SCRAPER_TIMEOUT || "30000"),

  /** Maximum retry attempts for failed requests */
  MAX_RETRIES: parseInt(process.env.SCRAPER_MAX_RETRIES || "3"),

  /** Base delay for exponential backoff (milliseconds) */
  BASE_DELAY: parseInt(process.env.SCRAPER_BASE_DELAY || "1000"),

  /** Maximum delay for exponential backoff (milliseconds) */
  MAX_DELAY: parseInt(process.env.SCRAPER_MAX_DELAY || "10000"),

  /** Exponential backoff multiplier */
  BACKOFF_FACTOR: parseFloat(process.env.SCRAPER_BACKOFF_FACTOR || "2"),

  /** User-Agent identifier */
  USER_AGENT_ID:
    process.env.SCRAPER_USER_AGENT ||
    "NovaAgent/1.0 (+https://novaagent-kappa.vercel.app)",
} as const;

/**
 * Browser scraper configuration
 * Used in: src/lib/browser-scraper.ts, src/lib/browser-scraper-bql.ts
 */
export const BROWSER_CONFIG = {
  /** Browser viewport width */
  VIEWPORT_WIDTH: parseInt(process.env.BROWSER_WIDTH || "1920"),

  /** Browser viewport height */
  VIEWPORT_HEIGHT: parseInt(process.env.BROWSER_HEIGHT || "1080"),

  /** Page navigation timeout (milliseconds) */
  NAVIGATION_TIMEOUT: parseInt(process.env.BROWSER_NAV_TIMEOUT || "30000"),

  /** Initial wait before scrolling (milliseconds) */
  INITIAL_WAIT: parseInt(process.env.BROWSER_INITIAL_WAIT || "2000"),

  /** Wait after scrolling for lazy load (milliseconds) */
  POST_SCROLL_WAIT: parseInt(process.env.BROWSER_POST_SCROLL_WAIT || "1000"),

  /** Maximum scroll attempts for pagination */
  MAX_SCROLL_ATTEMPTS: parseInt(process.env.BROWSER_MAX_SCROLLS || "10"),

  /** Scroll interval delay (milliseconds) */
  SCROLL_INTERVAL: parseInt(process.env.BROWSER_SCROLL_INTERVAL || "1500"),

  /** BrowserQL endpoint URL */
  BROWSERLESS_ENDPOINT:
    process.env.BROWSERLESS_ENDPOINT ||
    "https://production-sfo.browserless.io/chromium/bql",

  /** BrowserQL wait timeout (milliseconds) */
  BQL_WAIT_TIMEOUT: parseInt(process.env.BQL_WAIT_TIMEOUT || "2000"),
} as const;

// ============================================================================
// AI AGENT CONFIGURATION
// ============================================================================

/**
 * AI-powered scraper configuration
 * Used in: src/lib/ai-agent-scraper.ts
 */
export const AI_CONFIG = {
  /** Claude model ID */
  MODEL: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",

  /** Maximum tokens for AI responses */
  MAX_TOKENS: parseInt(process.env.CLAUDE_MAX_TOKENS || "2000"),

  /** Maximum diagnosis tokens */
  MAX_DIAGNOSIS_TOKENS: parseInt(
    process.env.CLAUDE_MAX_DIAGNOSIS_TOKENS || "1500",
  ),

  /** Maximum self-correction attempts */
  MAX_ATTEMPTS: parseInt(process.env.AI_MAX_ATTEMPTS || "3"),

  /** Maximum link samples for analysis */
  MAX_LINK_SAMPLES: parseInt(process.env.AI_MAX_LINK_SAMPLES || "50"),

  /** Link text truncation length */
  LINK_TEXT_MAX_LENGTH: parseInt(process.env.AI_LINK_TEXT_LENGTH || "100"),

  /** Initial analysis rate limit (milliseconds) */
  ANALYSIS_RATE_LIMIT: parseInt(process.env.AI_ANALYSIS_RATE_LIMIT || "0"),

  /** Initial analysis timeout (milliseconds) */
  ANALYSIS_TIMEOUT: parseInt(process.env.AI_ANALYSIS_TIMEOUT || "8000"),
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
 */
export const API_CONFIG = {
  /** Maximum function execution time (seconds) - Vercel limit */
  MAX_FUNCTION_DURATION: parseInt(process.env.MAX_FUNCTION_DURATION || "300"),

  /** Cron job scraping rate limit (milliseconds) */
  CRON_RATE_LIMIT: parseInt(process.env.CRON_RATE_LIMIT || "1500"),
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
