import * as cheerio from 'cheerio'
import { createLogger } from './logger'
import { ScrapedProduct, ScraperConfig } from './scraper'

const logger = createLogger('browser-scraper-bql')

/**
 * Browser-based scraper using BrowserQL (GraphQL API)
 * Compatible with Browserless free tier - no WebSocket required
 * Uses HTTP/GraphQL for browser automation
 */
export class BrowserScraperBQL {
  private endpoint: string
  private token: string

  constructor() {
    const token = process.env.BROWSERLESS_TOKEN
    if (!token) {
      throw new Error(
        'BROWSERLESS_TOKEN not configured. Please set your Browserless API token.'
      )
    }

    this.endpoint = 'https://production-sfo.browserless.io/chromium/bql'
    this.token = token
  }

  /**
   * Execute a BrowserQL GraphQL mutation
   */
  private async executeBQL(query: string, variables: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.endpoint}?token=${this.token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`BrowserQL request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`BrowserQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data
  }

  /**
   * Fetch HTML and extract live image URL using BrowserQL
   */
  async fetchHTMLWithImage(
    url: string
  ): Promise<{ html: string; imageUrl: string | null }> {
    logger.info({ url }, 'Fetching page with BrowserQL')

    const query = `
      mutation FetchPage($url: String!, $waitTime: Int!) {
        goto(url: $url, waitUntil: networkidle0) {
          status
        }

        # Wait for initial content
        wait(timeout: $waitTime)

        # Scroll to trigger lazy loading
        evaluate(expression: "
          async function scrollAndExtract() {
            // Scroll to trigger lazy loading
            let previousHeight = 0;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
              const currentHeight = document.body.scrollHeight;

              if (currentHeight === previousHeight) {
                attempts++;
                if (attempts >= 3) break;
              } else {
                attempts = 0;
              }

              previousHeight = currentHeight;
              window.scrollTo(0, currentHeight);
              await new Promise(r => setTimeout(r, 1500));
            }

            // Scroll back to top
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 500));

            // Extract image URL from live DOM
            const selectors = [
              'meta[property=\\"og:image\\"]',
              '[itemprop=\\"image\\"]',
              'img[class*=\\"product\\"]',
              'img.main-image',
              '.product-images img',
              '.product-image img',
              'picture img',
              'img[data-src]',
              'img[src]'
            ];

            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) {
                if (selector.startsWith('meta')) {
                  const content = element.getAttribute('content');
                  if (content && content.trim()) return content;
                } else {
                  const img = element;
                  if (img.src && !img.src.includes('data:image') && !img.src.includes('placeholder')) {
                    return img.src;
                  }
                  const dataSrc = img.getAttribute('data-src') ||
                                img.getAttribute('data-lazy') ||
                                img.getAttribute('data-original') ||
                                img.getAttribute('data-image');
                  if (dataSrc) return dataSrc;
                }
              }
            }

            return null;
          }

          scrollAndExtract();
        ") {
          value
        }

        html {
          content
        }
      }
    `

    const data = await this.executeBQL(query, {
      url,
      waitTime: 2000,
    }) as {
      html: { content: string }
      evaluate?: { value: string }
    }

    const html = data.html.content
    const imageUrl = data.evaluate?.value || null

    logger.info(
      {
        url,
        htmlLength: html.length,
        hasImage: !!imageUrl,
        imageUrl: imageUrl?.substring(0, 50),
      },
      'Successfully fetched HTML with BrowserQL'
    )

    return { html, imageUrl }
  }

  /**
   * Scrape a product page using BrowserQL
   */
  async scrapeProductPage(
    url: string
  ): Promise<ScrapedProduct> {
    try {
      const { html, imageUrl: liveImageUrl } = await this.fetchHTMLWithImage(url)
      const $ = cheerio.load(html)

      const product: ScrapedProduct = {
        sourceUrl: url,
      }

      // Extract product data using cheerio (same patterns as regular scraper)
      // Try schema.org JSON-LD first
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const data = JSON.parse($(script).html() || '{}')
          if (data['@type'] === 'Product' || data['@context']?.includes('schema.org')) {
            if (data.name) product.name = data.name
            if (data.image) {
              product.imageUrl = Array.isArray(data.image) ? data.image[0] : data.image
            }
            if (data.offers) {
              const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers
              if (offers.price) product.price = parseFloat(offers.price)
            }
            if (data.description) product.description = data.description
            if (data.sku) product.modelNumber = data.sku
            if (data.brand) {
              product.manufacturer = typeof data.brand === 'string' ? data.brand : data.brand.name
            }
          }
        } catch {
          // Invalid JSON
        }
      })

      // Fallback to HTML extraction
      if (!product.name) {
        product.name =
          $('h1[itemprop="name"]').first().text().trim() ||
          $('h1.product-title').first().text().trim() ||
          $('meta[property="og:title"]').attr('content') ||
          $('title').text().split('|')[0].trim()
      }

      // Extract price
      if (!product.price) {
        const priceText =
          $('[itemprop="price"]').first().attr('content') ||
          $('.price').first().text() ||
          $('[class*="price"]').first().text()

        if (priceText) {
          const priceMatch = priceText.replace(/[,$]/g, '').match(/(\d+\.?\d*)/)
          if (priceMatch) {
            product.price = parseFloat(priceMatch[1])
          }
        }
      }

      // Use image URL extracted from live DOM (2025 best practice)
      // This captures lazy-loaded images that Cheerio misses
      if (!product.imageUrl && liveImageUrl) {
        product.imageUrl = liveImageUrl
        logger.debug({ liveImageUrl }, 'Using image URL from live DOM')
      }

      logger.info(
        {
          url,
          hasName: !!product.name,
          hasPrice: !!product.price,
          hasImage: !!product.imageUrl,
        },
        'Product scraped with BrowserQL'
      )

      return product
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to scrape product with BrowserQL'
      )
      throw error
    }
  }

  /**
   * Scrape multiple product pages
   */
  async scrapeMultipleProducts(
    urls: string[],
    config: Partial<ScraperConfig> = {}
  ): Promise<ScrapedProduct[]> {
    const results: ScrapedProduct[] = []

    logger.info({ totalUrls: urls.length }, 'Starting BrowserQL batch scraping')

    for (let i = 0; i < urls.length; i++) {
      try {
        const product = await this.scrapeProductPage(urls[i])
        results.push(product)

        // Rate limiting
        if (i < urls.length - 1 && config.rateLimit) {
          await new Promise((resolve) => setTimeout(resolve, config.rateLimit))
        }
      } catch (error) {
        logger.error(
          {
            url: urls[i],
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to scrape product in batch'
        )
        results.push({ name: `Error: ${urls[i]}`, sourceUrl: urls[i] })
      }
    }

    logger.info(
      {
        totalUrls: urls.length,
        successCount: results.filter((r) => !r.name?.startsWith('Error:')).length,
      },
      'BrowserQL batch scraping completed'
    )

    return results
  }
}

// Singleton instance
let browserScraperInstance: BrowserScraperBQL | null = null

/**
 * Get or create browser scraper instance
 */
export async function getBrowserScraper(): Promise<BrowserScraperBQL> {
  if (!browserScraperInstance) {
    browserScraperInstance = new BrowserScraperBQL()
  }
  return browserScraperInstance
}

/**
 * Clean up browser scraper (no-op for BrowserQL)
 */
export async function closeBrowserScraper() {
  browserScraperInstance = null
}
