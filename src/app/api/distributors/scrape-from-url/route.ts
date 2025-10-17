import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeCompanyInfo, scrapeMultipleProducts, detectCategory } from '@/lib/scraper'

/**
 * POST /api/distributors/scrape-from-url
 * Scrape company information and products from a distributor's website
 * Optionally save to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, saveToDatabase, scrapeProducts, maxProducts = 10 } = body

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
    console.log(`Found ${companyInfo.productLinks?.length || 0} potential product links`)

    // Step 2: Optionally scrape products
    let scrapedProducts: Awaited<ReturnType<typeof scrapeMultipleProducts>> = []
    if (scrapeProducts && companyInfo.productLinks && companyInfo.productLinks.length > 0) {
      const productUrls = companyInfo.productLinks.slice(0, maxProducts)
      console.log(`Scraping ${productUrls.length} product pages...`)

      scrapedProducts = await scrapeMultipleProducts(productUrls, {
        rateLimit: 1500,
        timeout: 30000,
      })

      console.log(`Scraped ${scrapedProducts.length} products`)
    }

    // Step 3: Optionally save to database
    let savedDistributor = null
    const savedEquipment = []

    if (saveToDatabase) {
      // Create distributor
      savedDistributor = await prisma.distributor.create({
        data: {
          name: companyInfo.name || 'Unknown Distributor',
          contactName: companyInfo.contactName || null,
          email: companyInfo.email || null,
          phone: companyInfo.phone || null,
          website: companyInfo.website || url,
          address: companyInfo.address || null,
          notes: companyInfo.description || 'Auto-scraped from website',
        },
      })

      console.log(`Created distributor: ${savedDistributor.name} (${savedDistributor.id})`)

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
            },
          })

          savedEquipment.push(equipment)
          console.log(`Saved equipment: ${equipment.name}`)
        } catch (error) {
          console.error('Error saving equipment:', error)
        }
      }

      console.log(`Saved ${savedEquipment.length} equipment items`)
    }

    return NextResponse.json({
      success: true,
      company: companyInfo,
      productsFound: scrapedProducts.length,
      productLinks: companyInfo.productLinks,
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
