/**
 * URL Validation Utility for Web Scraping
 * Prevents SSRF (Server-Side Request Forgery) attacks
 *
 * This utility blocks:
 * - Localhost and loopback addresses
 * - Private IP ranges (RFC 1918)
 * - Cloud metadata endpoints
 * - Link-local addresses
 * - Non-HTTP(S) protocols
 */

import { createLogger } from "./logger";

const logger = createLogger("url-validator");

/**
 * Private IP ranges to block (RFC 1918 + cloud metadata)
 */
const BLOCKED_IP_RANGES = [
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] }, // 10.0.0.0/8
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] }, // 172.16.0.0/12
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] }, // 192.168.0.0/16
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] }, // 169.254.0.0/16 (cloud metadata)
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] }, // 127.0.0.0/8 (loopback)
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  // Cloud metadata endpoints
  "metadata.google.internal",
  "169.254.169.254",
];

/**
 * Check if an IPv4 address is in a blocked range
 */
function isIpInRange(
  ip: number[],
  range: { start: number[]; end: number[] },
): boolean {
  for (let i = 0; i < 4; i++) {
    if (ip[i] < range.start[i] || ip[i] > range.end[i]) {
      return false;
    }
    if (ip[i] > range.start[i] && ip[i] < range.end[i]) {
      return true;
    }
  }
  return true;
}

/**
 * Parse IPv4 address from hostname
 */
function parseIPv4(hostname: string): number[] | null {
  const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const octets = match.slice(1, 5).map(Number);

  // Validate octets are in range 0-255
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

/**
 * Validate URL for scraping safety
 *
 * @param url - URL to validate
 * @throws Error if URL is invalid or blocked
 */
export function validateScrapingUrl(url: string): void {
  let urlObj: URL;

  try {
    urlObj = new URL(url);
  } catch (error) {
    logger.warn({ url, error }, "Invalid URL format");
    throw new Error("Invalid URL format");
  }

  const hostname = urlObj.hostname.toLowerCase();
  const protocol = urlObj.protocol;

  // 1. Check protocol (only allow HTTP and HTTPS)
  if (protocol !== "http:" && protocol !== "https:") {
    logger.warn({ url, protocol }, "Blocked non-HTTP(S) protocol");
    throw new Error(
      `Invalid protocol: ${protocol}. Only HTTP and HTTPS are allowed.`,
    );
  }

  // 2. Check for blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    logger.warn({ url, hostname }, "Blocked hostname detected");
    throw new Error(`Cannot scrape blocked hostname: ${hostname}`);
  }

  // 3. Check for private IPv4 addresses
  const ipv4 = parseIPv4(hostname);
  if (ipv4) {
    for (const range of BLOCKED_IP_RANGES) {
      if (isIpInRange(ipv4, range)) {
        logger.warn({ url, hostname, ipv4 }, "Blocked private IP detected");
        throw new Error(
          `Cannot scrape private IP address: ${hostname}. This prevents SSRF attacks.`,
        );
      }
    }
  }

  // 4. Check for IPv6 localhost (basic check)
  if (hostname.includes("::1") || hostname.includes("::ffff:127.0.0.1")) {
    logger.warn({ url, hostname }, "Blocked IPv6 localhost");
    throw new Error(`Cannot scrape localhost: ${hostname}`);
  }

  // 5. Block URLs with credentials (could leak sensitive data in logs)
  if (urlObj.username || urlObj.password) {
    logger.warn({ url }, "URL contains credentials");
    throw new Error(
      "URLs with embedded credentials are not allowed for security reasons",
    );
  }

  logger.debug({ url, hostname, protocol }, "URL validation passed");
}

/**
 * Validate and normalize URL for scraping
 * Returns normalized URL (removes fragments, normalizes trailing slashes)
 *
 * @param url - URL to validate and normalize
 * @returns Normalized URL
 * @throws Error if URL is invalid or blocked
 */
export function validateAndNormalizeUrl(url: string): string {
  validateScrapingUrl(url);

  const urlObj = new URL(url);

  // Remove fragment
  urlObj.hash = "";

  // Normalize pathname (remove trailing slash unless it's the root)
  if (urlObj.pathname !== "/" && urlObj.pathname.endsWith("/")) {
    urlObj.pathname = urlObj.pathname.slice(0, -1);
  }

  return urlObj.href;
}

/**
 * Validate a constructed URL (after joining base + relative)
 * Used to prevent protocol manipulation attacks
 *
 * @param url - Constructed URL to validate
 * @param baseUrl - Base URL used for construction
 * @throws Error if constructed URL is unsafe
 */
export function validateConstructedUrl(url: string, baseUrl: string): void {
  validateScrapingUrl(url);

  const urlObj = new URL(url);
  const baseObj = new URL(baseUrl);

  // Ensure constructed URL stays on same domain (prevent open redirects)
  if (urlObj.hostname !== baseObj.hostname) {
    logger.debug(
      { url, baseUrl, constructedHost: urlObj.hostname, baseHost: baseObj.hostname },
      "Constructed URL changed domain",
    );
    // This is actually OK for cross-domain links, so just log it
    // Don't throw, as legitimate product links might be on different domains
  }

  // Ensure protocol didn't change to something dangerous
  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    logger.warn(
      { url, protocol: urlObj.protocol, baseUrl },
      "Constructed URL has invalid protocol",
    );
    throw new Error(
      `Invalid protocol in constructed URL: ${urlObj.protocol}`,
    );
  }
}

/**
 * Batch validate multiple URLs
 * Returns only valid URLs, logging warnings for invalid ones
 *
 * @param urls - URLs to validate
 * @returns Array of valid URLs
 */
export function filterValidUrls(urls: string[]): string[] {
  const validUrls: string[] = [];

  for (const url of urls) {
    try {
      validateScrapingUrl(url);
      validUrls.push(url);
    } catch (error) {
      logger.debug(
        { url, error: error instanceof Error ? error.message : "Unknown" },
        "Filtered out invalid URL",
      );
      // Skip invalid URLs silently (they're already logged)
    }
  }

  logger.debug(
    { total: urls.length, valid: validUrls.length, filtered: urls.length - validUrls.length },
    "Batch URL validation complete",
  );

  return validUrls;
}
