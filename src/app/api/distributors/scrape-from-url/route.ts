import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeCompanyInfo, scrapeMultipleProducts, detectCategory, deepCrawlForProducts } from '@/lib/scraper'
import { createLogger, logOperation } from '@/lib/logger'

const logger = createLogger('scrape-api')

/**
 * POST /api/distributors/scrape-from-url
 * Scrape company information and products from a distributor's website
 * Optionally save to database
 */
export async function POST(request: NextRequest) {
  let crawlJobId: string | null = null

  try {
    const body = await request.json()
    const { url, saveToDatabase, scrapeProducts, maxProducts = 500, distributorId } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    logger.info({ url, saveToDatabase, scrapeProducts, maxProducts }, 'Starting scrape job')

    // Create a CrawlJob record to track this scraping operation
    const crawlJob = await prisma.crawlJob.create({
      data: {
        type: scrapeProducts ? 'full' : 'distributor',
        status: 'running',
        targetUrl: url,
        distributorId: distributorId || null,
        startedAt: new Date(),
      },
    })
    crawlJobId = crawlJob.id
    logger.info({ crawlJobId }, 'Created crawl job')

    // Step 1: Scrape company information
    const companyInfo = await logOperation(
      logger,
      'scrape-company-info',
      () => scrapeCompanyInfo(url, {
        rateLimit: 1500,
        timeout: 30000,
      }),
      { url }
    )

    logger.info({ companyName: companyInfo.name }, 'Found company')

    // Step 2: Deep crawl to find ALL product links across multiple pages
    let allProductLinks: string[] = []
    if (scrapeProducts) {
      logger.info({ url }, 'Starting deep crawl for products')

      const crawlResult = await logOperation(
        logger,
        'deep-crawl',
        () => deepCrawlForProducts(url, {
          maxPages: 50,  // Crawl up to 50 pages (increased for better coverage)
          maxDepth: 4,   // Go 4 levels deep (increased for nested categories)
          config: {
            rateLimit: 1000, // Reduced to 1 second for faster crawling
            timeout: 30000,
          },
        }),
        { url, maxPages: 50, maxDepth: 4 }
      )

      allProductLinks = crawlResult.productLinks
      logger.info(
        {
          productLinks: allProductLinks.length,
          pagesVisited: crawlResult.pagesVisited.length,
          catalogPages: crawlResult.catalogPages.length
        },
        'Deep crawl completed'
      )
    }

    // Step 3: Scrape products (limit to maxProducts if specified)
    let scrapedProducts: Awaited<ReturnType<typeof scrapeMultipleProducts>> = []
    if (scrapeProducts && allProductLinks.length > 0) {
      const productUrls = allProductLinks.slice(0, maxProducts)
      logger.info({ productsToScrape: productUrls.length }, 'Starting product scraping')

      scrapedProducts = await logOperation(
        logger,
        'scrape-products',
        () => scrapeMultipleProducts(productUrls, {
          rateLimit: 1500,
          timeout: 30000,
        }),
        { count: productUrls.length }
      )

      logger.info({ productsScraped: scrapedProducts.length }, 'Product scraping completed')
    }

    // Step 4: Optionally save to database
    let savedDistributor = null
    const savedEquipment = []

    if (saveToDatabase) {
      // Create or update distributor
      if (distributorId) {
        // Update existing distributor - only include fields that have values
        const updateData: {
          name?: string
          contactName?: string
          email?: string
          phone?: string
          website?: string
          address?: string
          notes?: string
          logoUrl?: string
          lastScrapedAt: Date
        } = {
          lastScrapedAt: new Date(),
        }

        if (companyInfo.name) updateData.name = companyInfo.name
        if (companyInfo.contactName) updateData.contactName = companyInfo.contactName
        if (companyInfo.email) updateData.email = companyInfo.email
        if (companyInfo.phone) updateData.phone = companyInfo.phone
        if (companyInfo.website || url) updateData.website = companyInfo.website || url
        if (companyInfo.address) updateData.address = companyInfo.address
        if (companyInfo.description) updateData.notes = companyInfo.description
        if (companyInfo.logoUrl) updateData.logoUrl = companyInfo.logoUrl

        savedDistributor = await prisma.distributor.update({
          where: { id: distributorId },
          data: updateData,
        })
        logger.info(
          { distributorId: savedDistributor.id, name: savedDistributor.name },
          'Updated distributor'
        )
      } else {
        // Create new distributor
        savedDistributor = await prisma.distributor.create({
          data: {
            name: companyInfo.name || 'Unknown Distributor',
            contactName: companyInfo.contactName || null,
            email: companyInfo.email || null,
            phone: companyInfo.phone || null,
            website: companyInfo.website || url,
            address: companyInfo.address || null,
            notes: companyInfo.description || 'Auto-scraped from website',
            logoUrl: companyInfo.logoUrl || null,
            lastScrapedAt: new Date(),
          },
        })
        logger.info(
          { distributorId: savedDistributor.id, name: savedDistributor.name },
          'Created new distributor'
        )
      }

      // Save products with price snapshots
      for (const product of scrapedProducts) {
        if (!product.name || !product.price) {
          logger.debug({ product }, 'Skipping product with missing name or price')
          continue
        }

        try {
          const category = detectCategory(product)

          const equipment = await prisma.equipment.create({
            data: {
              distributorId: savedDistributor.id,
              category,
              name: product.name,
              manufacturer: product.manufacturer || null,
              modelNumber: product.modelNumber || product.name.substring(0, 50),
              description: product.description || null,
              specifications: product.specifications ? JSON.stringify(product.specifications) : null,
              unitPrice: product.price,
              imageUrl: product.imageUrl || null,
              dataSheetUrl: product.dataSheetUrl || null,
              inStock: product.inStock !== false,
              lastScrapedAt: new Date(),
            },
          })

          // Create price snapshot for tracking price history
          await prisma.priceSnapshot.create({
            data: {
              equipmentId: equipment.id,
              price: product.price,
              currency: 'USD',
            },
          })

          savedEquipment.push(equipment)
          logger.debug({ equipmentId: equipment.id, name: equipment.name }, 'Saved equipment with price snapshot')
        } catch (error) {
          logger.error(
            {
              productName: product.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            'Failed to save equipment'
          )
        }
      }

      logger.info({ equipmentSaved: savedEquipment.length, total: scrapedProducts.length }, 'Equipment saving completed')

      // Create scrape history record
      try {
        await prisma.scrapeHistory.create({
          data: {
            distributorId: savedDistributor.id,
            url,
            status: savedEquipment.length > 0 ? 'success' : scrapedProducts.length > 0 ? 'partial' : 'failed',
            itemsFound: scrapedProducts.length,
            itemsSaved: savedEquipment.length,
            metadata: JSON.stringify({
              pagesVisited: allProductLinks.length,
              companyInfo,
            }),
          },
        })
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to save scrape history'
        )
      }
    }

    // Update CrawlJob to completed status
    if (crawlJobId) {
      await prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          status: 'completed',
          productsProcessed: scrapedProducts.length,
          productsUpdated: savedEquipment.length,
          completedAt: new Date(),
          metadata: JSON.stringify({
            totalProductLinks: allProductLinks.length,
            companyName: companyInfo.name,
          }),
        },
      })
      logger.info({ crawlJobId, status: 'completed' }, 'Crawl job completed')
    }

    logger.info(
      {
        productsFound: scrapedProducts.length,
        productsSaved: savedEquipment.length,
        distributorId: savedDistributor?.id
      },
      'Scrape operation completed successfully'
    )

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
    })
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        crawlJobId
      },
      'Scrape operation failed'
    )

    // Update CrawlJob to failed status
    if (crawlJobId) {
      try {
        await prisma.crawlJob.update({
          where: { id: crawlJobId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        })
      } catch (updateError) {
        logger.error({ updateError }, 'Failed to update CrawlJob status')
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape URL',
        crawlJobId,
      },
      { status: 500 }
    )
  }
}
