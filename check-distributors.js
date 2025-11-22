const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDistributors() {
  try {
    const distributors = await prisma.distributor.findMany({
      include: {
        _count: {
          select: { equipment: true }
        }
      }
    });
    
    console.log(`\nFound ${distributors.length} distributors in database:\n`);
    
    if (distributors.length === 0) {
      console.log('❌ No distributors found! This is why the dropdown is empty.');
      console.log('\nYou need to add distributors to use the system.');
      console.log('Options:');
      console.log('1. Use the bulk import feature');
      console.log('2. Add distributors manually through the UI');
      console.log('3. Run a seed script\n');
    } else {
      distributors.forEach(dist => {
        console.log(`- ${dist.name}`);
        console.log(`  ID: ${dist.id}`);
        console.log(`  Equipment count: ${dist._count.equipment}`);
        console.log(`  Active: ${dist.isActive}`);
        console.log();
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDistributors();

