import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding more demo users + properties...')

  const userPassword = await bcrypt.hash('demo1234', 10)

  // Existing users: rahul, priya, amit, sneha
  // New users (5 more, diverse locations + roles)
  const newUsers = [
    { name: 'Vikram Iyer', email: 'vikram@example.com', phone: '+919811100005' },
    { name: 'Ananya Singh', email: 'ananya@example.com', phone: '+919811100006' },
    { name: 'Karthik Nair', email: 'karthik@example.com', phone: '+919811100007' },
    { name: 'Deepika Joshi', email: 'deepika@example.com', phone: '+919811100008' },
    { name: 'Rohit Gupta', email: 'rohit@example.com', phone: '+919811100009' },
    { name: 'Meera Krishnan', email: 'meera@example.com', phone: '+919811100010' },
  ]

  const users: any[] = []
  for (const u of newUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: userPassword, isVerified: true },
    })
    users.push(user)
    console.log(`Created user: ${user.email}`)
  }

  // Make Vikram a PRO subscriber (broker-style)
  await prisma.user.update({
    where: { email: 'vikram@example.com' },
    data: { subscriptionTier: 'PRO', isVerified: true },
  })
  console.log('Vikram upgraded to PRO')

  // Categories
  const categories = await prisma.category.findMany()
  const catBySlug = Object.fromEntries(categories.map(c => [c.slug, c]))

  // New sample properties (15+ across multiple cities)
  const newProperties = [
    {
      title: 'Spacious 2BHK Apartment in Hinjewadi',
      description:
        'Modern 2BHK apartment in Hinjewadi IT Park area. Walking distance to Infosys, Wipro, and TCS offices. Modular kitchen, 2 balconies, covered parking, and 24x7 security. Society amenities include gym, swimming pool, and children\'s play area.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[0].id,
      price: 5800000, isNegotiable: true, area: 1180, furnishing: 'SEMI_FURNISHED',
      bedrooms: 2, bathrooms: 2, parking: 1,
      location: 'Hinjewadi Phase 1', city: 'Pune', state: 'Maharashtra', pincode: '411057',
      latitude: 18.5912, longitude: 73.7389, contactPhone: '+919811100005',
      images: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      ],
    },
    {
      title: '3BHK Apartment with IT Park View',
      description:
        'Premium 3BHK apartment on high floor with panoramic view of Hinjewadi IT Park. Italian marble flooring, modular kitchen with chimney, master bedroom with attached balcony. Society has clubhouse, gym, swimming pool, and indoor games.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[0].id,
      price: 8900000, isNegotiable: false, area: 1550, furnishing: 'FURNISHED',
      bedrooms: 3, bathrooms: 3, parking: 2,
      location: 'Hinjewadi Phase 2', city: 'Pune', state: 'Maharashtra', pincode: '411057',
      latitude: 18.5885, longitude: 73.7355, contactPhone: '+919811100005',
      images: [
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      ],
    },
    {
      title: 'Luxury 4BHK Villa in Kothrud',
      description:
        'Independent 4BHK villa with private garden and terrace. Premium fittings, Italian marble, modular kitchen, servant quarter, and 3 car parking. Gated community with clubhouse, swimming pool, and 24x7 security.',
      type: 'VILLA', categoryId: catBySlug['villas'].id, ownerId: users[0].id,
      price: 18500000, isNegotiable: true, area: 2800, furnishing: 'FURNISHED',
      bedrooms: 4, bathrooms: 4, parking: 3,
      location: 'Kothrud, Karve Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411038',
      latitude: 18.5074, longitude: 73.8077, contactPhone: '+919811100005',
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
      ],
    },
    {
      title: 'Beachside 3BHK Apartment in ECR',
      description:
        'Stunning beachside apartment with panoramic sea view. 3BHK with floor-to-ceiling windows, modular kitchen, and 2 balconies facing the ocean. Premium amenities include infinity pool, beach access, gym, and spa.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[1].id,
      price: 12500000, isNegotiable: false, area: 1650, furnishing: 'FURNISHED',
      bedrooms: 3, bathrooms: 3, parking: 2,
      location: 'ECR, Palavakkam', city: 'Chennai', state: 'Tamil Nadu', pincode: '600041',
      latitude: 12.9716, longitude: 80.2656, contactPhone: '+919811100006',
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200',
      ],
    },
    {
      title: 'Independent House 4BHK in Adyar',
      description:
        'Spacious 4BHK independent house in prime Adyar locality. Close to Adyar river, IIT Madras, and Besant Nagar beach. Vastu-compliant, with private garden, servant quarter, and 3 car covered parking.',
      type: 'HOUSE', categoryId: catBySlug['independent-houses'].id, ownerId: users[1].id,
      price: 32000000, isNegotiable: true, area: 3600, furnishing: 'SEMI_FURNISHED',
      bedrooms: 4, bathrooms: 5, parking: 3,
      location: 'Adyar, Gandhi Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600020',
      latitude: 13.0012, longitude: 80.2565, contactPhone: '+919811100006',
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
      ],
    },
    {
      title: 'Waterfront Villa in Marine Drive',
      description:
        'Premium 5BHK waterfront villa with private dock. Italian marble flooring, home automation, infinity pool overlooking the backwaters, landscaped garden, and 4 car parking. Truly a once-in-a-lifetime property.',
      type: 'VILLA', categoryId: catBySlug['villas'].id, ownerId: users[2].id,
      price: 45000000, isNegotiable: false, area: 4200, furnishing: 'FURNISHED',
      bedrooms: 5, bathrooms: 6, parking: 4,
      location: 'Marine Drive, Willingdon Island', city: 'Kochi', state: 'Kerala', pincode: '682009',
      latitude: 9.9312, longitude: 76.2673, contactPhone: '+919811100007',
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200',
      ],
    },
    {
      title: 'Modern 3BHK Apartment in Kakkanad',
      description:
        'Contemporary 3BHK apartment in Kakkanad, close to InfoPark and SmartCity. Modular kitchen, master bedroom with walk-in closet, 2 covered parkings. Society has clubhouse, gym, pool, and games room.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[2].id,
      price: 7200000, isNegotiable: true, area: 1450, furnishing: 'SEMI_FURNISHED',
      bedrooms: 3, bathrooms: 3, parking: 2,
      location: 'Kakkanad, InfoPark Road', city: 'Kochi', state: 'Kerala', pincode: '682030',
      latitude: 10.0200, longitude: 76.3428, contactPhone: '+919811100007',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      ],
    },
    {
      title: 'Heritage Haveli 5BHK in Jaipur Old City',
      description:
        'Beautifully restored heritage haveli with traditional Rajasthani architecture. 5BHK with courtyard, jharokhas, frescoes, and modern amenities. Walking distance to Hawa Mahal and City Palace. A rare blend of history and luxury.',
      type: 'HOUSE', categoryId: catBySlug['independent-houses'].id, ownerId: users[3].id,
      price: 38000000, isNegotiable: true, area: 5500, furnishing: 'FURNISHED',
      bedrooms: 5, bathrooms: 5, parking: 4,
      location: 'Old City, Brahmpuri', city: 'Jaipur', state: 'Rajasthan', pincode: '302002',
      latitude: 26.9239, longitude: 75.8267, contactPhone: '+919811100008',
      images: [
        'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=1200',
        'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200',
      ],
    },
    {
      title: '3BHK Builder Floor in C-Scheme',
      description:
        'Standalone builder floor in prime C-Scheme area. 3BHK with private entrance, modular kitchen, and 2 car parking. Walking distance to restaurants, cafes, and shopping. Ready to move in.',
      type: 'BUILDER_FLOOR', categoryId: catBySlug['builder-floors'].id, ownerId: users[3].id,
      price: 9500000, isNegotiable: true, area: 1650, furnishing: 'SEMI_FURNISHED',
      bedrooms: 3, bathrooms: 3, parking: 2,
      location: 'C-Scheme, Ashok Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302001',
      latitude: 26.9124, longitude: 75.7955, contactPhone: '+919811100008',
      images: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
        'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1200',
      ],
    },
    {
      title: 'Residential Plot 2000 sqft in Gomti Nagar',
      description:
        'Premium corner plot in Gomti Nagar Extension. 2000 sqft, east-facing, 30 ft wide road frontage. Approved by LDA, clear title, with underground drainage, water, and electricity connections ready.',
      type: 'PLOT', categoryId: catBySlug['residential-plots'].id, ownerId: users[4].id,
      price: 12000000, isNegotiable: true, area: 2000, furnishing: 'UNFURNISHED',
      bedrooms: 0, bathrooms: 0, parking: 0,
      location: 'Gomti Nagar Extension', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010',
      latitude: 26.8467, longitude: 81.0131, contactPhone: '+919811100009',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
      ],
    },
    {
      title: '3BHK Apartment in Hazratganj',
      description:
        'Spacious 3BHK apartment in the heart of Hazratganj. Walking distance to markets, restaurants, and offices. Modular kitchen, 2 balconies, and covered parking. Society with gym and 24x7 security.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[4].id,
      price: 6800000, isNegotiable: true, area: 1380, furnishing: 'UNFURNISHED',
      bedrooms: 3, bathrooms: 2, parking: 1,
      location: 'Hazratganj, Lalbagh', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001',
      latitude: 26.8489, longitude: 80.9408, contactPhone: '+919811100009',
      images: [
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200',
      ],
    },
    {
      title: 'Commercial Showroom 1800 sqft in Hazratganj',
      description:
        'A-grade commercial showroom on main Hazratganj road. Ground + mezzanine floor, 30 ft frontage, 3-phase power, central AC, and 4 car parking. High footfall location, ideal for retail or showroom.',
      type: 'COMMERCIAL', categoryId: catBySlug['commercial-spaces'].id, ownerId: users[4].id,
      price: 25000000, isNegotiable: true, area: 1800, furnishing: 'SEMI_FURNISHED',
      bedrooms: 0, bathrooms: 2, parking: 4,
      location: 'Hazratganj, Main Road', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001',
      latitude: 26.8512, longitude: 80.9420, contactPhone: '+919811100009',
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
      ],
    },
    {
      title: 'Serene 3BHK Villa in RS Puram',
      description:
        'Peaceful 3BHK villa in RS Puram with private garden and terrace. Vastu-compliant, modular kitchen, master suite with attached balcony. Gated community with clubhouse, pool, and gym.',
      type: 'VILLA', categoryId: catBySlug['villas'].id, ownerId: users[5].id,
      price: 9800000, isNegotiable: false, area: 2100, furnishing: 'FURNISHED',
      bedrooms: 3, bathrooms: 3, parking: 2,
      location: 'RS Puram, Tatabad', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641002',
      latitude: 11.0168, longitude: 76.9558, contactPhone: '+919811100010',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200',
      ],
    },
    {
      title: '2BHK Apartment near Tidel Park',
      description:
        'Affordable 2BHK apartment near Tidel Park and Coimbatore IT corridor. Modular kitchen, 2 balconies, covered parking. Society has gym, indoor games, and children\'s play area. Ideal for IT professionals.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[5].id,
      price: 4500000, isNegotiable: true, area: 1050, furnishing: 'SEMI_FURNISHED',
      bedrooms: 2, bathrooms: 2, parking: 1,
      location: 'Avinashi Road, Peelamedu', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641004',
      latitude: 11.0320, longitude: 76.9980, contactPhone: '+919811100010',
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      ],
    },
    {
      title: '4BHK Penthouse with Skyline View',
      description:
        'Luxurious 4BHK penthouse on the 25th floor with 360° city view. Private terrace garden, jacuzzi, smart home automation, Italian marble, and modular kitchen. Premium amenities include infinity pool, sky lounge, business centre, and spa.',
      type: 'FLAT', categoryId: catBySlug['flats-apartments'].id, ownerId: users[0].id,
      price: 32000000, isNegotiable: false, area: 3200, furnishing: 'FURNISHED',
      bedrooms: 4, bathrooms: 5, parking: 3,
      location: 'Koregaon Park, Lane 5', city: 'Pune', state: 'Maharashtra', pincode: '411001',
      latitude: 18.5362, longitude: 73.8939, contactPhone: '+919811100005',
      images: [
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200',
        'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1200',
        'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=1200',
      ],
      isVerifiedListing: true,
    },
  ]

  let created = 0
  for (const p of newProperties) {
    const existing = await prisma.property.findFirst({ where: { title: p.title } })
    if (existing) continue

    const { images, isVerifiedListing, ...data } = p
    await prisma.property.create({
      data: {
        ...data,
        contactPref: 'BOTH',
        status: 'APPROVED',
        isVerifiedListing: isVerifiedListing || false,
        images: {
          create: images.map((url: string, i: number) => ({
            url,
            isPrimary: i === 0,
          })),
        },
      },
    })
    created++
  }
  console.log(`Created ${created} new properties`)

  // Add some favorites for realism
  const rahul = await prisma.user.findUnique({ where: { email: 'rahul@example.com' } })
  const amit = await prisma.user.findUnique({ where: { email: 'amit@example.com' } })
  const allProperties = await prisma.property.findMany({ select: { id: true, ownerId: true } })

  // Rahul favorites 3 properties not owned by him
  const rahulFavs = allProperties.filter(p => p.ownerId !== rahul!.id).slice(0, 3)
  for (const p of rahulFavs) {
    await prisma.favorite.upsert({
      where: { userId_propertyId: { userId: rahul!.id, propertyId: p.id } },
      update: {},
      create: { userId: rahul!.id, propertyId: p.id },
    })
  }
  console.log(`Added ${rahulFavs.length} favorites for Rahul`)

  // Amit favorites 2 properties
  const amitFavs = allProperties.filter(p => p.ownerId !== amit!.id).slice(5, 7)
  for (const p of amitFavs) {
    await prisma.favorite.upsert({
      where: { userId_propertyId: { userId: amit!.id, propertyId: p.id } },
      update: {},
      create: { userId: amit!.id, propertyId: p.id },
    })
  }
  console.log(`Added ${amitFavs.length} favorites for Amit`)

  // Add a few RecentlyViewed entries for Rahul so recommendations work
  const rahulRecent = allProperties.filter(p => p.ownerId !== rahul!.id).slice(8, 11)
  for (const p of rahulRecent) {
    await prisma.recentlyViewed.upsert({
      where: { userId_propertyId: { userId: rahul!.id, propertyId: p.id } },
      update: { viewedAt: new Date() },
      create: { userId: rahul!.id, propertyId: p.id },
    })
  }
  console.log(`Added ${rahulRecent.length} recently viewed for Rahul`)

  console.log('Done!')
  console.log('---')
  console.log('All demo credentials (password: demo1234):')
  console.log('  rahul@example.com  (Bangalore, 2 listings, PRO)')
  console.log('  priya@example.com  (Hyderabad, PRO)')
  console.log('  amit@example.com   (Hyderabad + Delhi)')
  console.log('  sneha@example.com  (Mumbai)')
  console.log('  vikram@example.com (Pune, PRO, 4 listings)')
  console.log('  ananya@example.com (Chennai, 2 listings)')
  console.log('  karthik@example.com (Kochi, 2 listings)')
  console.log('  deepika@example.com (Jaipur, 2 listings)')
  console.log('  rohit@example.com  (Lucknow, 3 listings)')
  console.log('  meera@example.com  (Coimbatore, 2 listings)')
  console.log('Admin: admin@olx-property.com / admin123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
