import * as cheerio from 'cheerio'

export interface ScraperConfig {
  rateLimit?: number // milliseconds between requests
  timeout?: number // request timeout in ms
  userAgent?: string
}

export interface ScrapedProduct {
  name?: string
  manufacturer?: string
  modelNumber?: string
  description?: string
  price?: number
  imageUrl?: string
  specifications?: Record<string, string>
  category?: string
  inStock?: boolean
  dataSheetUrl?: string
}

export interface ScrapedCompany {
  name?: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  productLinks?: string[]
}

const DEFAULT_CONFIG: ScraperConfig = {
  rateLimit: 1000, // 1 second between requests
  timeout: 30000, // 30 seconds
  userAgent: 'NovaAgent/1.0 (+https://novaagent-kappa.vercel.app)',
}

/**
 * Fetch HTML content from a URL
 */
async function fetchHTML(url: string, config: ScraperConfig): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent || DEFAULT_CONFIG.userAgent!,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Extract product data using common patterns
 */
function extractProductData($: cheerio.Root, url: string): ScrapedProduct {
  const product: ScrapedProduct = {}

  // Try to extract product name
  product.name =
    $('h1[itemprop="name"]').first().text().trim() ||
    $('h1.product-title').first().text().trim() ||
    $('h1.product-name').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().split('|')[0].trim()

  // Try to extract price
  const priceText =
    $('[itemprop="price"]').first().attr('content') ||
    $('.price').first().text() ||
    $('[class*="price"]').first().text() ||
    $('meta[property="og:price:amount"]').attr('content')

  if (priceText) {
    const priceMatch = priceText.replace(/[,$]/g, '').match(/(\d+\.?\d*)/)
    if (priceMatch) {
      product.price = parseFloat(priceMatch[1])
    }
  }

  // Try to extract image
  product.imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('[itemprop="image"]').first().attr('src') ||
    $('img[class*="product"]').first().attr('src') ||
    $('img.main-image').first().attr('src')

  // Make image URL absolute
  if (product.imageUrl && !product.imageUrl.startsWith('http')) {
    const urlObj = new URL(url)
    product.imageUrl = new URL(product.imageUrl, urlObj.origin).href
  }

  // Try to extract description
  product.description =
    $('meta[name="description"]').attr('content') ||
    $('[itemprop="description"]').first().text().trim() ||
    $('.product-description').first().text().trim().substring(0, 500)

  // Try to extract model number
  const modelPatterns = [
    /model\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /part\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /SKU\s*:?\s*([A-Z0-9-]+)/i,
  ]

  const pageText = $('body').text()
  for (const pattern of modelPatterns) {
    const match = pageText.match(pattern)
    if (match) {
      product.modelNumber = match[1]
      break
    }
  }

  // Try to extract availability
  const availabilityText = $('.availability, [class*="stock"]').text().toLowerCase()
  product.inStock =
    availabilityText.includes('in stock') ||
    availabilityText.includes('available') ||
    !availabilityText.includes('out of stock')

  // Extract specifications from tables
  const specs: Record<string, string> = {}
  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td, th')
      if (cells.length === 2) {
        const key = $(cells[0]).text().trim()
        const value = $(cells[1]).text().trim()
        if (key && value && key.length < 50) {
          specs[key] = value
        }
      }
    })
  })

  if (Object.keys(specs).length > 0) {
    product.specifications = specs
  }

  // Try to find datasheet link
  $('a').each((_, link) => {
    const href = $(link).attr('href')
    const text = $(link).text().toLowerCase()
    if (href && (
      text.includes('datasheet') ||
      text.includes('spec sheet') ||
      text.includes('technical spec') ||
      href.toLowerCase().includes('datasheet') ||
      href.endsWith('.pdf')
    )) {
      product.dataSheetUrl = href.startsWith('http') ? href : new URL(href, new URL(url).origin).href
      return false // break
    }
  })

  return product
}

/**
 * Scrape a product page
 */
export async function scrapeProductPage(
  url: string,
  config: Partial<ScraperConfig> = {}
): Promise<ScrapedProduct> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const html = await fetchHTML(url, finalConfig)
    const $ = cheerio.load(html)
    const product = extractProductData($, url)

    return product
  } catch (error) {
    console.error('Scraper error:', error)
    throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Scrape multiple product URLs with rate limiting
 */
export async function scrapeMultipleProducts(
  urls: string[],
  config: Partial<ScraperConfig> = {}
): Promise<ScrapedProduct[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const results: ScrapedProduct[] = []

  for (let i = 0; i < urls.length; i++) {
    try {
      const product = await scrapeProductPage(urls[i], finalConfig)
      results.push(product)

      // Rate limiting
      if (i < urls.length - 1 && finalConfig.rateLimit) {
        await new Promise(resolve => setTimeout(resolve, finalConfig.rateLimit))
      }
    } catch (error) {
      console.error(`Failed to scrape ${urls[i]}:`, error)
      results.push({ name: `Error: ${urls[i]}` })
    }
  }

  return results
}

/**
 * Detect category from product data
 */
export function detectCategory(product: ScrapedProduct): string {
  const text = `${product.name} ${product.description}`.toLowerCase()

  if (text.includes('solar panel') || text.includes('photovoltaic') || text.includes('pv module')) {
    return 'solar'
  }
  if (text.includes('battery') || text.includes('energy storage') || text.includes('lithium')) {
    return 'battery'
  }
  if (text.includes('inverter') || text.includes('power converter')) {
    return 'inverter'
  }
  if (text.includes('mounting') || text.includes('rack') || text.includes('bracket')) {
    return 'mounting'
  }
  if (text.includes('wire') || text.includes('cable') || text.includes('breaker') || text.includes('disconnect')) {
    return 'electrical'
  }

  return 'other'
}

/**
 * Extract company information from a website
 * Uses schema.org Organization markup first, then falls back to common selectors
 */
export async function scrapeCompanyInfo(
  url: string,
  config: Partial<ScraperConfig> = {}
): Promise<ScrapedCompany> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const company: ScrapedCompany = {}

  try {
    const html = await fetchHTML(url, finalConfig)
    const $ = cheerio.load(html)
    const urlObj = new URL(url)
    company.website = `${urlObj.protocol}//${urlObj.hostname}`

    // Try to extract from schema.org Organization markup (JSON-LD)
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const data = JSON.parse($(script).html() || '{}')
        if (data['@type'] === 'Organization' || data['@context']?.includes('schema.org')) {
          if (data.name) company.name = data.name
          if (data.email) company.email = data.email
          if (data.telephone) company.phone = data.telephone
          if (data.address) {
            if (typeof data.address === 'string') {
              company.address = data.address
            } else if (data.address.streetAddress || data.address.addressLocality) {
              const parts = [
                data.address.streetAddress,
                data.address.addressLocality,
                data.address.addressRegion,
                data.address.postalCode,
                data.address.addressCountry
              ].filter(Boolean)
              company.address = parts.join(', ')
            }
          }
          if (data.description) company.description = data.description
        }
      } catch {
        // Invalid JSON, skip
      }
    })

    // Fallback: Extract company name from common locations
    if (!company.name) {
      company.name =
        $('[itemtype*="Organization"] [itemprop="name"]').first().text().trim() ||
        $('meta[property="og:site_name"]').attr('content') ||
        $('.company-name, .brand-name, .site-title').first().text().trim() ||
        $('title').text().split('|')[0].split('-')[0].trim()
    }

    // Extract email from contact pages or footer
    if (!company.email) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/
      const contactText = $('footer, .contact, .footer, [class*="contact"]').text()
      const emailMatch = contactText.match(emailRegex)
      if (emailMatch) {
        company.email = emailMatch[1]
      }
    }

    // Extract phone number
    if (!company.phone) {
      const phoneRegex = /(\+?1?\s*\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4})/
      const contactText = $('footer, .contact, .footer, [class*="contact"], [class*="phone"]').text()
      const phoneMatch = contactText.match(phoneRegex)
      if (phoneMatch) {
        company.phone = phoneMatch[1].trim()
      }
    }

    // Extract address
    if (!company.address) {
      company.address =
        $('[itemtype*="PostalAddress"]').text().trim() ||
        $('.address, .company-address, [class*="address"]').first().text().trim().substring(0, 200)
    }

    // Extract description
    if (!company.description) {
      company.description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        $('.company-description, .about, [class*="about"]').first().text().trim().substring(0, 500)
    }

    // Find product links on the page
    const productLinks: Set<string> = new Set()
    const productKeywords = ['product', 'shop', 'store', 'catalog', 'equipment', 'item']

    $('a[href]').each((_, link) => {
      const href = $(link).attr('href')
      if (!href) return

      const linkText = $(link).text().toLowerCase()
      const linkHref = href.toLowerCase()

      // Check if link seems to be a product page
      const isProductLink = productKeywords.some(
        keyword => linkText.includes(keyword) || linkHref.includes(keyword)
      )

      if (isProductLink && !linkHref.includes('#') && !linkHref.includes('javascript')) {
        try {
          // Make URL absolute
          const absoluteUrl = href.startsWith('http') ? href : new URL(href, company.website).href

          // Only include URLs from the same domain
          if (new URL(absoluteUrl).hostname === urlObj.hostname) {
            productLinks.add(absoluteUrl)
          }
        } catch {
          // Invalid URL, skip
        }
      }
    })

    company.productLinks = Array.from(productLinks).slice(0, 50) // Limit to 50 product links

    return company
  } catch (error) {
    console.error('Error scraping company info:', error)
    throw new Error(`Failed to scrape company info from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
