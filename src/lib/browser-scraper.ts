import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import * as cheerio from 'cheerio'
import { createLogger } from './logger'
import { ScrapedProduct, ScraperConfig } from './scraper'

const logger = createLogger('browser-scraper')

/**
 * Browser-based scraper using Puppeteer for JavaScript-heavy sites
 * Compatible with Vercel serverless functions using @sparticuz/chromium
 */
export class BrowserScraper {
  private browser: Browser | null = null

  /**
   * Initialize the headless browser (serverless-compatible)
   */
  async init() {
    if (this.browser) return

    logger.info('Launching headless browser for serverless environment')

    try {
      // Set minimal args for better compatibility
      chromium.setGraphicsMode = false

      this.browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      })

      logger.info('Browser launched successfully')
    } catch (error) {
      logger.error({ error }, 'Failed to launch browser')
      throw error
    }
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      logger.info('Browser closed')
    }
  }

  /**
   * Fetch HTML using a real browser (bypasses most bot detection)
   */
  async fetchHTML(url: string, config: Partial<ScraperConfig> = {}): Promise<string> {
    await this.init()

    const page = await this.browser!.newPage()

    try {
      // Set realistic User-Agent
      await page.setUserAgent(
        config.userAgent ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      )

      // Set additional headers to mimic real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      })

      logger.info({ url }, 'Fetching page with browser')

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout || 30000,
      })

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Scroll to trigger lazy loading
      await this.scrollPage(page)

      // Wait for lazy-loaded images
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Get the fully rendered HTML
      const html = await page.content()

      logger.info({ url, htmlLength: html.length }, 'Successfully fetched HTML with browser')

      return html
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to fetch HTML with browser'
      )
      throw error
    } finally {
      await page.close()
    }
  }

  /**
   * Scroll the page to trigger lazy-loaded images
   */
  private async scrollPage(page: Page) {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const scrollHeight = document.documentElement.scrollHeight
        const steps = 5
        const stepSize = scrollHeight / steps
        let scrolled = 0

        const interval = setInterval(() => {
          window.scrollBy(0, stepSize)
          scrolled += stepSize

          if (scrolled >= scrollHeight) {
            clearInterval(interval)
            window.scrollTo(0, 0) // Scroll back to top
            setTimeout(resolve, 500)
          }
        }, 200)
      })
    })
  }

  /**
   * Scrape a product page using browser
   */
  async scrapeProductPage(
    url: string,
    config: Partial<ScraperConfig> = {}
  ): Promise<ScrapedProduct> {
    try {
      const html = await this.fetchHTML(url, config)
      const $ = cheerio.load(html)

      // Use the same extraction logic as the regular scraper
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

      // Extract image (multiple strategies for lazy-loaded images)
      if (!product.imageUrl) {
        const imageSelectors = [
          'meta[property="og:image"]',
          '[itemprop="image"]',
          'img[class*="product"]',
          'img.main-image',
          '.product-images img',
          'picture img',
          'img[data-src]',
          'img[src]',
        ]

        for (const selector of imageSelectors) {
          const $img = $(selector).first()
          if ($img.length) {
            if (selector.startsWith('meta')) {
              product.imageUrl = $img.attr('content')
            } else {
              // Check all possible image attributes (lazy loading)
              product.imageUrl =
                $img.attr('src') ||
                $img.attr('data-src') ||
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                $img.attr('data-image')
            }
            if (product.imageUrl) break
          }
        }

        // Make absolute
        if (product.imageUrl && !product.imageUrl.startsWith('http')) {
          const urlObj = new URL(url)
          if (product.imageUrl.startsWith('//')) {
            product.imageUrl = `${urlObj.protocol}${product.imageUrl}`
          } else {
            product.imageUrl = new URL(product.imageUrl, urlObj.origin).href
          }
        }
      }

      logger.info(
        {
          url,
          hasName: !!product.name,
          hasPrice: !!product.price,
          hasImage: !!product.imageUrl,
        },
        'Product scraped with browser'
      )

      return product
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to scrape product with browser'
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

    logger.info({ totalUrls: urls.length }, 'Starting browser-based batch scraping')

    for (let i = 0; i < urls.length; i++) {
      try {
        const product = await this.scrapeProductPage(urls[i], config)
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
      'Browser batch scraping completed'
    )

    return results
  }
}

// Singleton instance
let browserScraperInstance: BrowserScraper | null = null

/**
 * Get or create browser scraper instance
 */
export async function getBrowserScraper(): Promise<BrowserScraper> {
  if (!browserScraperInstance) {
    browserScraperInstance = new BrowserScraper()
    await browserScraperInstance.init()
  }
  return browserScraperInstance
}

/**
 * Clean up browser scraper
 */
export async function closeBrowserScraper() {
  if (browserScraperInstance) {
    await browserScraperInstance.close()
    browserScraperInstance = null
  }
}
