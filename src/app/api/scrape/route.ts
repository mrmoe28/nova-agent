import * as cheerio from 'cheerio';
import { detectPageType } from '@/lib/page-detection';

// Standard interface for our scraped data
export interface ScrapedData {
  type: 'PRODUCT' | 'CATEGORY';
  url: string;
  name?: string;
  price?: number;
  description?: string;
  image?: string;
  inStock?: boolean;
  links?: string[]; // For category pages
}

// Helper to clean price strings (e.g., "$1,299.00" -> 1299.00)
function parsePrice(text: string): number | undefined {
  const clean = text.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : num;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NovaAgent/1.0)' }
  });
  
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. DETECT PAGE TYPE using robust detection (Schema.org, URL patterns, visual heuristics)
  const pageType = detectPageType($, url);

  if (pageType === 'CATEGORY') {
    // --- CATEGORY PAGE LOGIC ---
    // Extract all product links to process later
    const links = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('/products/') || href.includes('/item/'))) {
        // Normalize URL
        try {
          const fullUrl = new URL(href, url).toString();
          links.add(fullUrl);
        } catch (e) {}
      }
    });

    return { type: 'CATEGORY', url, links: Array.from(links) };
  }

  // --- PRODUCT PAGE LOGIC ---
  // Try multiple common selectors for robustness
  const name = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content');
  
  let price = undefined;
  const priceSelectors = ['[property="og:price:amount"]', '.price', '.product-price', '.money', '[itemprop="price"]'];
  for (const sel of priceSelectors) {
    const val = $(sel).first().text().trim() || $(sel).attr('content');
    if (val) {
        const parsed = parsePrice(val);
        if (parsed) { price = parsed; break; }
    }
  }

  const description = $('meta[name="description"]').attr('content') || 
                      $('[itemprop="description"]').first().text().trim();
  
  const image = $('meta[property="og:image"]').attr('content') || 
                $('img[itemprop="image"]').attr('src');

  const inStock = !($(':contains("Out of stock")').length > 0 || 
                    $(':contains("Sold Out")').length > 0);

  return {
    type: 'PRODUCT',
    url,
    name,
    price,
    description,
    image,
    inStock
  };
}