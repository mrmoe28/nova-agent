const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBOM() {
  try {
    // Get latest project
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        clientName: true,
        status: true,
        updatedAt: true,
      },
    });

    console.log('\n=== Recent Projects ===');
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.clientName} (${p.id}) - Status: ${p.status} - Updated: ${p.updatedAt}`);
    });

    if (projects.length > 0) {
      const latestProject = projects[0];
      console.log(`\n=== BOM Items for: ${latestProject.clientName} ===`);

      const bomItems = await prisma.bOMItem.findMany({
        where: { projectId: latestProject.id },
        select: {
          id: true,
          category: true,
          itemName: true,
          manufacturer: true,
          modelNumber: true,
          quantity: true,
          unitPriceUsd: true,
          totalPriceUsd: true,
          imageUrl: true,
          notes: true,
        },
        orderBy: { category: 'asc' },
      });

      if (bomItems.length === 0) {
        console.log('No BOM items found for this project.');
      } else {
        bomItems.forEach((item, i) => {
          console.log(`\n${i + 1}. [${item.category}] ${item.itemName}`);
          console.log(`   Manufacturer: ${item.manufacturer || 'N/A'}`);
          console.log(`   Model: ${item.modelNumber}`);
          console.log(`   Qty: ${item.quantity} x $${item.unitPriceUsd} = $${item.totalPriceUsd}`);
          console.log(`   Image: ${item.imageUrl || 'No image'}`);
          if (item.notes) console.log(`   Notes: ${item.notes}`);
        });

        const total = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);
        console.log(`\nTotal Cost: $${total.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBOM();
