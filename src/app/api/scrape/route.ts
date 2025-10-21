import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeProductPage,
  scrapeMultipleProducts,
  detectCategory,
} from "@/lib/scraper";

/**
 * POST /api/scrape - Scrape product URL(s) and optionally save to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, urls, distributorId, saveToDatabase, category } = body;

    if (!url && !urls) {
      return NextResponse.json(
        { success: false, error: "URL or URLs array is required" },
        { status: 400 },
      );
    }

    if (saveToDatabase && !distributorId) {
      return NextResponse.json(
        {
          success: false,
          error: "distributorId is required when saveToDatabase is true",
        },
        { status: 400 },
      );
    }

    // Scrape single or multiple URLs
    const urlsToScrape = urls || [url];
    console.log(`Scraping ${urlsToScrape.length} URL(s)...`);

    const scrapedProducts = await scrapeMultipleProducts(urlsToScrape, {
      rateLimit: 1500, // 1.5 seconds between requests
      timeout: 30000,
    });

    console.log(`Scraped ${scrapedProducts.length} products`);

    // Optionally save to database
    const savedEquipment = [];
    if (saveToDatabase && distributorId) {
      for (const product of scrapedProducts) {
        if (!product.name || !product.price) {
          console.log("Skipping product with missing name or price");
          continue;
        }

        const detectedCategory = category || detectCategory(product);

        try {
          const equipment = await prisma.equipment.create({
            data: {
              distributorId,
              category: detectedCategory,
              name: product.name,
              manufacturer: product.manufacturer || null,
              modelNumber: product.modelNumber || product.name.substring(0, 50),
              description: product.description || null,
              specifications: product.specifications
                ? JSON.stringify(product.specifications)
                : null,
              unitPrice: product.price,
              imageUrl: product.imageUrl || null,
              dataSheetUrl: product.dataSheetUrl || null,
              inStock: product.inStock !== false,
            },
          });

          savedEquipment.push(equipment);
          console.log(`Saved equipment: ${equipment.name}`);
        } catch (error) {
          console.error("Error saving equipment:", error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      scraped: scrapedProducts.length,
      saved: savedEquipment.length,
      products: scrapedProducts,
      equipment: savedEquipment,
    });
  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/scrape - Test endpoint to scrape a single URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "URL parameter is required" },
      { status: 400 },
    );
  }

  try {
    const product = await scrapeProductPage(url);
    const category = detectCategory(product);

    return NextResponse.json({
      success: true,
      product,
      suggestedCategory: category,
    });
  } catch (error) {
    console.error("Scrape test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape",
      },
      { status: 500 },
    );
  }
}
