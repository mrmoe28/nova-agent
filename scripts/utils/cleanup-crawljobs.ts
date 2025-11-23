import { prisma } from './src/lib/prisma'

async function main() {
  // Delete all CrawlJob records
  const result = await prisma.crawlJob.deleteMany({})
  
  console.log(`Deleted ${result.count} CrawlJob records`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
