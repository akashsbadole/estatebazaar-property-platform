import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@estatebazaar.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@estatebazaar.com',
      phone: '+919876543210',
      passwordHash,
      role: 'ADMIN',
      subscriptionTier: 'FREE',
      isVerified: true,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@estatebazaar.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@estatebazaar.com',
      phone: '+919876543211',
      passwordHash,
      role: 'USER',
      subscriptionTier: 'FREE',
      isVerified: true,
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@estatebazaar.com' },
    update: {},
    create: {
      name: 'Pro User',
      email: 'pro@estatebazaar.com',
      phone: '+919876543212',
      passwordHash,
      role: 'USER',
      subscriptionTier: 'PRO',
      isVerified: true,
    },
  });

  const brokerUser = await prisma.user.upsert({
    where: { email: 'broker@estatebazaar.com' },
    update: {},
    create: {
      name: 'Broker User',
      email: 'broker@estatebazaar.com',
      phone: '+919876543213',
      passwordHash,
      role: 'USER',
      subscriptionTier: 'BROKER',
      brokeragePaid: true,
      isVerified: true,
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@estatebazaar.com' },
    update: {},
    create: {
      name: 'Vendor User',
      email: 'vendor@estatebazaar.com',
      phone: '+919876543214',
      passwordHash,
      role: 'USER',
      subscriptionTier: 'FREE',
      isVerified: true,
    },
  });

  // --- Categories ---
  const categoriesData = [
    { name: 'Residential', slug: 'residential', icon: 'home' },
    { name: 'Commercial', slug: 'commercial', icon: 'building' },
    { name: 'Land', slug: 'land', icon: 'map-pin' },
    { name: 'Rental', slug: 'rental', icon: 'key' },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = { id: c.id };
  }

  // --- Subscription Plans ---
  await prisma.subscriptionPlan.upsert({
    where: { code: 'FREE' },
    update: {},
    create: {
      code: 'FREE',
      name: 'Free',
      tagline: 'Basic listing access',
      priceMonthly: 0,
      priceYearly: 0,
      features: JSON.stringify({ maxListings: 3, maxImagesPerListing: 5, featuredListing: false, verifiedBadge: false, analytics: false }),
      isActive: true,
      sortOrder: 0,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      code: 'PRO',
      name: 'Pro',
      tagline: 'For serious sellers',
      priceMonthly: 99900, // ₹999/month
      priceYearly: 999900, // ₹9,999/year
      features: JSON.stringify({ maxListings: 20, maxImagesPerListing: 20, featuredListing: true, verifiedBadge: true, analytics: true, prioritySupport: true }),
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'BROKER' },
    update: {},
    create: {
      code: 'BROKER',
      name: 'Broker',
      tagline: 'For real estate professionals',
      priceMonthly: 299900, // ₹2,999/month
      priceYearly: 2999900, // ₹29,999/year
      features: JSON.stringify({ maxListings: 100, maxImagesPerListing: 50, featuredListing: true, verifiedBadge: true, analytics: true, prioritySupport: true, teamAccess: true, crmIntegration: true }),
      isActive: true,
      sortOrder: 2,
    },
  });

  // --- Sample Properties ---
  const propertiesData = [
    {
      ownerId: regularUser.id,
      categoryId: categories.residential.id,
      title: '3 BHK Flat in Andheri West',
      slug: '3-bhk-flat-in-andheri-west-cms97gds4',
      description: 'Spacious 3 BHK flat with modern amenities, close to metro station.',
      type: 'FLAT',
      price: 8500000,
      isNegotiable: true,
      area: 1200,
      furnishing: 'SEMI_FURNISHED',
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      location: 'Andheri West, Near Versova Metro',
      city: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440018',
      latitude: 21.1458,
      longitude: 79.0882,
      status: 'APPROVED',
      contactPhone: '+919876543211',
      contactPref: 'BOTH',
    },
    {
      ownerId: proUser.id,
      categoryId: categories.residential.id,
      title: 'Luxury 4 BHK Villa in Whitefield',
      slug: 'luxury-4-bhk-villa-in-whitefield-cms97gds5',
      description: 'Premium villa in gated community with clubhouse, pool, and garden.',
      type: 'VILLA',
      price: 25000000,
      isNegotiable: false,
      area: 3500,
      furnishing: 'FURNISHED',
      bedrooms: 4,
      bathrooms: 4,
      parking: 2,
      location: 'Whitefield, Near ITPL',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      latitude: 12.9698,
      longitude: 77.7500,
      status: 'APPROVED',
      isVerifiedListing: true,
      contactPhone: '+919876543212',
      contactPref: 'BOTH',
    },
    {
      ownerId: brokerUser.id,
      categoryId: categories.commercial.id,
      title: 'Office Space in Cyber City',
      slug: 'office-space-in-cyber-city-cms97gds6',
      description: 'Prime commercial office space in DLF Cyber City, Gurgaon. Ready to move.',
      type: 'COMMERCIAL',
      price: 45000000,
      isNegotiable: true,
      area: 5000,
      furnishing: 'UNFURNISHED',
      bedrooms: 0,
      bathrooms: 4,
      parking: 10,
      location: 'DLF Cyber City, Phase 2',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      latitude: 28.4921,
      longitude: 77.0803,
      status: 'APPROVED',
      isVerifiedListing: true,
      contactPhone: '+919876543213',
      contactPref: 'CALL',
    },
    {
      ownerId: vendorUser.id,
      categoryId: categories.land.id,
      title: 'Residential Plot in Devanahalli',
      slug: 'residential-plot-in-devanahalli-cms97gds7',
      description: 'BBMP approved residential plot near upcoming airport expressway.',
      type: 'PLOT',
      price: 12000000,
      isNegotiable: true,
      area: 2400,
      furnishing: 'UNFURNISHED',
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      location: 'Devanahalli, Near Airport',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '562110',
      latitude: 13.2489,
      longitude: 77.7065,
      status: 'APPROVED',
      contactPhone: '+919876543214',
      contactPref: 'CHAT',
    },
    {
      ownerId: regularUser.id,
      categoryId: categories.rental.id,
      title: '2 BHK for Rent in Koramangala',
      slug: '2-bhk-for-rent-in-koramangala-cms97gds8',
      description: 'Well-maintained 2 BHK apartment available for rent. Walking distance to Forum Mall.',
      type: 'FLAT',
      price: 35000,
      isNegotiable: false,
      area: 950,
      furnishing: 'FULLY_FURNISHED',
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      location: 'Koramangala 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      latitude: 12.9352,
      longitude: 77.6245,
      status: 'APPROVED',
      contactPhone: '+919876543211',
      contactPref: 'BOTH',
    },
    {
      ownerId: proUser.id,
      categoryId: categories.residential.id,
      title: 'Penthouse in Bandra West',
      slug: 'penthouse-in-bandra-west-cms97gds9',
      description: 'Exclusive penthouse with sea view, private terrace, and premium finishes.',
      type: 'FLAT',
      price: 45000000,
      isNegotiable: true,
      area: 2800,
      furnishing: 'FURNISHED',
      bedrooms: 4,
      bathrooms: 4,
      parking: 2,
      location: 'Bandra West, Carter Road',
      city: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440022',
      latitude: 21.1498,
      longitude: 79.1001,
      status: 'APPROVED',
      isVerifiedListing: true,
      tourImages: JSON.stringify(['https://example.com/tour1.jpg', 'https://example.com/tour2.jpg']),
      contactPhone: '+919876543212',
      contactPref: 'BOTH',
    },
  ];

  for (const prop of propertiesData) {
    await prisma.property.create({
      data: {
        ...prop,
        slug: (prop as any).slug,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', isPrimary: true },
            { url: 'https://images.unsplash.com/photo-1560448075-b48c5d1f4c6f?w=800', isPrimary: false },
            { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', isPrimary: false },
          ],
        },
      } as any,
    });
  }

  console.log('✅ Seed completed!');
  console.log('Users: admin, user, pro, broker, vendor (all password: password123)');
  console.log('Categories:', Object.keys(categories).join(', '));
  console.log('Properties: 6 sample listings created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

