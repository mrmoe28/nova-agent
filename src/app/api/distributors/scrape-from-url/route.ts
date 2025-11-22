import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeCompanyInfo,
  scrapeMultipleProducts,
  detectCategory,
  deepCrawlForProducts,
  isProductPageUrl,
} from "@/lib/scraper";
import {
  getBrowserScraper,
  closeBrowserScraper,
} from "@/lib/browser-scraper-bql";
import { getAIScraper } from "@/lib/ai-agent-scraper";
import { createLogger, logOperation } from "@/lib/logger";

const logger = createLogger("scrape-api");

// Allow up to 60 seconds for scraping operations (Pro tier)
// Hobby tier is limited to 10 seconds
export const maxDuration = 60;

/**
 * POST /api/distributors/scrape-from-url
 * Scrape company information and products from a distributor's website
 *
 * IMPORTANT: This is a QUICK PREVIEW mode for Vercel Hobby tier (10s timeout limit)
 * Settings: 3 pages, depth 1, 5 products, 300ms rate limit
 *
 * For comprehensive scraping, use the scheduled cron job which runs at 2 AM UTC:
 * Settings: 30 pages, depth 3, 100 products, 1000ms rate limit, 5min timeout
 *
 * The cron job does the heavy lifting - this endpoint is just for quick tests.
 *
 * Optionally save to database
 */
export async function POST(request: NextRequest) {
  let crawlJobId: string | null = null;
  let heartbeat: NodeJS.Timeout | undefined = undefined;

  try {
    const body = await request.json();
    const {
      url,
      saveToDatabase,
      scrapeProducts,
      maxProducts = 999, // Default to unlimited (high number)
      distributorId,
      useBrowser = false,
      useAI = false,
    } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 },
      );
    }

    logger.info(
      { url, saveToDatabase, scrapeProducts, maxProducts, useBrowser, useAI },
      "Starting scrape job",
    );

    // Create a CrawlJob record to track this scraping operation
    const crawlJob = await prisma.crawlJob.create({
      data: {
        type: scrapeProducts ? "full" : "distributor",
        status: "running",
        targetUrl: url,
        distributorId: distributorId || null,
        startedAt: new Date(),
      },
    });
    crawlJobId = crawlJob.id;
    logger.info({ crawlJobId }, "Created crawl job");

    // Set up heartbeat to keep job alive and prevent cleanup
    heartbeat = setInterval(async () => {
      if (crawlJobId) {
        try {
          await prisma.crawlJob.update({
            where: { id: crawlJobId },
            data: { startedAt: new Date() }, // Update timestamp to show activity
          });
          logger.debug({ crawlJobId }, "Heartbeat: Job still alive");
        } catch (error) {
          logger.warn({ crawlJobId }, "Heartbeat failed, job may have been deleted");
          clearInterval(heartbeat);
        }
      }
    }, 60000); // Every 60 seconds

    // Step 1: Scrape company information
    const companyInfo = await logOperation(
      logger,
      "scrape-company-info",
      () =>
        scrapeCompanyInfo(url, {
          rateLimit: 200, // Fast rate limit
          timeout: 5000, // 5 second timeout
          respectRobotsTxt: true,
          maxRetries: 1,
        }),
      { url },
    );

    logger.info({ companyName: companyInfo.name }, "Found company");

    // AI-Powered Scraping Mode (bypasses traditional crawling)
    let scrapedProducts: Awaited<ReturnType<typeof scrapeMultipleProducts>> =
      [];

    if (useAI && scrapeProducts) {
      logger.info(
        { url, useAI: true },
        "🤖 AI Agent mode enabled - using intelligent scraping",
      );

      const aiScraper = getAIScraper();
      scrapedProducts = await logOperation(
        logger,
        "ai-agent-scrape",
        () =>
          aiScraper.scrape(url, {
            rateLimit: 200,
            timeout: 5000,
            respectRobotsTxt: true,
            maxRetries: 1,
          }),
        { url, mode: "AI-powered" },
      );

      logger.info(
        { productsFound: scrapedProducts.length },
        "🤖 AI Agent scraping completed",
      );
    }

    // Step 2: Traditional scraping (skip if AI already succeeded)
    let allProductLinks: string[] = [];
    if (scrapeProducts && scrapedProducts.length === 0) {
      const isProductPage = isProductPageUrl(url);
      logger.info({ url, isProductPage }, "Analyzing URL type");

      if (isProductPage) {
        // URL is already a product page - scrape it directly
        logger.info({ url }, "Detected product page - scraping directly");
        allProductLinks = [url];
      } else {
        // URL is a category page - deep crawl to find products
        logger.info(
          { url },
          "Detected category page - starting deep crawl for products",
        );

        const crawlResult = await logOperation(
          logger,
          "deep-crawl",
          () =>
            deepCrawlForProducts(url, {
              maxPages: 100, // Crawl up to 100 pages to find all products
              maxDepth: 2, // Increased depth to find products in subcategories
              config: {
                rateLimit: 200, // Fast rate limit
                timeout: 5000, // 5 second timeout
                respectRobotsTxt: true,
                maxRetries: 1,
              },
            }),
          { url, maxPages: 100, maxDepth: 2 },
        );

        allProductLinks = crawlResult.productLinks;
        logger.info(
          {
            productLinks: allProductLinks.length,
            pagesVisited: crawlResult.pagesVisited.length,
            catalogPages: crawlResult.catalogPages.length,
          },
          "Deep crawl completed",
        );
      }
    }

    // Step 3: Traditional product scraping (skip if AI already succeeded)
    if (
      scrapeProducts &&
      allProductLinks.length > 0 &&
      scrapedProducts.length === 0
    ) {
      const productUrls = allProductLinks.slice(0, maxProducts);
      logger.info(
        { productsToScrape: productUrls.length, useBrowser },
        "Starting product scraping",
      );

      // Use browser scraper if requested (bypasses bot detection)
      if (useBrowser) {
        const browserScraper = await getBrowserScraper();
        scrapedProducts = await logOperation(
          logger,
          "scrape-products-browser",
          () =>
            browserScraper.scrapeMultipleProducts(productUrls, {
              rateLimit: 1000,
              timeout: 10000,
            }),
          { count: productUrls.length, method: "browser" },
        );

        // Clean up browser
        await closeBrowserScraper();
      } else {
        // Regular fetch-based scraping (fast)
        scrapedProducts = await logOperation(
          logger,
          "scrape-products",
          () =>
            scrapeMultipleProducts(productUrls, {
              rateLimit: 200,
              timeout: 5000,
              respectRobotsTxt: true,
              maxRetries: 1,
            }),
          { count: productUrls.length, method: "fetch" },
        );
      }

      logger.info(
        { productsScraped: scrapedProducts.length },
        "Product scraping completed",
      );
    }

    // Step 4: Optionally save to database
    let savedDistributor: Awaited<ReturnType<typeof prisma.distributor.create>> | null = null;
    const savedEquipment: Awaited<ReturnType<typeof prisma.equipment.create>>[] = [];

    if (saveToDatabase) {
      // Create or update distributor
      if (distributorId) {
        // Update existing distributor - only include fields that have values
        const updateData: {
          name?: string;
          contactName?: string;
          email?: string;
          phone?: string;
          website?: string;
          address?: string;
          notes?: string;
          logoUrl?: string;
          lastScrapedAt: Date;
        } = {
          lastScrapedAt: new Date(),
        };

        if (companyInfo.name) updateData.name = companyInfo.name;
        if (companyInfo.contactName)
          updateData.contactName = companyInfo.contactName;
        if (companyInfo.email) updateData.email = companyInfo.email;
        if (companyInfo.phone) updateData.phone = companyInfo.phone;
        if (companyInfo.website || url)
          updateData.website = companyInfo.website || url;
        if (companyInfo.address) updateData.address = companyInfo.address;
        if (companyInfo.description) updateData.notes = companyInfo.description;
        if (companyInfo.logoUrl) updateData.logoUrl = companyInfo.logoUrl;

        savedDistributor = await prisma.distributor.update({
          where: { id: distributorId },
          data: updateData,
        });
        logger.info(
          { distributorId: savedDistributor.id, name: savedDistributor.name },
          "Updated distributor",
        );
      } else {
        // Create new distributor
        savedDistributor = await prisma.distributor.create({
          data: {
            name: companyInfo.name || "Unknown Distributor",
            contactName: companyInfo.contactName || null,
            email: companyInfo.email || null,
            phone: companyInfo.phone || null,
            website: companyInfo.website || url,
            address: companyInfo.address || null,
            notes: companyInfo.description || "Auto-scraped from website",
            logoUrl: companyInfo.logoUrl || null,
            lastScrapedAt: new Date(),
          },
        });
        logger.info(
          { distributorId: savedDistributor.id, name: savedDistributor.name },
          "Created new distributor",
        );
      }

      // Save products with price snapshots (OPTIMIZED: batch processing)
      // Step 1: Filter valid products
      const distributorName = savedDistributor?.name?.toLowerCase().trim() || "";
      const validationReasons = {
        noName: 0,
        noPrice: 0,
        matchesDistributorName: 0,
        tooShort: 0,
        valid: 0,
      };

      const validProducts = scrapedProducts.filter((p) => {
        // Must have name
        if (!p.name) {
          validationReasons.noName++;
          return false;
        }
        
        // Price is required UNLESS we have a sourceUrl (can scrape detail page later)
        // This allows listing page products without prices to be saved
        if (!p.price && !p.sourceUrl) {
          validationReasons.noPrice++;
          return false;
        }
        
        // Reject products where name matches distributor name (common scraping error)
        const productNameLower = p.name.toLowerCase().trim();
        if (distributorName && productNameLower === distributorName) {
          validationReasons.matchesDistributorName++;
          logger.debug(
            { productName: p.name, distributorName },
            "Rejecting product with distributor name",
          );
          return false;
        }
        
        // Reject very short names (likely not real product names)
        if (productNameLower.length < 3) {
          validationReasons.tooShort++;
          logger.debug({ productName: p.name }, "Rejecting product with very short name");
          return false;
        }
        
        validationReasons.valid++;
        return true;
      });

      // Log validation breakdown
      logger.info(
        {
          total: scrapedProducts.length,
          valid: validProducts.length,
          rejected: scrapedProducts.length - validProducts.length,
          reasons: validationReasons,
        },
        "Product validation breakdown",
      );

      logger.info(
        { total: scrapedProducts.length, valid: validProducts.length },
        "Processing products for database",
      );

      if (validProducts.length === 0) {
        logger.warn("No valid products to save");
      } else if (!savedDistributor) {
        logger.error("Cannot save products: distributor not created");
      } else {
        // TypeScript type narrowing: savedDistributor is non-null here
        const distributor = savedDistributor;

        // Step 2: Batch check for existing equipment
        const sourceUrls = validProducts
          .map((p) => p.sourceUrl)
          .filter(Boolean) as string[];

        const existingBySourceUrl = await prisma.equipment.findMany({
          where: {
            distributorId: distributor.id,
            sourceUrl: { in: sourceUrls },
          },
        });

        const existingMap = new Map(
          existingBySourceUrl.map((e) => [e.sourceUrl, e]),
        );

        logger.debug(
          { existing: existingMap.size, new: validProducts.length - existingMap.size },
          "Checked existing equipment",
        );

        // Step 3: Separate into new and existing products
        const toCreate: typeof validProducts = [];
        const toUpdate: Array<{ product: typeof validProducts[0]; existing: typeof existingBySourceUrl[0] }> = [];

        for (const product of validProducts) {
          const existing = product.sourceUrl
            ? existingMap.get(product.sourceUrl)
            : null;

          if (existing) {
            toUpdate.push({ product, existing });
          } else {
            toCreate.push(product);
          }
        }

        logger.info(
          { toCreate: toCreate.length, toUpdate: toUpdate.length },
          "Separated products for batch processing",
        );

        // Log why count might not increase
        if (toCreate.length === 0 && toUpdate.length > 0) {
          logger.info(
            { updated: toUpdate.length },
            "All products already exist - updating existing records (count won't increase)",
          );
        }

        // Step 4: Batch create new equipment
        if (toCreate.length > 0) {
          const createdEquipment = await prisma.equipment.createManyAndReturn({
            data: toCreate.map((product) => ({
              distributorId: distributor.id,
              category: detectCategory(product),
              name: product.name!,
              manufacturer: product.manufacturer || null,
              modelNumber: product.modelNumber || product.name!.substring(0, 50),
              description: product.description || null,
              specifications: product.specifications
                ? JSON.stringify(product.specifications)
                : null,
              // Use price if available, otherwise 0 (can be updated when detail page is scraped)
              unitPrice: product.price || 0,
              imageUrl: product.imageUrl || null,
              sourceUrl: product.sourceUrl || null,
              dataSheetUrl: product.dataSheetUrl || null,
              inStock: product.inStock !== false,
              lastScrapedAt: new Date(),
            })),
          });

          savedEquipment.push(...createdEquipment);
          logger.info({ count: createdEquipment.length }, "Batch created new equipment");
        }

        // Step 5: Parallel update existing equipment
        if (toUpdate.length > 0) {
          const updatePromises = toUpdate.map(({ product, existing }) =>
            prisma.equipment.update({
              where: { id: existing.id },
              data: {
                category: detectCategory(product),
                name: product.name!,
                manufacturer: product.manufacturer || null,
                description: product.description || null,
                specifications: product.specifications
                  ? JSON.stringify(product.specifications)
                  : null,
                // Only update price if we have a new price, otherwise keep existing
                unitPrice: product.price !== undefined ? product.price : existing.unitPrice,
                imageUrl: product.imageUrl || existing.imageUrl, // Preserve old image if new scrape has none
                sourceUrl: product.sourceUrl || existing.sourceUrl,
                dataSheetUrl: product.dataSheetUrl || null,
                inStock: product.inStock !== false,
                lastScrapedAt: new Date(),
              },
            }),
          );

          const updatedEquipment = await Promise.all(updatePromises);
          savedEquipment.push(...updatedEquipment);
          logger.info({ count: updatedEquipment.length }, "Parallel updated existing equipment");
        }

        // Step 6: Batch create price snapshots
        if (savedEquipment.length > 0) {
          await prisma.priceSnapshot.createMany({
            data: savedEquipment.map((equipment) => ({
              equipmentId: equipment.id,
              price: equipment.unitPrice,
              currency: "USD",
            })),
          });
          logger.info(
            { count: savedEquipment.length },
            "Batch created price snapshots",
          );
        }
      }

      logger.info(
        {
          equipmentSaved: savedEquipment.length,
          total: scrapedProducts.length,
        },
        "Equipment saving completed",
      );

      // Create scrape history record
      try {
        await prisma.scrapeHistory.create({
          data: {
            distributorId: savedDistributor.id,
            url,
            status:
              savedEquipment.length > 0
                ? "success"
                : scrapedProducts.length > 0
                  ? "partial"
                  : "failed",
            itemsFound: scrapedProducts.length,
            itemsSaved: savedEquipment.length,
            metadata: JSON.stringify({
              pagesVisited: allProductLinks.length,
              companyInfo,
            }),
          },
        });
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "Failed to save scrape history",
        );
      }
    }

    // Update CrawlJob to completed status
    if (crawlJobId) {
      try {
        // Check if crawl job still exists before updating
        const existingJob = await prisma.crawlJob.findUnique({
          where: { id: crawlJobId },
        });

        if (existingJob) {
          await prisma.crawlJob.update({
            where: { id: crawlJobId },
            data: {
              status: "completed",
              productsProcessed: scrapedProducts.length,
              productsUpdated: savedEquipment.length,
              completedAt: new Date(),
              metadata: JSON.stringify({
                totalProductLinks: allProductLinks.length,
                companyName: companyInfo.name,
              }),
            },
          });
          logger.info({ crawlJobId, status: "completed" }, "Crawl job completed");
        } else {
          logger.warn(
            { crawlJobId },
            "CrawlJob not found for update (may have been cleaned up)",
          );
        }
      } catch (updateError) {
        logger.error(
          {
            crawlJobId,
            error:
              updateError instanceof Error
                ? updateError.message
                : "Unknown error",
          },
          "Failed to update crawl job status",
        );
      }
    }

    logger.info(
      {
        productsFound: scrapedProducts.length,
        productsSaved: savedEquipment.length,
        distributorId: savedDistributor?.id,
      },
      "Scrape operation completed successfully",
    );

    // Clear heartbeat on success
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    return NextResponse.json({
      success: true,
      company: companyInfo,
      productsFound: scrapedProducts.length,
      totalProductLinks: allProductLinks.length,
      productLinks: allProductLinks,
      products: scrapedProducts,
      distributor: savedDistributor,
      equipment: savedEquipment,
      crawlJobId,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        crawlJobId,
      },
      "Scrape operation failed",
    );

    // Clear heartbeat on error
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    // Clean up browser if it was used
    try {
      await closeBrowserScraper();
    } catch (cleanupError) {
      logger.error({ cleanupError }, "Failed to clean up browser");
    }

    // Update CrawlJob to failed status
    if (crawlJobId) {
      try {
        // Check if crawl job still exists before updating
        const existingJob = await prisma.crawlJob.findUnique({
          where: { id: crawlJobId },
        });

        if (existingJob) {
          await prisma.crawlJob.update({
            where: { id: crawlJobId },
            data: {
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
              completedAt: new Date(),
            },
          });
        } else {
          logger.warn(
            { crawlJobId },
            "CrawlJob not found for failure update (may have been cleaned up)",
          );
        }
      } catch (updateError) {
        logger.error({ updateError }, "Failed to update CrawlJob status");
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape URL",
        crawlJobId,
      },
      { status: 500 },
    );
  }
}
