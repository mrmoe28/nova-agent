import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeCompanyInfo,
  scrapeMultipleProducts,
  detectCategory,
  deepCrawlForProducts,
} from "@/lib/scraper";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-scraper");

// Allow up to 5 minutes for cron jobs (max on Vercel Pro)
// This gives enough time for comprehensive scraping
export const maxDuration = 300;

/**
 * GET /api/cron/scrape-distributors
 * Scheduled cron job to automatically rescrape all active distributors
 * Runs daily at 2 AM UTC
 *
 * This endpoint is protected by Vercel's built-in cron authentication
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify this is a legitimate cron request from Vercel
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn({ authHeader }, "Unauthorized cron request");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  logger.info("Starting scheduled distributor rescraping");

  try {
    // Get all active distributors that need rescraping
    const distributors = await prisma.distributor.findMany({
      where: {
        isActive: true,
        website: { not: null },
      },
      select: {
        id: true,
        name: true,
        website: true,
        lastScrapedAt: true,
      },
    });

    logger.info(
      { distributorCount: distributors.length },
      "Found active distributors",
    );

    const results = {
      total: distributors.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ distributorId: string; error: string }>,
    };

    // Process each distributor
    for (const distributor of distributors) {
      if (!distributor.website) continue;

      const crawlJob = await prisma.crawlJob.create({
        data: {
          type: "distributor",
          status: "running",
          targetUrl: distributor.website,
          distributorId: distributor.id,
          startedAt: new Date(),
        },
      });

      logger.info(
        {
          distributorId: distributor.id,
          distributorName: distributor.name,
          crawlJobId: crawlJob.id,
        },
        "Starting distributor rescrape",
      );

      try {
        // Scrape company info
        const companyInfo = await scrapeCompanyInfo(distributor.website, {
          rateLimit: 1500,
          timeout: 30000,
        });

        // Deep crawl for products
        const crawlResult = await deepCrawlForProducts(distributor.website, {
          maxPages: 30, // Limit pages for scheduled jobs
          maxDepth: 3,
          config: {
            rateLimit: 1000,
            timeout: 30000,
          },
        });

        logger.info(
          {
            distributorId: distributor.id,
            productLinks: crawlResult.productLinks.length,
            pagesVisited: crawlResult.pagesVisited.length,
          },
          "Crawl completed",
        );

        // Scrape up to 100 products for scheduled jobs
        const productUrls = crawlResult.productLinks.slice(0, 100);
        const scrapedProducts = await scrapeMultipleProducts(productUrls, {
          rateLimit: 1500,
          timeout: 30000,
        });

        logger.info(
          {
            distributorId: distributor.id,
            productsScraped: scrapedProducts.length,
          },
          "Products scraped",
        );

        // Update distributor info
        const updateData: Record<string, unknown> = {
          lastScrapedAt: new Date(),
        };
        if (companyInfo.name) updateData.name = companyInfo.name;
        if (companyInfo.email) updateData.email = companyInfo.email;
        if (companyInfo.phone) updateData.phone = companyInfo.phone;
        if (companyInfo.logoUrl) updateData.logoUrl = companyInfo.logoUrl;

        await prisma.distributor.update({
          where: { id: distributor.id },
          data: updateData,
        });

        // Save/update products
        let productsUpdated = 0;
        for (const product of scrapedProducts) {
          if (!product.name || !product.price) continue;

          try {
            const category = detectCategory(product);

            // Check if equipment already exists by model number and distributor
            const existingEquipment = await prisma.equipment.findFirst({
              where: {
                distributorId: distributor.id,
                modelNumber:
                  product.modelNumber || product.name.substring(0, 50),
              },
            });

            if (existingEquipment) {
              // Update existing equipment
              await prisma.equipment.update({
                where: { id: existingEquipment.id },
                data: {
                  name: product.name,
                  manufacturer:
                    product.manufacturer || existingEquipment.manufacturer,
                  description:
                    product.description || existingEquipment.description,
                  unitPrice: product.price,
                  imageUrl: product.imageUrl || existingEquipment.imageUrl,
                  inStock: product.inStock !== false,
                  lastScrapedAt: new Date(),
                },
              });

              // Create price snapshot if price changed
              if (
                Math.abs(existingEquipment.unitPrice - product.price) > 0.01
              ) {
                await prisma.priceSnapshot.create({
                  data: {
                    equipmentId: existingEquipment.id,
                    price: product.price,
                    currency: "USD",
                  },
                });
              }
            } else {
              // Create new equipment
              const equipment = await prisma.equipment.create({
                data: {
                  distributorId: distributor.id,
                  category,
                  name: product.name,
                  manufacturer: product.manufacturer || null,
                  modelNumber:
                    product.modelNumber || product.name.substring(0, 50),
                  description: product.description || null,
                  specifications: product.specifications
                    ? JSON.stringify(product.specifications)
                    : null,
                  unitPrice: product.price,
                  imageUrl: product.imageUrl || null,
                  dataSheetUrl: product.dataSheetUrl || null,
                  inStock: product.inStock !== false,
                  lastScrapedAt: new Date(),
                },
              });

              // Create initial price snapshot
              await prisma.priceSnapshot.create({
                data: {
                  equipmentId: equipment.id,
                  price: product.price,
                  currency: "USD",
                },
              });
            }

            productsUpdated++;
          } catch (error) {
            logger.error(
              {
                distributorId: distributor.id,
                productName: product.name,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              "Failed to save/update product",
            );
          }
        }

        // Update crawl job to completed
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            status: "completed",
            productsProcessed: scrapedProducts.length,
            productsUpdated,
            completedAt: new Date(),
            metadata: JSON.stringify({
              productLinks: crawlResult.productLinks.length,
              pagesVisited: crawlResult.pagesVisited.length,
            }),
          },
        });

        // Create scrape history
        await prisma.scrapeHistory.create({
          data: {
            distributorId: distributor.id,
            url: distributor.website,
            status:
              productsUpdated > 0
                ? "success"
                : scrapedProducts.length > 0
                  ? "partial"
                  : "failed",
            itemsFound: scrapedProducts.length,
            itemsSaved: productsUpdated,
            metadata: JSON.stringify({
              pagesVisited: crawlResult.pagesVisited.length,
              scheduledScrape: true,
            }),
          },
        });

        results.success++;
        logger.info(
          {
            distributorId: distributor.id,
            distributorName: distributor.name,
            productsUpdated,
          },
          "Distributor rescrape completed",
        );
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push({
          distributorId: distributor.id,
          error: errorMessage,
        });

        logger.error(
          {
            distributorId: distributor.id,
            distributorName: distributor.name,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
          "Failed to rescrape distributor",
        );

        // Update crawl job to failed
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            status: "failed",
            errorMessage,
            completedAt: new Date(),
          },
        });
      }

      // Rate limiting between distributors (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const duration = Date.now() - startTime;
    logger.info(
      {
        duration,
        total: results.total,
        success: results.success,
        failed: results.failed,
      },
      "Scheduled scraping completed",
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled scraping completed",
      duration,
      results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      },
      "Scheduled scraping failed",
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Scheduled scraping failed",
        duration,
      },
      { status: 500 },
    );
  }
}
