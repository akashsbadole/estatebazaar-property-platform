import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Adding virtual tour images to select premium properties...')

  // Add 360° tour images to premium listings (PRO/BROKER users)
  // Using Unsplash panoramic-style images (very wide aspect ratio works best)

  const updates = [
    {
      title: 'Luxury 4BHK Villa with Private Pool',
      tourImages: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2400&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=2400&q=80',
      ],
    },
    {
      title: '4BHK Penthouse with Skyline View',
      tourImages: [
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=2400&q=80',
        'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=2400&q=80',
        'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=2400&q=80',
      ],
    },
    {
      title: 'Waterfront Villa in Marine Drive',
      tourImages: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2400&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=2400&q=80',
      ],
    },
    {
      title: 'Beachside 3BHK Apartment in ECR',
      tourImages: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=2400&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=2400&q=80',
      ],
    },
    {
      title: 'Heritage Haveli 5BHK in Jaipur Old City',
      tourImages: [
        'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=2400&q=80',
        'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=2400&q=80',
      ],
    },
  ]

  for (const u of updates) {
    const property = await prisma.property.findFirst({ where: { title: u.title } })
    if (!property) {
      console.log(`  (skipped) Property not found: ${u.title}`)
      continue
    }
    await prisma.property.update({
      where: { id: property.id },
      data: { tourImages: JSON.stringify(u.tourImages) },
    })
    console.log(`  ✓ Added ${u.tourImages.length} tour images to: ${u.title}`)
  }

  console.log('Done!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
