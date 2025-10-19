import { createLogger } from "./logger";
import type { ScrapedProduct } from "./scraper";

const logger = createLogger("cache");

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

/**
 * Simple in-memory cache with TTL (Time To Live)
 * Automatically expires entries after the specified duration
 */
export class ResponseCache<T = string> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  /**
   * Store data in cache with TTL
   * @param key Cache key (usually URL)
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 1 hour)
   */
  set(key: string, data: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    logger.debug({ key, ttl, cacheSize: this.cache.size }, "Cached response");
  }

  /**
   * Retrieve data from cache
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      logger.debug({ key, age }, "Cache expired");
      return null;
    }

    this.hits++;
    logger.debug({ key, age, hitRate: this.getHitRate() }, "Cache hit");
    return entry.data;
  }

  /**
   * Check if key exists in cache (without returning data)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug({ key }, "Cache entry deleted");
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info({ clearedEntries: size }, "Cache cleared");
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Calculate cache hit rate
   */
  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const before = this.cache.size;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    const removed = before - this.cache.size;
    if (removed > 0) {
      logger.info({ removed, remaining: this.cache.size }, "Cleaned up expired cache entries");
    }
  }
}

/**
 * Singleton cache instances for different data types
 */

// HTML response cache (1 hour TTL by default)
export const htmlCache = new ResponseCache<string>();

// Product data cache (6 hours TTL by default)
export const productCache = new ResponseCache<ScrapedProduct>();

// robots.txt cache is already handled separately in robots-checker.ts
// This is for general HTML and product data

/**
 * Periodic cache cleanup (runs every 10 minutes)
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    htmlCache.cleanup();
    productCache.cleanup();
  }, 600000); // 10 minutes
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    html: htmlCache.getStats(),
    product: productCache.getStats(),
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  htmlCache.clear();
  productCache.clear();
  logger.info("All caches cleared");
}
