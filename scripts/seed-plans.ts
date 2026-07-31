import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEFAULT_PLANS } from '../src/lib/plans'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding subscription plans...')

  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code: plan.code } })
    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { code: plan.code },
        data: {
          name: plan.name,
          tagline: plan.tagline,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: JSON.stringify(plan.features),
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      })
      console.log(`Updated plan: ${plan.code}`)
    } else {
      await prisma.subscriptionPlan.create({
        data: {
          code: plan.code,
          name: plan.name,
          tagline: plan.tagline,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: JSON.stringify(plan.features),
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      })
      console.log(`Created plan: ${plan.code}`)
    }
  }

  // Upgrade one demo user (Priya) to PRO tier so we can demo the verified listing feature
  const priya = await prisma.user.findUnique({ where: { email: 'priya@example.com' } })
  if (priya) {
    await prisma.user.update({ where: { id: priya.id }, data: { subscriptionTier: 'PRO' } })
    console.log(`Upgraded Priya to PRO tier`)

    // Mark one of Priya's listings as Verified Listing (premium badge demo)
    const priyaProperty = await prisma.property.findFirst({ where: { ownerId: priya.id } })
    if (priyaProperty) {
      await prisma.property.update({
        where: { id: priyaProperty.id },
        data: { isVerifiedListing: true },
      })
      console.log(`Marked "${priyaProperty.title}" as Verified Listing`)
    }
  }

  console.log('Done!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
