import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@olx-property.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@olx-property.com',
      phone: '+919999999999',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  })
  console.log(`Admin: ${admin.email} / admin123`)

  const userPassword = await bcrypt.hash('demo1234', 10)
  const users = await Promise.all(
    [
      { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919811100001' },
      { name: 'Priya Patel', email: 'priya@example.com', phone: '+919811100002' },
      { name: 'Amit Verma', email: 'amit@example.com', phone: '+919811100003' },
      { name: 'Sneha Reddy', email: 'sneha@example.com', phone: '+919811100004' },
    ].map(async u => {
      return prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash: userPassword, isVerified: true },
      })
    }),
  )
  console.log(`Users: ${users.length} created`)

  const categories = await Promise.all(
    [
      { name: 'Flats / Apartments', icon: 'Building2' },
      { name: 'Independent Houses', icon: 'Home' },
      { name: 'Villas', icon: 'Castle' },
      { name: 'Residential Plots', icon: 'Map' },
      { name: 'Builder Floors', icon: 'Building' },
      { name: 'Commercial Spaces', icon: 'Store' },
    ].map(async c => {
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return prisma.category.upsert({
        where: { slug },
        update: {},
        create: { name: c.name, slug, icon: c.icon },
      })
    }),
  )
  console.log(`Categories: ${categories.length} created`)

  const sampleProperties = [
    {
      title: 'Spacious 3BHK Apartment in Whitefield',
      description:
        'Beautifully designed 3BHK apartment in the heart of Whitefield. Close to ITPL tech park, metro station, and top schools. The apartment features a modular kitchen, two balconies, and a covered car parking. Society amenities include swimming pool, gym, club house and 24x7 security.',
      type: 'FLAT',
      categoryId: categories[0].id,
      ownerId: users[0].id,
      price: 8500000,
      isNegotiable: true,
      area: 1450,
      furnishing: 'SEMI_FURNISHED',
      bedrooms: 3,
      bathrooms: 3,
      parking: 2,
      location: 'Whitefield, Palm Meadows',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      latitude: 12.9698,
      longitude: 77.7499,
      contactPhone: '+919811100001',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      ],
    },
    {
      title: 'Luxury 4BHK Villa with Private Pool',
      description:
        'Premium 4BHK villa in gated community with private swimming pool, landscaped garden, and 4 car parking. Italian marble flooring, modular kitchen, home automation system, and a rooftop terrace. Located 10 minutes from HITEC City.',
      type: 'VILLA',
      categoryId: categories[2].id,
      ownerId: users[1].id,
      price: 24500000,
      isNegotiable: false,
      area: 3200,
      furnishing: 'FURNISHED',
      bedrooms: 4,
      bathrooms: 5,
      parking: 4,
      location: 'Jubilee Hills, Road No 36',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      latitude: 17.4239,
      longitude: 78.4083,
      contactPhone: '+919811100002',
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
      ],
    },
    {
      title: 'Independent House 5BHK in South Delhi',
      description:
        'Spacious 5BHK independent house in premium locality. Freehold property with stilt parking for 3 cars, servant quarter, and a small terrace garden. Close to metro, markets and reputed schools. Clear title and ready for immediate possession.',
      type: 'HOUSE',
      categoryId: categories[1].id,
      ownerId: users[2].id,
      price: 65000000,
      isNegotiable: true,
      area: 4500,
      furnishing: 'UNFURNISHED',
      bedrooms: 5,
      bathrooms: 6,
      parking: 3,
      location: 'GK-1, Block M',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110048',
      latitude: 28.5245,
      longitude: 77.1855,
      contactPhone: '+919811100003',
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
      ],
    },
    {
      title: '1200 sq ft Residential Plot in Powai',
      description:
        'Corner plot in gated residential layout with clear title and approved layout plan. Facing east, 30 ft wide road frontage, with underground drainage, water and electricity connections ready. Ideal for building your dream home.',
      type: 'PLOT',
      categoryId: categories[3].id,
      ownerId: users[3].id,
      price: 42000000,
      isNegotiable: true,
      area: 1200,
      furnishing: 'UNFURNISHED',
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      location: 'Powai, Hiranandani Gardens',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400076',
      latitude: 19.1176,
      longitude: 72.906,
      contactPhone: '+919811100004',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
      ],
    },
    {
      title: '2BHK Builder Floor in Koramangala',
      description:
        'Standalone builder floor with private entrance, 2 balconies and modular kitchen. Recently painted, with new bathroom fittings and a covered parking. Walkable to Forum Mall, restaurants and IT offices.',
      type: 'BUILDER_FLOOR',
      categoryId: categories[4].id,
      ownerId: users[0].id,
      price: 6200000,
      isNegotiable: true,
      area: 1100,
      furnishing: 'SEMI_FURNISHED',
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      location: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560095',
      latitude: 12.9352,
      longitude: 77.6245,
      contactPhone: '+919811100001',
      images: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      ],
    },
    {
      title: 'Commercial Office Space 1500 sq ft',
      description:
        'A-grade commercial office space on the 8th floor with panoramic city view. Fully furnished with 12 workstations, 2 cabins, conference room, pantry and reception. 24x7 power backup, 3 lifts, and ample visitor parking.',
      type: 'COMMERCIAL',
      categoryId: categories[5].id,
      ownerId: users[1].id,
      price: 18500000,
      isNegotiable: false,
      area: 1500,
      furnishing: 'FURNISHED',
      bedrooms: 0,
      bathrooms: 2,
      parking: 4,
      location: 'Cyber City, Tower B',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      latitude: 28.4949,
      longitude: 77.089,
      contactPhone: '+919811100002',
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200',
      ],
    },
    {
      title: 'Modern 2BHK Apartment near Sea Link',
      description:
        'Beautiful sea-facing 2BHK apartment with floor-to-ceiling windows. Modular kitchen, two balconies and a covered car parking. Society has swimming pool, gym and play area. Easy access to Bandra-Worli Sea Link.',
      type: 'FLAT',
      categoryId: categories[0].id,
      ownerId: users[3].id,
      price: 14500000,
      isNegotiable: true,
      area: 1050,
      furnishing: 'FURNISHED',
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      location: 'Bandra West, Carter Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      latitude: 19.0509,
      longitude: 72.8202,
      contactPhone: '+919811100004',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
        'https://images.unsplash.com/photo-1560448075-bb485b067938?w=1200',
      ],
    },
    {
      title: 'Premium 3BHK Apartment with Skyline View',
      description:
        'High-rise 3BHK apartment on the 22nd floor with stunning city skyline view. Premium fittings, smart home automation, modular kitchen and 2 covered parkings. Premium amenities include infinity pool, sky lounge, business centre and spa.',
      type: 'FLAT',
      categoryId: categories[0].id,
      ownerId: users[2].id,
      price: 12500000,
      isNegotiable: false,
      area: 1650,
      furnishing: 'FURNISHED',
      bedrooms: 3,
      bathrooms: 3,
      parking: 2,
      location: 'Banjara Hills, Road No 12',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      latitude: 17.4126,
      longitude: 78.4448,
      contactPhone: '+919811100003',
      images: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200',
      ],
    },
  ]

  for (const p of sampleProperties) {
    const images = p.images.map((url, i) => ({ url, isPrimary: i === 0 }))
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 8)
    await prisma.property.create({
      data: {
        ownerId: p.ownerId,
        categoryId: p.categoryId,
        title: p.title,
        slug,
        description: p.description,
        type: p.type,
        price: p.price,
        isNegotiable: p.isNegotiable,
        area: p.area,
        furnishing: p.furnishing,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parking: p.parking,
        location: p.location,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        latitude: p.latitude,
        longitude: p.longitude,
        contactPhone: p.contactPhone,
        contactPref: 'BOTH',
        status: 'APPROVED',
        images: { create: images },
      } as any,
    })
  }
  console.log(`Properties: ${sampleProperties.length} created`)
  console.log('Demo user credentials: rahul@example.com / demo1234')
  console.log('Admin credentials: admin@olx-property.com / admin123')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
