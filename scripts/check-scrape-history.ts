import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkScrapeHistory() {
  try {
    // Get recent crawl jobs
    const crawlJobs = await prisma.crawlJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: {
        distributor: {
          select: { name: true }
        }
      }
    })

    console.log('\n=== Recent Crawl Jobs ===\n')
    crawlJobs.forEach((job, i) => {
      console.log(`${i + 1}. ${job.distributor?.name || 'Unknown'}`)
      console.log(`   Status: ${job.status}`)
      console.log(`   Products Processed: ${job.productsProcessed || 0}`)
      console.log(`   Products Updated: ${job.productsUpdated || 0}`)
      console.log(`   Started: ${job.startedAt.toLocaleString()}`)
      if (job.errorMessage) {
        console.log(`   Error: ${job.errorMessage}`)
      }
      if (job.metadata) {
        console.log(`   Metadata: ${JSON.stringify(job.metadata)}`)
      }
      console.log('')
    })

    // Get all SignatureSolar distributors
    const signatureSolars = await prisma.distributor.findMany({
      where: {
        name: {
          contains: 'Signature',
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: { equipment: true }
        }
      }
    })

    console.log('=== All SignatureSolar Distributors ===\n')
    signatureSolars.forEach((dist, i) => {
      console.log(`${i + 1}. ${dist.name}`)
      console.log(`   ID: ${dist.id}`)
      console.log(`   Equipment Count: ${dist._count.equipment}`)
      console.log(`   Website: ${dist.website}`)
      console.log(`   Last Scraped: ${dist.lastScrapedAt?.toLocaleString() || 'Never'}`)
      console.log('')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkScrapeHistory()
