import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding price history for existing properties...')

  const properties = await prisma.property.findMany({
    select: { id: true, price: true, createdAt: true },
    take: 30,
  })

  let created = 0
  for (const p of properties) {
    // Check if price history already exists
    const existing = await prisma.priceHistory.count({ where: { propertyId: p.id } })
    if (existing > 0) continue

    // Create an initial price history entry (original listing price)
    // And simulate 1-2 price changes over time
    const originalPrice = Math.round(p.price * (0.95 + Math.random() * 0.1)) // ±5% of current
    const daysAgo = Math.floor((Date.now() - p.createdAt.getTime()) / 86400000)

    // Initial listing
    await prisma.priceHistory.create({
      data: {
        propertyId: p.id,
        oldPrice: 0,
        newPrice: originalPrice,
        changedAt: p.createdAt,
      },
    })

    // If the property is old enough, add a price change
    if (daysAgo > 7 && Math.random() > 0.5) {
      const changeDate = new Date(p.createdAt)
      changeDate.setDate(changeDate.getDate() + Math.floor(daysAgo / 2))
      await prisma.priceHistory.create({
        data: {
          propertyId: p.id,
          oldPrice: originalPrice,
          newPrice: p.price,
          changedAt: changeDate,
        },
      })
    } else if (originalPrice !== p.price) {
      // If no simulated change but prices differ, record the current as a change
      await prisma.priceHistory.create({
        data: {
          propertyId: p.id,
          oldPrice: originalPrice,
          newPrice: p.price,
          changedAt: new Date(p.createdAt.getTime() + 86400000 * 3), // 3 days after listing
        },
      })
    }

    created++
  }

  console.log(`Created price history for ${created} properties`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
