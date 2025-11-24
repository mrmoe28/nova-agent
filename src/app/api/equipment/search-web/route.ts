import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * POST /api/equipment/search-web
 * Search the web for equipment, compare prices, and allow adding to database
 * Uses SerpAPI for web search (fallback to Google Custom Search or manual scraping)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 },
      );
    }

    console.log(`Searching web for: ${query}`);

    // Step 1: Perform web search using available APIs
    const searchResults = await performWebSearch(query, category);

    // Step 2: Extract price information from search results
    const priceResults = await extractPriceInformation(searchResults);

    // Step 3: Sort by price (lowest first)
    priceResults.sort((a, b) => a.price - b.price);

    return NextResponse.json({
      success: true,
      results: priceResults,
      query,
      count: priceResults.length,
    });
  } catch (error) {
    console.error("Error in web search:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search equipment",
      },
      { status: 500 },
    );
  }
}

/**
 * Perform web search using SerpAPI, Google Custom Search, or fallback methods
 */
async function performWebSearch(
  query: string,
  category?: string,
): Promise<Array<{ url: string; title: string; snippet: string; hostname: string }>> {
  const results: Array<{ url: string; title: string; snippet: string; hostname: string }> = [];

  // Try SerpAPI first (most reliable for price comparison)
  if (process.env.SERP_API_KEY) {
    try {
      const serpResults = await searchWithSerpAPI(query, category);
      if (serpResults.length > 0) {
        return serpResults;
      }
    } catch (error) {
      console.warn("SerpAPI search failed, trying alternatives:", error);
    }
  }

  // Try Google Custom Search API
  if (process.env.GOOGLE_CSE_ID && process.env.GOOGLE_API_KEY) {
    try {
      const googleResults = await searchWithGoogleCustomSearch(query, category);
      if (googleResults.length > 0) {
        return googleResults;
      }
    } catch (error) {
      console.warn("Google Custom Search failed, using fallback:", error);
    }
  }

  // Fallback: Search known solar equipment retailers directly
  return await searchKnownRetailers(query, category);
}

/**
 * Search using SerpAPI (https://serpapi.com/)
 */
async function searchWithSerpAPI(
  query: string,
  category?: string,
): Promise<Array<{ url: string; title: string; snippet: string; hostname: string }>> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    throw new Error("SERP_API_KEY not configured");
  }

  // Build search query with category if provided
  const searchQuery = category 
    ? `${query} ${category} buy price`
    : `${query} buy price solar equipment`;

  const response = await axios.get("https://serpapi.com/search", {
    params: {
      engine: "google_shopping",
      q: searchQuery,
      api_key: apiKey,
      num: 20, // Get top 20 results
    },
    timeout: 10000,
  });

  const results: Array<{ url: string; title: string; snippet: string; hostname: string }> = [];

  if (response.data.shopping_results) {
    for (const item of response.data.shopping_results) {
      try {
        const url = new URL(item.link || item.product_link);
        results.push({
          url: item.link || item.product_link,
          title: item.title || "Product",
          snippet: item.snippet || "",
          hostname: url.hostname.replace("www.", ""),
        });
      } catch (error) {
        console.warn("Invalid URL in SerpAPI result:", error);
      }
    }
  }

  return results;
}

/**
 * Search using Google Custom Search API
 */
async function searchWithGoogleCustomSearch(
  query: string,
  category?: string,
): Promise<Array<{ url: string; title: string; snippet: string; hostname: string }>> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error("Google Custom Search not configured");
  }

  const searchQuery = category 
    ? `${query} ${category} buy price`
    : `${query} buy price solar equipment`;

  const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
    params: {
      key: apiKey,
      cx: cseId,
      q: searchQuery,
      num: 10,
    },
    timeout: 10000,
  });

  const results: Array<{ url: string; title: string; snippet: string; hostname: string }> = [];

  if (response.data.items) {
    for (const item of response.data.items) {
      try {
        const url = new URL(item.link);
        results.push({
          url: item.link,
          title: item.title,
          snippet: item.snippet || "",
          hostname: url.hostname.replace("www.", ""),
        });
      } catch (error) {
        console.warn("Invalid URL in Google Search result:", error);
      }
    }
  }

  return results;
}

/**
 * Fallback: Search known solar equipment retailers
 */
async function searchKnownRetailers(
  query: string,
  category?: string,
): Promise<Array<{ url: string; title: string; snippet: string; hostname: string }>> {
  const knownRetailers = [
    "www.renogy.com",
    "www.altestore.com",
    "www.solar-electric.com",
    "www.wholesalesolar.com",
    "www.solaris-shop.com",
    "www.unboundsolar.com",
    "www.ecodirect.com",
    "www.solarpanelstore.com",
    "www.solarpanelsplus.com",
    "www.greentechrenewables.com",
  ];

  const results: Array<{ url: string; title: string; snippet: string; hostname: string }> = [];

  // Return search URLs for known retailers
  // In production, you could scrape these sites or use their APIs
  for (const hostname of knownRetailers.slice(0, 10)) {
    results.push({
      url: `https://${hostname}/search?q=${encodeURIComponent(query)}`,
      title: `${query} - ${hostname}`,
      snippet: `Search for ${query} at ${hostname}`,
      hostname: hostname.replace("www.", ""),
    });
  }

  return results;
}

/**
 * Extract price information from search results by scraping product pages
 */
async function extractPriceInformation(
  searchResults: Array<{ url: string; title: string; snippet: string; hostname: string }>,
): Promise<
  Array<{
    source: string;
    url: string;
    price: number;
    currency: string;
    inStock: boolean;
    distributorName?: string;
    distributorUrl?: string;
    distributorHostname?: string;
    imageUrl?: string;
    manufacturer?: string;
    modelNumber?: string;
    specifications?: string;
  }>
> {
  const results = [];

  // Process up to 15 results to avoid timeout
  const resultsToProcess = searchResults.slice(0, 15);

  for (const result of resultsToProcess) {
    try {
      // Try to scrape the product page for price and details
      const productInfo = await scrapeProductPage(result.url);

      if (productInfo && productInfo.price > 0) {
        const hostname = result.hostname.replace("www.", "");
        const isSolarRetailer = ![
          "amazon.com",
          "ebay.com",
          "homedepot.com",
          "lowes.com",
          "walmart.com",
        ].some((site) => hostname.includes(site));

        results.push({
          source: productInfo.title || result.title,
          url: result.url,
          price: productInfo.price,
          currency: productInfo.currency || "USD",
          inStock: productInfo.inStock ?? true,
          distributorName: isSolarRetailer ? hostname : undefined,
          distributorUrl: isSolarRetailer ? `https://${result.hostname}` : undefined,
          distributorHostname: isSolarRetailer ? hostname : undefined,
          imageUrl: productInfo.imageUrl,
          manufacturer: productInfo.manufacturer,
          modelNumber: productInfo.modelNumber,
          specifications: productInfo.specifications,
        });
      }
    } catch (error) {
      console.warn(`Failed to extract price from ${result.url}:`, error);
      // Continue with other results
    }
  }

  return results;
}

/**
 * Scrape product page for price and product information
 */
async function scrapeProductPage(
  url: string,
): Promise<{
  title?: string;
  price: number;
  currency: string;
  inStock?: boolean;
  imageUrl?: string;
  manufacturer?: string;
  modelNumber?: string;
  specifications?: string;
} | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 8000,
    });

    const $ = cheerio.load(response.data);

    // Try to extract price using common selectors
    let price = 0;
    const priceSelectors = [
      '[data-price]',
      '.price',
      '.product-price',
      '[itemprop="price"]',
      '.cost',
      '.amount',
      'span[class*="price"]',
      'div[class*="price"]',
    ];

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text();
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/,/g, ""));
        if (price > 0) break;
      }
    }

    // If no price found, try to find it in JSON-LD structured data
    if (price === 0) {
      const jsonLd = $('script[type="application/ld+json"]').first().html();
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd);
          if (data.offers?.price) {
            price = parseFloat(data.offers.price);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Extract product title
    const title =
      $('h1').first().text().trim() ||
      $('[itemprop="name"]').first().text().trim() ||
      $('title').first().text().trim();

    // Extract image
    const imageUrl =
      $('[itemprop="image"]').attr("content") ||
      $('meta[property="og:image"]').attr("content") ||
      $('.product-image img').first().attr("src") ||
      $('img[class*="product"]').first().attr("src");

    // Extract manufacturer
    const manufacturer =
      $('[itemprop="brand"]').text().trim() ||
      $('[itemprop="manufacturer"]').text().trim() ||
      $('.manufacturer').first().text().trim();

    // Extract model number
    const modelNumber =
      $('[itemprop="model"]').text().trim() ||
      $('.model-number').first().text().trim() ||
      $('.sku').first().text().trim();

    // Check stock status
    const stockText = $('.stock-status, .availability, [itemprop="availability"]').first().text().toLowerCase();
    const inStock = !stockText.includes("out of stock") && !stockText.includes("unavailable");

    // Extract specifications (try to get product details)
    const specs = $('.specifications, .product-details, .features').first().text().trim();

    return {
      title,
      price,
      currency: "USD",
      inStock,
      imageUrl: imageUrl ? (imageUrl.startsWith("http") ? imageUrl : new URL(imageUrl, url).href) : undefined,
      manufacturer: manufacturer || undefined,
      modelNumber: modelNumber || undefined,
      specifications: specs || undefined,
    };
  } catch (error) {
    console.warn(`Failed to scrape ${url}:`, error);
    return null;
  }
}
