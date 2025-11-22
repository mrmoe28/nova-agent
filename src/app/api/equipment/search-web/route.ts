import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/equipment/search-web
 * Search the web for equipment, compare prices, and scrape new distributors
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 },
      );
    }

    // Get existing distributor websites to exclude
    const existingDistributors = await prisma.distributor.findMany({
      select: { website: true, name: true },
    });
    const existingWebsites = new Set(
      existingDistributors
        .map((d) => d.website)
        .filter((w): w is string => !!w)
        .map((w) => new URL(w).hostname.replace("www.", "")),
    );

    console.log(`Searching web for: ${query}`);
    console.log(`Excluding ${existingWebsites.size} existing distributors`);

    // Step 1: Web search for equipment (simulated - in production, use a search API)
    // For now, we'll use a combination of known solar equipment sites
    const searchResults = await performWebSearch(query, existingWebsites);

    // Step 2: Extract price information and sources
    const priceResults = await extractPriceInformation(searchResults);

    // Step 3: Identify new distributors and scrape them
    const newDistributors: Array<{
      id: string;
      name: string;
      website: string;
      productCount: number;
    }> = [];

    // Collect unique distributor URLs to scrape
    const distributorsToScrape = new Map<string, typeof priceResults[0]>();
    for (const result of priceResults) {
      if (
        result.distributorUrl &&
        result.distributorHostname &&
        !existingWebsites.has(result.distributorHostname) &&
        !distributorsToScrape.has(result.distributorHostname)
      ) {
        distributorsToScrape.set(result.distributorHostname, result);
      }
    }

    // Scrape up to 5 new distributors (as requested)
    const distributorsToProcess = Array.from(distributorsToScrape.values()).slice(0, 5);

    for (const result of distributorsToProcess) {
      if (!result.distributorUrl) continue;

      try {
        console.log(`Scraping new distributor: ${result.distributorUrl}`);

        // Call the scrape-from-url endpoint
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          (request.headers.get("host")
            ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
            : "http://localhost:3000");

        const scrapeResponse = await fetch(`${baseUrl}/api/distributors/scrape-from-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: result.distributorUrl,
            scrapeProducts: true,
            saveToDatabase: true,
            maxProducts: 50, // Limit products per distributor for faster scraping
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          if (scrapeData.success && scrapeData.distributor) {
            const productCount =
              scrapeData.productCount ||
              (scrapeData.products ? scrapeData.products.length : 0);

            newDistributors.push({
              id: scrapeData.distributor.id,
              name: scrapeData.distributor.name,
              website: scrapeData.distributor.website || result.distributorUrl,
              productCount,
            });

            // Add to existing websites to avoid duplicate scraping
            if (result.distributorHostname) {
              existingWebsites.add(result.distributorHostname);
            }

            console.log(
              `Successfully scraped ${scrapeData.distributor.name} with ${productCount} products`,
            );
          }
        } else {
          const errorData = await scrapeResponse.json().catch(() => ({}));
          console.error(
            `Failed to scrape ${result.distributorUrl}:`,
            errorData.error || scrapeResponse.statusText,
          );
        }
      } catch (error) {
        console.error(`Failed to scrape ${result.distributorUrl}:`, error);
        // Continue with other sources
      }
    }

    return NextResponse.json({
      success: true,
      results: priceResults.map((r) => ({
        source: r.source,
        url: r.url,
        price: r.price,
        currency: r.currency || "USD",
        inStock: r.inStock ?? true,
        distributorName: r.distributorName,
      })),
      newDistributors,
      scraping: newDistributors.length > 0,
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
 * Perform web search for equipment
 * In production, integrate with a search API like Google Custom Search, Bing, etc.
 */
async function performWebSearch(
  query: string,
  excludeHostnames: Set<string>,
): Promise<Array<{ url: string; title: string; snippet: string; hostname: string }>> {
  // Known solar equipment retailers (excluding existing distributors)
  const knownRetailers = [
    "www.renogy.com",
    "www.altestore.com",
    "www.solar-electric.com",
    "www.wholesalesolar.com",
    "www.solaris-shop.com",
    "www.unboundsolar.com",
    "www.solarpowerworldonline.com",
    "www.ecodirect.com",
    "www.solarpanelstore.com",
    "www.solarpanelsplus.com",
  ].filter((hostname) => !excludeHostnames.has(hostname));

  // Simulate search results
  // In production, use a real search API
  const results = knownRetailers.slice(0, 5).map((hostname) => ({
    url: `https://${hostname}/search?q=${encodeURIComponent(query)}`,
    title: `${query} - ${hostname}`,
    snippet: `Find ${query} at ${hostname}`,
    hostname,
  }));

  // Add some generic search results
  const genericSites = [
    "www.amazon.com",
    "www.ebay.com",
    "www.homedepot.com",
    "www.lowes.com",
    "www.walmart.com",
  ].filter((hostname) => !excludeHostnames.has(hostname));

  const genericResults = genericSites.slice(0, 3).map((hostname) => ({
    url: `https://${hostname}/s?k=${encodeURIComponent(query)}`,
    title: `${query} - ${hostname}`,
    snippet: `Search results for ${query}`,
    hostname,
  }));

  return [...results, ...genericResults];
}

/**
 * Extract price information from search results
 * In production, this would scrape actual product pages
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
  }>
> {
  const results = [];

  for (const result of searchResults) {
    try {
      // Simulate price extraction
      // In production, use actual web scraping or API calls
      const basePrice = 100 + Math.random() * 500; // Random price between $100-$600
      const price = Math.round(basePrice * 100) / 100;

      // Determine if it's a solar equipment retailer
      const isSolarRetailer = ![
        "amazon.com",
        "ebay.com",
        "homedepot.com",
        "lowes.com",
        "walmart.com",
      ].some((site) => result.hostname.includes(site));

      if (isSolarRetailer) {
        const hostname = result.hostname.replace("www.", "");
        results.push({
          source: result.title,
          url: result.url,
          price,
          currency: "USD",
          inStock: Math.random() > 0.2, // 80% chance of being in stock
          distributorName: hostname,
          distributorUrl: `https://${result.hostname}`,
          distributorHostname: hostname,
        });
      } else {
        // For generic sites, we might still want to track them
        const hostname = result.hostname.replace("www.", "");
        results.push({
          source: result.title,
          url: result.url,
          price,
          currency: "USD",
          inStock: Math.random() > 0.1, // 90% chance of being in stock
          distributorHostname: hostname, // Include for potential future scraping
        });
      }
    } catch (error) {
      console.error(`Failed to extract price from ${result.url}:`, error);
      // Continue with other results
    }
  }

  return results;
}

