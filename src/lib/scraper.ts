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
  logoUrl?: string
  productLinks?: string[]
  catalogPages?: string[]  // Pages with product listings
  totalPagesFound?: number
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

  // First, try to extract from schema.org JSON-LD (most reliable)
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || '{}')
      // Check if it's a Product schema
      if (data['@type'] === 'Product' || data['@context']?.includes('schema.org')) {
        if (data.name) product.name = data.name
        if (data.image) {
          // Handle both string and array formats
          product.imageUrl = Array.isArray(data.image) ? data.image[0] : data.image
        }
        if (data.offers) {
          const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers
          if (offers.price) product.price = parseFloat(offers.price)
          if (offers.priceCurrency) product.specifications = { ...product.specifications, currency: offers.priceCurrency }
          if (offers.availability) {
            product.inStock = offers.availability.includes('InStock') || offers.availability.includes('Available')
          }
        }
        if (data.description) product.description = data.description
        if (data.sku) product.modelNumber = data.sku
        if (data.brand) product.manufacturer = typeof data.brand === 'string' ? data.brand : data.brand.name
        if (data.aggregateRating) {
          const rating = data.aggregateRating
          if (rating.ratingValue) product.inStock = true // Usually means popular/available
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  })

  // If not found in schema.org, fall back to HTML extraction
  if (!product.name) {
    product.name =
      $('h1[itemprop="name"]').first().text().trim() ||
      $('h1.product-title').first().text().trim() ||
      $('h1.product-name').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().split('|')[0].trim()
  }

  // Try to extract price (if not found in schema.org)
  if (!product.price) {
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
  }

  // Try to extract image (if not found in schema.org) - check multiple attributes for lazy loading support
  if (!product.imageUrl) {
    const extractImageUrl = ($el: cheerio.Cheerio) => {
      // Priority order: data-src (lazy), src, data-lazy, data-original, srcset, data-srcset
      return (
        $el.attr('data-src') ||
        $el.attr('src') ||
        $el.attr('data-lazy') ||
        $el.attr('data-original') ||
        $el.attr('data-image') ||
        $el.attr('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
        $el.attr('data-srcset')?.split(',')[0]?.trim().split(' ')[0]
      )
    }

    // Try multiple selectors in priority order
    const imageSelectors = [
      'meta[property="og:image"]',
      '[itemprop="image"]',
      'img[class*="product"]',
      'img.main-image',
      'img.product-image',
      '.product-images img',
      '.product-gallery img',
      'img[alt*="product"]',
      'img[alt*="Product"]',
      '.woocommerce-product-gallery img',
      'img[data-src]',
      'picture img',
    ]

    for (const selector of imageSelectors) {
      const $img = $(selector).first()
      if ($img.length) {
        // For meta tags, use content attribute
        if (selector.startsWith('meta')) {
          product.imageUrl = $img.attr('content')
        } else {
          product.imageUrl = extractImageUrl($img)
        }
        if (product.imageUrl) break
      }
    }
  }

  // Make image URL absolute
  if (product.imageUrl && !product.imageUrl.startsWith('http')) {
    try {
      const urlObj = new URL(url)
      // Handle protocol-relative URLs
      if (product.imageUrl.startsWith('//')) {
        product.imageUrl = `${urlObj.protocol}${product.imageUrl}`
      } else {
        product.imageUrl = new URL(product.imageUrl, urlObj.origin).href
      }
    } catch {
      // Invalid URL, set to undefined
      product.imageUrl = undefined
    }
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

    company.productLinks = Array.from(productLinks).slice(0, 100) // Increased to 100 product links
    company.totalPagesFound = productLinks.size

    // Extract logo
    company.logoUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('[itemtype*="Organization"] [itemprop="logo"]').first().attr('src') ||
      $('.logo img, .site-logo img, [class*="logo"] img').first().attr('src')

    // Make logo URL absolute
    if (company.logoUrl && !company.logoUrl.startsWith('http')) {
      try {
        company.logoUrl = new URL(company.logoUrl, company.website).href
      } catch {
        company.logoUrl = undefined
      }
    }

    return company
  } catch (error) {
    console.error('Error scraping company info:', error)
    throw new Error(`Failed to scrape company info from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Crawl multiple pages to find more product links
 * Follows pagination and category pages
 */
export async function deepCrawlForProducts(
  startUrl: string,
  options: {
    maxPages?: number
    maxDepth?: number
    config?: Partial<ScraperConfig>
  } = {}
): Promise<{
  productLinks: string[]
  pagesVisited: string[]
  catalogPages: string[]
}> {
  const { maxPages = 10, maxDepth = 2, config = {} } = options
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const productLinks: Set<string> = new Set()
  const catalogPages: Set<string> = new Set()
  const visitedUrls: Set<string> = new Set()
  const urlQueue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }]

  const urlObj = new URL(startUrl)
  const baseHostname = urlObj.hostname

  // Keywords for identifying catalog/listing pages
  const catalogKeywords = [
    'shop', 'products', 'catalog', 'store', 'category', 'collection', 'inventory',
    // Solar/battery specific
    'solar', 'battery', 'batteries', 'inverter', 'panel', 'charger', 'storage',
    // Common e-commerce patterns
    'all-', 'browse', 'search', 'filter', 'list', 'grid'
  ]
  const paginationKeywords = ['page', 'p=', 'pg', 'offset', 'start', 'limit']

  console.log(`Starting deep crawl from: ${startUrl}`)

  while (urlQueue.length > 0 && visitedUrls.size < maxPages) {
    const { url, depth } = urlQueue.shift()!

    if (visitedUrls.has(url) || depth > maxDepth) {
      continue
    }

    try {
      console.log(`Crawling: ${url} (depth: ${depth}, visited: ${visitedUrls.size}/${maxPages})`)
      visitedUrls.add(url)

      // Add rate limiting
      if (visitedUrls.size > 1 && finalConfig.rateLimit) {
        await new Promise(resolve => setTimeout(resolve, finalConfig.rateLimit))
      }

      const html = await fetchHTML(url, finalConfig)
      const $ = cheerio.load(html)

      // Check if this is a catalog/listing page
      const isCatalogPage = catalogKeywords.some(keyword =>
        url.toLowerCase().includes(keyword) ||
        $('title').text().toLowerCase().includes(keyword) ||
        $('.products, .product-list, .catalog, [class*="product-grid"]').length > 0
      )

      if (isCatalogPage) {
        catalogPages.add(url)
      }

      // Extract all links from this page
      $('a[href]').each((_, link) => {
        const href = $(link).attr('href')
        if (!href) return

        try {
          // Make URL absolute
          const absoluteUrl = href.startsWith('http') ? href : new URL(href, url).href
          const linkObj = new URL(absoluteUrl)

          // Only follow links on the same domain
          if (linkObj.hostname !== baseHostname) return

          // Skip non-page links
          if (absoluteUrl.includes('#') ||
              absoluteUrl.includes('javascript:') ||
              absoluteUrl.match(/\.(pdf|jpg|jpeg|png|gif|zip|exe)$/i)) {
            return
          }

          const linkText = $(link).text().toLowerCase()
          const linkHref = href.toLowerCase()
          const pathname = linkObj.pathname.toLowerCase()

          // Enhanced product link detection with multiple patterns
          const productPatterns = [
            // Direct product keywords
            'product', 'item', 'detail', 'p/', '/p/',
            // E-commerce patterns
            '/pd/', '/dp/', '/gp/', '/itm/',
            // Category + item patterns (e.g., /batteries/eg4-lifepower4)
            /\/(solar|battery|batteries|inverter|panel|charger|cable|mount|bracket)s?\/[^\/]+$/,
            // SKU-like patterns
            /-\d{3,}/, // ends with dash and 3+ digits
            /[a-z]+-[a-z0-9]+-[a-z0-9]+/, // multi-dash separated (e.g., eg4-lifepower4-48v)
          ]

          const isProductLink = productPatterns.some(pattern => {
            if (typeof pattern === 'string') {
              return linkText.includes(pattern) || linkHref.includes(pattern) || pathname.includes(pattern)
            } else {
              // RegExp pattern
              return pattern.test(pathname) || pattern.test(linkHref)
            }
          })

          // Also check if link has product-like classes
          const linkClasses = $(link).attr('class') || ''
          const hasProductClass = linkClasses.match(/product|item|card/i)

          if (isProductLink || hasProductClass) {
            productLinks.add(absoluteUrl)
          }

          // Enhanced catalog/pagination detection
          const isCatalogLink = catalogKeywords.some(k => linkHref.includes(k) || pathname.includes(k))
          const isPaginationLink = paginationKeywords.some(k => linkHref.includes(k))

          // Also look for numeric pages and "next" links
          const isNextLink = linkText.includes('next') || linkText.includes('more') ||
                            linkHref.includes('next') || /page[\/=]\d+/.test(linkHref)

          if ((isCatalogLink || isPaginationLink || isNextLink) && depth < maxDepth) {
            urlQueue.push({ url: absoluteUrl, depth: depth + 1 })
          }

        } catch {
          // Invalid URL, skip
        }
      })

    } catch (error) {
      console.error(`Error crawling ${url}:`, error)
    }
  }

  console.log(`Deep crawl complete: ${visitedUrls.size} pages visited, ${productLinks.size} products found`)

  return {
    productLinks: Array.from(productLinks),
    pagesVisited: Array.from(visitedUrls),
    catalogPages: Array.from(catalogPages),
  }
}
