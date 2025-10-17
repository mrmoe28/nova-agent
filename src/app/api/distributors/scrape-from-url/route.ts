import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeCompanyInfo, scrapeMultipleProducts, detectCategory, deepCrawlForProducts } from '@/lib/scraper'

/**
 * POST /api/distributors/scrape-from-url
 * Scrape company information and products from a distributor's website
 * Optionally save to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, saveToDatabase, scrapeProducts, maxProducts = 500, distributorId } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    console.log(`Scraping distributor from URL: ${url}`)

    // Step 1: Scrape company information
    const companyInfo = await scrapeCompanyInfo(url, {
      rateLimit: 1500,
      timeout: 30000,
    })

    console.log(`Found company: ${companyInfo.name}`)

    // Step 2: Deep crawl to find ALL product links across multiple pages
    let allProductLinks: string[] = []
    if (scrapeProducts) {
      console.log('Starting deep crawl for products...')
      const crawlResult = await deepCrawlForProducts(url, {
        maxPages: 20,  // Crawl up to 20 pages
        maxDepth: 3,   // Go 3 levels deep
        config: {
          rateLimit: 1500,
          timeout: 30000,
        },
      })

      allProductLinks = crawlResult.productLinks
      console.log(`Deep crawl found ${allProductLinks.length} product links across ${crawlResult.pagesVisited.length} pages`)
      console.log(`Found ${crawlResult.catalogPages.length} catalog pages`)
    }

    // Step 3: Scrape products (limit to maxProducts if specified)
    let scrapedProducts: Awaited<ReturnType<typeof scrapeMultipleProducts>> = []
    if (scrapeProducts && allProductLinks.length > 0) {
      const productUrls = allProductLinks.slice(0, maxProducts)
      console.log(`Scraping ${productUrls.length} product pages...`)

      scrapedProducts = await scrapeMultipleProducts(productUrls, {
        rateLimit: 1500,
        timeout: 30000,
      })

      console.log(`Scraped ${scrapedProducts.length} products`)
    }

    // Step 4: Optionally save to database
    let savedDistributor = null
    const savedEquipment = []

    if (saveToDatabase) {
      // Create or update distributor
      if (distributorId) {
        // Update existing distributor
        savedDistributor = await prisma.distributor.update({
          where: { id: distributorId },
          data: {
            name: companyInfo.name || undefined,
            contactName: companyInfo.contactName || undefined,
            email: companyInfo.email || undefined,
            phone: companyInfo.phone || undefined,
            website: companyInfo.website || url,
            address: companyInfo.address || undefined,
            notes: companyInfo.description || undefined,
            logoUrl: companyInfo.logoUrl || undefined,
            lastScrapedAt: new Date(),
          },
        })
        console.log(`Updated distributor: ${savedDistributor.name} (${savedDistributor.id})`)
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
        console.log(`Created distributor: ${savedDistributor.name} (${savedDistributor.id})`)
      }

      // Save products
      for (const product of scrapedProducts) {
        if (!product.name || !product.price) {
          console.log('Skipping product with missing name or price')
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

          savedEquipment.push(equipment)
          console.log(`Saved equipment: ${equipment.name}`)
        } catch (error) {
          console.error('Error saving equipment:', error)
        }
      }

      console.log(`Saved ${savedEquipment.length} equipment items`)

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
        console.error('Error saving scrape history:', error)
      }
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
    })
  } catch (error) {
    console.error('Scrape from URL error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape URL',
      },
      { status: 500 }
    )
  }
}
