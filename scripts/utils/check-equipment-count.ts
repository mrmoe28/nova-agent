import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEquipment() {
  try {
    // Get all distributors
    const distributors = await prisma.distributor.findMany({
      include: {
        _count: {
          select: { equipment: true }
        }
      }
    })

    console.log('\n=== Distributor Equipment Count ===\n')
    for (const dist of distributors) {
      console.log(`${dist.name}: ${dist._count.equipment} equipment items`)
    }

    // Get SignatureSolar specifically
    const signatureSolar = await prisma.distributor.findFirst({
      where: {
        name: {
          contains: 'Signature',
          mode: 'insensitive'
        }
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    })

    if (signatureSolar) {
      console.log(`\n=== SignatureSolar Details ===`)
      console.log(`ID: ${signatureSolar.id}`)
      console.log(`Total Equipment: ${signatureSolar.equipment.length}`)
      console.log(`Equipment with images: ${signatureSolar.equipment.filter(e => e.imageUrl).length}`)
      console.log(`\nFirst 5 equipment items:`)
      signatureSolar.equipment.slice(0, 5).forEach((eq, i) => {
        console.log(`  ${i + 1}. ${eq.name} (Image: ${eq.imageUrl ? '✓' : '✗'})`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEquipment()
