const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleDistributors = [
  {
    name: "SolarPro Supply",
    website: "https://example.com/solarpro",
    email: "sales@solarpro.example.com",
    phone: "1-800-SOLAR-01",
    isActive: true,
  },
  {
    name: "Green Energy Wholesale",
    website: "https://example.com/greenenergy",
    email: "contact@greenenergy.example.com",
    phone: "1-800-GREEN-99",
    isActive: true,
  },
  {
    name: "Battery & Solar Direct",
    website: "https://example.com/batterydirect",
    email: "info@batterydirect.example.com",
    phone: "1-888-BATTERY",
    isActive: true,
  },
  {
    name: "Renewable Equipment Co",
    website: "https://example.com/renewableequip",
    email: "sales@renewableequip.example.com",
    phone: "1-877-RENEW-01",
    isActive: true,
  },
];

async function seedDistributors() {
  try {
    console.log('🌱 Seeding distributors...\n');
    
    for (const dist of sampleDistributors) {
      const created = await prisma.distributor.create({
        data: dist
      });
      console.log(`✅ Created: ${created.name} (ID: ${created.id})`);
    }
    
    console.log(`\n✨ Successfully seeded ${sampleDistributors.length} distributors!\n`);
    
    // Show summary
    const total = await prisma.distributor.count();
    console.log(`Total distributors in database: ${total}\n`);
    
  } catch (error) {
    console.error('❌ Error seeding distributors:', error.message);
    if (error.code === 'P2002') {
      console.log('\n⚠️  Some distributors already exist. This is OK.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedDistributors();

