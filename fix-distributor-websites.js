const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDistributorWebsites() {
  try {
    console.log('🔧 Fixing distributor websites...\n');
    
    // Update all distributors with example.com URLs to have null websites
    const result = await prisma.distributor.updateMany({
      where: {
        website: {
          contains: 'example.com'
        }
      },
      data: {
        website: null
      }
    });
    
    console.log(`✅ Updated ${result.count} distributors`);
    console.log('   Set website to null to prevent scraping errors\n');
    
    // Show current distributors
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        website: true,
        isActive: true
      }
    });
    
    console.log('Current distributors:');
    distributors.forEach(dist => {
      console.log(`  - ${dist.name}`);
      console.log(`    Website: ${dist.website || '(none)'}`);
      console.log(`    Active: ${dist.isActive}`);
      console.log();
    });
    
    console.log('✨ Done! Scraping will now skip distributors without websites.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDistributorWebsites();



