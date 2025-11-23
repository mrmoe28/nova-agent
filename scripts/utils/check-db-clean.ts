import { prisma } from './src/lib/prisma'

async function main() {
  console.log('=== CHECKLIST ITEM 5: Database Status ===\n')
  
  const distributors = await prisma.distributor.count()
  const equipment = await prisma.equipment.count()
  const crawlJobs = await prisma.crawlJob.count()
  const scrapeHistory = await prisma.scrapeHistory.count()
  
  console.log(`Distributors: ${distributors}`)
  console.log(`Equipment: ${equipment}`)
  console.log(`CrawlJobs: ${crawlJobs}`)
  console.log(`ScrapeHistory: ${scrapeHistory}`)
  
  if (distributors === 0 && equipment === 0 && crawlJobs === 0) {
    console.log('\n✅ Database is clean and ready for testing')
  } else {
    console.log('\n⚠️  Database has existing records - will clean up')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
