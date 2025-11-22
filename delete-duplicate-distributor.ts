import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteDuplicateDistributor() {
  try {
    const emptyDistributorId = 'cmgv7kfka0006lb040rbqx7dc' // The one with 0 equipment

    console.log('\n=== Deleting Empty Duplicate Distributor ===\n')

    // First, check if it truly has 0 equipment
    const distributor = await prisma.distributor.findUnique({
      where: { id: emptyDistributorId },
      include: {
        _count: {
          select: { equipment: true }
        }
      }
    })

    if (!distributor) {
      console.log('Distributor not found!')
      return
    }

    console.log(`Distributor: ${distributor.name}`)
    console.log(`Equipment Count: ${distributor._count.equipment}`)

    if (distributor._count.equipment > 0) {
      console.log('\n⚠️ WARNING: This distributor has equipment! Aborting deletion.')
      return
    }

    // Safe to delete - it has no equipment
    console.log('\n✅ Safe to delete (0 equipment)')
    console.log('Deleting distributor...\n')

    await prisma.distributor.delete({
      where: { id: emptyDistributorId }
    })

    console.log('✅ Successfully deleted empty duplicate distributor!')
    console.log('\nRemaining SignatureSolar distributors:')

    const remaining = await prisma.distributor.findMany({
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

    for (const dist of remaining) {
      console.log(`  - ${dist.name} (ID: ${dist.id}) - ${dist._count.equipment} equipment`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteDuplicateDistributor()
