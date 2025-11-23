import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeUrl } from "@/lib/scrape-url";
import { categorizeProduct } from "@/lib/categorize-product";

type ScrapeRequest = {
  url: string;
  distributorId?: string;
  saveToDatabase?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScrapeRequest;
    const { url, distributorId, saveToDatabase } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    console.log(`Processing URL: ${url}`);
    
    // 1. Scrape the single URL
    const data = await scrapeUrl(url);

    // 2. Handle Category Pages (Do NOT save, just return links)
    if (data.type === 'CATEGORY') {
        return NextResponse.json({
            success: true,
            type: 'CATEGORY',
            message: `Found ${data.links?.length} product links.`,
            links: data.links // Frontend should loop over these and call API for each
        });
    }

    // 3. Handle Product Pages (Save to DB)
    let equipment = null;
    if (
      saveToDatabase &&
      distributorId &&
      data.type === "PRODUCT"
    ) {
      if (!data.name || !data.price) {
        return NextResponse.json(
          { success: false, error: "Could not parse name or price" },
          { status: 422 },
        );
      }

      const category = categorizeProduct(data.name, data.description);

      equipment = await prisma.equipment.create({
        data: {
          distributorId,
          // Use name as a fallback model number so we satisfy the non-null constraint
          modelNumber: data.name.substring(0, 50),
          category,
          name: data.name,
          description: data.description,
          unitPrice: data.price,
          imageUrl: data.image,
          inStock: data.inStock ?? true,
          specifications: JSON.stringify({ source: "Auto-scraped" }),
        },
      });
      console.log(`Saved equipment: ${equipment.name} as ${category}`);
    }

    return NextResponse.json({
        success: true,
        type: 'PRODUCT',
        product: data,
        equipment
    });

  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to scrape" },
      { status: 500 }
    );
  }
}

