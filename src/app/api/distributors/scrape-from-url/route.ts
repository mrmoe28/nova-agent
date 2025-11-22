import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeCompanyInfo,
  scrapeMultipleProducts,
  detectCategory,
  deepCrawlForProducts,
  isProductPageUrl,
  scrapeShopifyCollectionPage,
} from "@/lib/scraper";
import {
  getBrowserScraper,
  closeBrowserScraper,
} from "@/lib/browser-scraper-bql";
import { getAIScraper } from "@/lib/ai-agent-scraper";
import { createLogger, logOperation } from "@/lib/logger";
import { clearAllCaches } from "@/lib/cache";

const logger = createLogger("scrape-api");

// Allow up to 60 seconds for scraping operations (Pro tier)
// Hobby tier is limited to 10 seconds
// Note: For production, we use conservative limits to avoid timeouts
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
  const startTime = Date.now();
  const SAFE_TIMEOUT_MS = 50000; // Leave 10 seconds buffer before 60s limit

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
      // Production-safe defaults: reduced to fit within 60s timeout
      maxPages = 50, // Maximum pages to crawl (default: 50 for production, can be increased)
      maxDepth = 2, // Maximum link depth to follow (default: 2 for production, can be increased)
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

    // Clear caches when rescraping to ensure fresh data
    // This prevents stale cached product data from being returned
    if (distributorId) {
      logger.info("Clearing product and HTML caches for fresh scrape");
      clearAllCaches();
    }

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
        // Check if this is a Shopify collection page - extract products directly
        const isShopifyCollection = url.includes("/collections/") || url.includes("shopify");
        if (isShopifyCollection) {
          logger.info(
            { url },
            "Detected Shopify collection page - extracting products directly",
          );
          
          const collectionProducts = await logOperation(
            logger,
            "shopify-collection-scrape",
            () =>
              scrapeShopifyCollectionPage(url, {
                rateLimit: 200,
                timeout: 10000,
                respectRobotsTxt: true,
                maxRetries: 1,
              }),
            { url },
          );

          if (collectionProducts.length > 0) {
            // Use products extracted from collection page
            scrapedProducts = collectionProducts;
            logger.info(
              { productsFound: collectionProducts.length },
              "Extracted products directly from Shopify collection page",
            );
          } else {
            // Fall back to deep crawl if direct extraction failed
            logger.info(
              { url },
              "Direct extraction failed, falling back to deep crawl",
            );
          }
        }

        // If we didn't get products from collection page, do deep crawl
        if (scrapedProducts.length === 0) {
          logger.info(
            { url },
            "Detected category page - starting deep crawl for products",
          );

          // Add timeout protection: start timer to ensure we don't exceed function limit
          const startTime = Date.now();
          const SAFE_TIMEOUT_MS = 50000; // Leave 10 seconds buffer before 60s limit

          const crawlResult = await logOperation(
            logger,
            "deep-crawl",
            async () => {
              const result = await deepCrawlForProducts(url, {
                maxPages, // Configurable: Crawl up to N pages to find all products
                maxDepth, // Configurable: Follow subcategories and sub-sublinks up to N levels deep
                concurrency: 5, // Process 5 pages in parallel for faster crawling
                config: {
                  rateLimit: 200, // Fast rate limit
                  timeout: 5000, // 5 second timeout
                  respectRobotsTxt: true,
                  maxRetries: 1,
                },
              });

              // Check if we're running out of time
              const elapsed = Date.now() - startTime;
              if (elapsed > SAFE_TIMEOUT_MS) {
                logger.warn(
                  { elapsed, productLinks: result.productLinks.length },
                  "Deep crawl approaching timeout limit, stopping early",
                );
              }

              return result;
            },
            { url, maxPages, maxDepth },
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
        // Check if BROWSERLESS_TOKEN is configured
        if (!process.env.BROWSERLESS_TOKEN) {
          logger.warn(
            "BROWSERLESS_TOKEN not configured, falling back to standard scraping",
          );
          // Fall back to standard scraping
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
        } else {
          try {
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
          } catch (error: unknown) {
            logger.error(
              { error: error instanceof Error ? error.message : String(error) },
              "Browser scraper failed, falling back to standard scraping",
            );
            // Fall back to standard scraping
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
        }
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
    let newProductsCount = 0;
    let updatedProductsCount = 0;

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

        // Step 2: Batch check for existing equipment using multiple strategies
        // Get all existing equipment for this distributor to check against
        const allExistingEquipment = await prisma.equipment.findMany({
          where: {
            distributorId: distributor.id,
          },
        });

        // Create lookup maps for fast matching
        const sourceUrlMap = new Map<string, typeof allExistingEquipment[0]>();
        const nameModelMap = new Map<string, typeof allExistingEquipment[0]>();
        const nameManufacturerMap = new Map<string, typeof allExistingEquipment[0]>();

        for (const eq of allExistingEquipment) {
          // Index by sourceUrl (most reliable)
          if (eq.sourceUrl) {
            sourceUrlMap.set(eq.sourceUrl, eq);
          }

          // Index by name + modelNumber (for products without sourceUrl)
          const normalizedName = eq.name?.toLowerCase().trim() || "";
          const normalizedModel = eq.modelNumber?.toLowerCase().trim() || "";
          const normalizedManufacturer = eq.manufacturer?.toLowerCase().trim() || "";

          if (normalizedName && normalizedModel) {
            const key = `${normalizedName}::${normalizedModel}`;
            if (!nameModelMap.has(key)) {
              nameModelMap.set(key, eq);
            }
          }

          // Index by name + manufacturer (fallback)
          if (normalizedName && normalizedManufacturer) {
            const key = `${normalizedName}::${normalizedManufacturer}`;
            if (!nameManufacturerMap.has(key)) {
              nameManufacturerMap.set(key, eq);
            }
          }
        }

        logger.debug(
          { 
            totalExisting: allExistingEquipment.length,
            indexedBySourceUrl: sourceUrlMap.size,
            indexedByNameModel: nameModelMap.size,
            indexedByNameManufacturer: nameManufacturerMap.size,
          },
          "Indexed existing equipment for matching",
        );

        // Step 3: Separate into new and existing products
        const toCreate: typeof validProducts = [];
        const toUpdate: Array<{ product: typeof validProducts[0]; existing: typeof allExistingEquipment[0] }> = [];

        for (const product of validProducts) {
          let existing: typeof allExistingEquipment[0] | null = null;

          // Strategy 1: Match by sourceUrl (most reliable)
          if (product.sourceUrl) {
            existing = sourceUrlMap.get(product.sourceUrl) || null;
          }

          // Strategy 2: If no sourceUrl match, try name + modelNumber
          if (!existing) {
            const normalizedName = product.name?.toLowerCase().trim() || "";
            const normalizedModel = product.modelNumber?.toLowerCase().trim() || "";
            if (normalizedName && normalizedModel) {
              const key = `${normalizedName}::${normalizedModel}`;
              existing = nameModelMap.get(key) || null;
            }
          }

          // Strategy 3: Fall back to name + manufacturer
          if (!existing) {
            const normalizedName = product.name?.toLowerCase().trim() || "";
            const normalizedManufacturer = product.manufacturer?.toLowerCase().trim() || "";
            if (normalizedName && normalizedManufacturer) {
              const key = `${normalizedName}::${normalizedManufacturer}`;
              existing = nameManufacturerMap.get(key) || null;
            }
          }

          if (existing) {
            toUpdate.push({ product, existing });
          } else {
            toCreate.push(product);
          }
        }

        // Store counts for logging outside the block
        newProductsCount = toCreate.length;
        updatedProductsCount = toUpdate.length;

        logger.info(
          { toCreate: toCreate.length, toUpdate: toUpdate.length },
          "Separated products for batch processing",
        );

        // Log detailed breakdown for debugging
        if (toCreate.length === 0 && toUpdate.length > 0) {
          logger.info(
            { 
              updated: toUpdate.length,
              totalScraped: validProducts.length,
              message: "All scraped products already exist - updating existing records (count won't increase). This could mean: 1) No new products were added to the website, 2) The scraper is only finding previously scraped products, or 3) New products don't have sourceUrls and are matching existing products by name/model."
            },
            "All products already exist - updating existing records (count won't increase)",
          );
        }

        // Log sample of new products for debugging
        if (toCreate.length > 0) {
          logger.info(
            { 
              newProductsCount: toCreate.length,
              sampleNewProducts: toCreate.slice(0, 5).map(p => ({
                name: p.name,
                sourceUrl: p.sourceUrl,
                modelNumber: p.modelNumber,
                manufacturer: p.manufacturer,
              }))
            },
            "Found new products to create",
          );
        }

        // Log sample of updated products for debugging
        if (toUpdate.length > 0) {
          logger.info(
            { 
              updatedProductsCount: toUpdate.length,
              sampleUpdatedProducts: toUpdate.slice(0, 5).map(({ product, existing }) => ({
                name: product.name,
                sourceUrl: product.sourceUrl || existing.sourceUrl,
                matchedBy: product.sourceUrl ? 'sourceUrl' : (product.modelNumber ? 'name+model' : 'name+manufacturer'),
              }))
            },
            "Found existing products to update",
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
        newProductsCreated: newProductsCount,
        existingProductsUpdated: updatedProductsCount,
        distributorId: savedDistributor?.id,
        totalProductLinks: allProductLinks.length,
        message: newProductsCount === 0 && updatedProductsCount > 0
          ? "No new products found - all scraped products already exist in database. This could mean: 1) No new products were added to the website, 2) The scraper is only finding previously scraped products, or 3) New products are matching existing ones by name/model."
          : newProductsCount > 0
            ? `${newProductsCount} new products were created successfully.`
            : "All scraped products were saved successfully.",
      },
      "Scrape operation completed successfully",
    );

    // Clear heartbeat on success
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    // Check if we're close to timeout before returning
    const elapsed = Date.now() - startTime;
    if (elapsed > SAFE_TIMEOUT_MS) {
      logger.warn(
        { elapsed },
        "Scraping operation approaching timeout, returning partial results",
      );
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
      elapsedMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    // Check if this is a timeout error
    const isTimeout = 
      error instanceof Error && 
      (error.message.includes("timeout") || 
       error.message.includes("504") ||
       elapsed > SAFE_TIMEOUT_MS);

    // Check if this is a BROWSERLESS_TOKEN error
    const isBrowserlessError = 
      error instanceof Error && 
      error.message.includes("BROWSERLESS_TOKEN");

    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        crawlJobId,
        elapsed,
        isTimeout,
        isBrowserlessError,
        hasToken: !!process.env.BROWSERLESS_TOKEN,
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
              errorMessage: isTimeout
                ? "Operation timed out - try reducing maxPages or maxDepth, or use the scheduled cron job for comprehensive scraping."
                : error instanceof Error ? error.message : "Unknown error",
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

    // Return proper JSON error response (not HTML)
    let errorMessage = error instanceof Error ? error.message : "Failed to scrape URL";
    
    if (isBrowserlessError) {
      errorMessage = "BROWSERLESS_TOKEN not configured. Please set your Browserless API token in Vercel environment variables. Go to: Project Settings → Environment Variables → Add BROWSERLESS_TOKEN. Make sure it's set for Production, Preview, and Development environments.";
    } else if (isTimeout) {
      errorMessage = "Scraping operation timed out. Try reducing maxPages or maxDepth, or use the scheduled cron job for comprehensive scraping.";
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        crawlJobId,
        elapsedMs: elapsed,
        isTimeout,
        isBrowserlessError,
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
