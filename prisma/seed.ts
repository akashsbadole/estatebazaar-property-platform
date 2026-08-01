import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

const CATEGORIES = [
  { name: 'Residential', slug: 'residential', icon: 'home' },
  { name: 'Commercial', slug: 'commercial', icon: 'building' },
  { name: 'Land', slug: 'land', icon: 'map-pin' },
  { name: 'Rental', slug: 'rental', icon: 'key' },
];

const PLANS = [
  {
    code: 'FREE',
    name: 'Free',
    tagline: 'Basic listing access',
    priceMonthly: 0,
    priceYearly: 0,
    features: { maxListings: 3, maxImagesPerListing: 5, featuredListing: false, verifiedBadge: false, analytics: false },
    sortOrder: 0,
  },
  {
    code: 'PRO',
    name: 'Pro',
    tagline: 'For serious sellers',
    priceMonthly: 99900,
    priceYearly: 999900,
    features: { maxListings: 20, maxImagesPerListing: 20, featuredListing: true, verifiedBadge: true, analytics: true, prioritySupport: true },
    sortOrder: 1,
  },
  {
    code: 'BROKER',
    name: 'Broker',
    tagline: 'For real estate professionals',
    priceMonthly: 299900,
    priceYearly: 2999900,
    features: { maxListings: 100, maxImagesPerListing: 50, featuredListing: true, verifiedBadge: true, analytics: true, prioritySupport: true, teamAccess: true, crmIntegration: true },
    sortOrder: 2,
  },
];

const USERS = [
  { name: 'Admin User', email: 'admin@estatebazaar.com', phone: '+919876543201', role: 'ADMIN', subscriptionTier: 'FREE' },
  { name: 'Regular User', email: 'user@estatebazaar.com', phone: '+919876543202', role: 'USER', subscriptionTier: 'FREE' },
  { name: 'Pro User', email: 'pro@estatebazaar.com', phone: '+919876543203', role: 'USER', subscriptionTier: 'PRO' },
  { name: 'Broker User', email: 'broker@estatebazaar.com', phone: '+919876543204', role: 'USER', subscriptionTier: 'BROKER', brokeragePaid: true },
  { name: 'Vendor User', email: 'vendor@estatebazaar.com', phone: '+919876543205', role: 'VENDOR', subscriptionTier: 'FREE' },
  { name: 'Priya Sharma', email: 'buyer@estatebazaar.com', phone: '+919876543206', role: 'USER', subscriptionTier: 'FREE' },
];

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800`;

// ownerEmail / categorySlug are resolved against seeded records at runtime
const PROPERTIES: Array<{
  ownerEmail: string
  categorySlug: string
  title: string
  slug: string
  description: string
  type: string
  price: number
  isNegotiable: boolean
  area: number
  furnishing: string
  bedrooms: number
  bathrooms: number
  parking: number
  location: string
  city: string
  state: string
  pincode: string
  latitude: number
  longitude: number
  status: string
  isVerifiedListing?: boolean
  tourImages?: string[]
}> = [
  {
    ownerEmail: 'user@estatebazaar.com',
    categorySlug: 'residential',
    title: '3 BHK Flat in Andheri West',
    slug: '3-bhk-flat-in-andheri-west',
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
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    latitude: 19.1364,
    longitude: 72.8294,
    status: 'APPROVED',
  },
  {
    ownerEmail: 'user@estatebazaar.com',
    categorySlug: 'residential',
    title: '2 BHK Builder Floor in Koramangala',
    slug: '2-bhk-builder-floor-in-koramangala',
    description: 'Newly renovated builder floor in a quiet lane, walking distance to 5th Block market.',
    type: 'BUILDER_FLOOR',
    price: 9500000,
    isNegotiable: true,
    area: 1100,
    furnishing: 'UNFURNISHED',
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    location: 'Koramangala 5th Block',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560095',
    latitude: 12.9352,
    longitude: 77.6245,
    status: 'PENDING',
  },
  {
    ownerEmail: 'user@estatebazaar.com',
    categorySlug: 'residential',
    title: 'Duplex House in Powai',
    slug: 'duplex-house-in-powai',
    description: 'Duplex house with garden facing the lake. RERA registered project.',
    type: 'HOUSE',
    price: 17500000,
    isNegotiable: false,
    area: 2100,
    furnishing: 'SEMI_FURNISHED',
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    location: 'Powai, Near Hiranandani Gardens',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400076',
    latitude: 19.1176,
    longitude: 72.9060,
    status: 'REJECTED',
  },
  {
    ownerEmail: 'pro@estatebazaar.com',
    categorySlug: 'residential',
    title: 'Luxury 4 BHK Villa in Whitefield',
    slug: 'luxury-4-bhk-villa-in-whitefield',
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
    longitude: 77.75,
    status: 'APPROVED',
    isVerifiedListing: true,
    tourImages: ['https://example.com/tour1.jpg', 'https://example.com/tour2.jpg'],
  },
  {
    ownerEmail: 'broker@estatebazaar.com',
    categorySlug: 'commercial',
    title: 'Office Space in Cyber City',
    slug: 'office-space-in-cyber-city',
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
  },
  {
    ownerEmail: 'vendor@estatebazaar.com',
    categorySlug: 'residential',
    title: '3 BHK Apartment in Gachibowli',
    slug: '3-bhk-apartment-in-gachibowli',
    description: 'Corner apartment with IT park view, clubhouse and 24x7 security.',
    type: 'FLAT',
    price: 12000000,
    isNegotiable: true,
    area: 1550,
    furnishing: 'SEMI_FURNISHED',
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    location: 'Gachibowli, Near Financial District',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    latitude: 17.4401,
    longitude: 78.3489,
    status: 'APPROVED',
    isVerifiedListing: true,
  },
  {
    ownerEmail: 'vendor@estatebazaar.com',
    categorySlug: 'land',
    title: 'Residential Plot in Devanahalli',
    slug: 'residential-plot-in-devanahalli',
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
  },
  {
    ownerEmail: 'vendor@estatebazaar.com',
    categorySlug: 'residential',
    title: '2 BHK Apartment in Kothrud',
    slug: '2-bhk-apartment-in-kothrud',
    description: 'Budget 2 BHK in Kothrud, close to schools and Karve Road.',
    type: 'FLAT',
    price: 7800000,
    isNegotiable: true,
    area: 950,
    furnishing: 'UNFURNISHED',
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    location: 'Kothrud, Near Karve Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    latitude: 18.5074,
    longitude: 73.8077,
    status: 'PENDING',
  },
  {
    ownerEmail: 'vendor@estatebazaar.com',
    categorySlug: 'residential',
    title: '4 BHK Villa in Adyar',
    slug: '4-bhk-villa-in-adyar',
    description: 'Sold — beach-side villa with private garden and staff quarters.',
    type: 'VILLA',
    price: 22000000,
    isNegotiable: false,
    area: 2900,
    furnishing: 'FURNISHED',
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    location: 'Adyar, Near Elliot Beach',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600020',
    latitude: 13.0012,
    longitude: 80.2565,
    status: 'SOLD',
  },
  {
    ownerEmail: 'pro@estatebazaar.com',
    categorySlug: 'rental',
    title: '2 BHK for Rent in Koramangala',
    slug: '2-bhk-for-rent-in-koramangala',
    description: 'Well-maintained 2 BHK apartment available for rent. Walking distance to Forum Mall.',
    type: 'FLAT',
    price: 35000,
    isNegotiable: false,
    area: 950,
    furnishing: 'FURNISHED',
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
  },
];

const FAVORITES: Array<{ userEmail: string; propertySlug: string }> = [
  { userEmail: 'user@estatebazaar.com', propertySlug: '3-bhk-apartment-in-gachibowli' },
  { userEmail: 'user@estatebazaar.com', propertySlug: 'luxury-4-bhk-villa-in-whitefield' },
  { userEmail: 'buyer@estatebazaar.com', propertySlug: '3-bhk-flat-in-andheri-west' },
  { userEmail: 'buyer@estatebazaar.com', propertySlug: 'residential-plot-in-devanahalli' },
  { userEmail: 'buyer@estatebazaar.com', propertySlug: '2-bhk-for-rent-in-koramangala' },
];

const REPORTS: Array<{ reporterEmail: string; propertySlug: string; reason: string; description: string; status: string }> = [
  { reporterEmail: 'buyer@estatebazaar.com', propertySlug: 'luxury-4-bhk-villa-in-whitefield', reason: 'DUPLICATE', description: 'Same villa is listed by two different brokers on the site.', status: 'OPEN' },
  { reporterEmail: 'user@estatebazaar.com', propertySlug: 'office-space-in-cyber-city', reason: 'WRONG_INFO', description: 'Area mentioned in the listing seems inflated compared to the actual office.', status: 'OPEN' },
  { reporterEmail: 'buyer@estatebazaar.com', propertySlug: 'duplex-house-in-powai', reason: 'FRAUD', description: 'Owner asked for advance payment before site visit.', status: 'RESOLVED' },
];

const SAVED_SEARCHES: Array<{ userEmail: string; name: string; filters: object; alertEnabled: boolean; newMatchCount?: number }> = [
  { userEmail: 'user@estatebazaar.com', name: '3 BHK in Bangalore', filters: { type: 'FLAT', city: 'Bangalore', bedrooms: 3 }, alertEnabled: true, newMatchCount: 2 },
  { userEmail: 'buyer@estatebazaar.com', name: 'Plots near Devanahalli', filters: { type: 'PLOT', city: 'Bangalore' }, alertEnabled: false },
];

const CHATS: Array<{ buyerEmail: string; propertySlug: string; messages: Array<{ senderEmail: string; content: string; isRead: boolean }> }> = [
  {
    buyerEmail: 'buyer@estatebazaar.com',
    propertySlug: '3-bhk-apartment-in-gachibowli',
    messages: [
      { senderEmail: 'buyer@estatebazaar.com', content: 'Hi, is the 3 BHK in Gachibowli still available?', isRead: true },
      { senderEmail: 'vendor@estatebazaar.com', content: 'Yes it is. Would you like to schedule a site visit?', isRead: false },
    ],
  },
  {
    buyerEmail: 'user@estatebazaar.com',
    propertySlug: 'residential-plot-in-devanahalli',
    messages: [
      { senderEmail: 'user@estatebazaar.com', content: 'Hello, is the Devanahalli plot price negotiable?', isRead: true },
    ],
  },
  {
    buyerEmail: 'buyer@estatebazaar.com',
    propertySlug: '3-bhk-flat-in-andheri-west',
    messages: [
      { senderEmail: 'buyer@estatebazaar.com', content: 'Is the Andheri flat available for a site visit this weekend?', isRead: true },
    ],
  },
];

const CONTACT_REQUESTS: Array<{ type: string; name: string; email: string; phone: string; message: string; propertySlug?: string; userEmail?: string; status: string }> = [
  {
    type: 'ENQUIRY',
    name: 'Priya Sharma',
    email: 'buyer@estatebazaar.com',
    phone: '+919876543206',
    message: 'Interested in the Gachibowli apartment. Please share the floor plan and society details.',
    propertySlug: '3-bhk-apartment-in-gachibowli',
    userEmail: 'buyer@estatebazaar.com',
    status: 'NEW',
  },
  {
    type: 'ENQUIRY',
    name: 'Priya Sharma',
    email: 'buyer@estatebazaar.com',
    phone: '+919876543206',
    message: 'Is the flat near the metro? Can I visit this week?',
    propertySlug: '3-bhk-flat-in-andheri-west',
    userEmail: 'buyer@estatebazaar.com',
    status: 'NEW',
  },
  {
    type: 'ENQUIRY',
    name: 'Regular User',
    email: 'user@estatebazaar.com',
    phone: '+919876543202',
    message: 'Is the Devanahalli plot price final? Would you consider 1.1 Cr?',
    propertySlug: 'residential-plot-in-devanahalli',
    userEmail: 'user@estatebazaar.com',
    status: 'CONTACTED',
  },
  {
    type: 'SUPPORT',
    name: 'Regular User',
    email: 'user@estatebazaar.com',
    phone: '+919876543202',
    message: 'Can you help me upgrade my plan to Pro? I need more listings.',
    userEmail: 'user@estatebazaar.com',
    status: 'NEW',
  },
];

const AUDIT_LOGS: Array<{ actorEmail: string; action: string; target?: string; meta?: object }> = [
  { actorEmail: 'admin@estatebazaar.com', action: 'USER_LOGIN', meta: { email: 'admin@estatebazaar.com' } },
  { actorEmail: 'user@estatebazaar.com', action: 'USER_SIGNUP', meta: { email: 'user@estatebazaar.com' } },
  { actorEmail: 'user@estatebazaar.com', action: 'PROPERTY_CREATE', target: '3-bhk-flat-in-andheri-west', meta: { title: '3 BHK Flat in Andheri West' } },
  { actorEmail: 'user@estatebazaar.com', action: 'FAVORITE_ADD', target: '3-bhk-apartment-in-gachibowli' },
  { actorEmail: 'vendor@estatebazaar.com', action: 'USER_LOGIN', meta: { email: 'vendor@estatebazaar.com' } },
  { actorEmail: 'vendor@estatebazaar.com', action: 'PROPERTY_CREATE', target: '3-bhk-apartment-in-gachibowli', meta: { title: '3 BHK Apartment in Gachibowli' } },
  { actorEmail: 'vendor@estatebazaar.com', action: 'PROPERTY_CREATE', target: 'residential-plot-in-devanahalli', meta: { title: 'Residential Plot in Devanahalli' } },
  { actorEmail: 'buyer@estatebazaar.com', action: 'USER_SIGNUP', meta: { email: 'buyer@estatebazaar.com' } },
  { actorEmail: 'buyer@estatebazaar.com', action: 'CHAT_CREATE', target: '3-bhk-apartment-in-gachibowli' },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- Deterministic wipe: everything derived is recreated below.
  // Users are upserted, not wiped.
  for (const m of [
    prisma.message.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.propertyImage.deleteMany(),
    prisma.report.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.recentlyViewed.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.mortgageApplication.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.contactRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.property.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.otp.deleteMany(),
    prisma.category.deleteMany(),
  ]) {
    await m;
  }

  // --- Users ---
  const users: Record<string, any> = {};
  for (const u of USERS) {
    const data = { ...u, passwordHash, isVerified: true, isBanned: false, emailNotifications: true };
    const { email, ...rest } = data;
    users[email] = await prisma.user.upsert({
      where: { email },
      update: rest,
      create: data,
    });
  }

  // --- Categories ---
  const categories: Record<string, any> = {};
  for (const c of CATEGORIES) {
    categories[c.slug] = await prisma.category.create({ data: c });
  }

  // --- Subscription plans ---
  for (const p of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { ...p, features: JSON.stringify(p.features) },
      create: { ...p, features: JSON.stringify(p.features), isActive: true },
    });
  }

  // --- Properties ---
  const properties: Record<string, any> = {};
  for (const p of PROPERTIES) {
    const { ownerEmail, categorySlug, tourImages, ...data } = p;
    const prop = await prisma.property.upsert({
      where: { slug: p.slug },
      update: { ...data, ownerId: users[ownerEmail].id, categoryId: categories[categorySlug].id, tourImages: tourImages ? JSON.stringify(tourImages) : null },
      create: {
        ...data,
        ownerId: users[ownerEmail].id,
        categoryId: categories[categorySlug].id,
        tourImages: tourImages ? JSON.stringify(tourImages) : null,
      },
    });
    await prisma.propertyImage.deleteMany({ where: { propertyId: prop.id } });
    await prisma.propertyImage.createMany({
      data: [
        'photo-1560448204-e02f11c3d0e2',
        'photo-1560448075-b48c5d1f4c6f',
        'photo-1600596542815-ffad4c1539a9',
      ].map((id, i) => ({ propertyId: prop.id, url: IMG(id), isPrimary: i === 0 })),
    });
    properties[p.slug] = prop;
  }

  // --- Favorites ---
  for (const f of FAVORITES) {
    await prisma.favorite.create({
      data: { userId: users[f.userEmail].id, propertyId: properties[f.propertySlug].id },
    });
  }

  // --- Reports ---
  for (const r of REPORTS) {
    await prisma.report.create({
      data: { reporterId: users[r.reporterEmail].id, propertyId: properties[r.propertySlug].id, reason: r.reason, description: r.description, status: r.status },
    });
  }

  // --- Saved searches ---
  for (const s of SAVED_SEARCHES) {
    await prisma.savedSearch.create({
      data: { userId: users[s.userEmail].id, name: s.name, filters: JSON.stringify(s.filters), alertEnabled: s.alertEnabled, newMatchCount: s.newMatchCount ?? 0 },
    });
  }

  // --- Chats + messages ---
  for (const c of CHATS) {
    const property = properties[c.propertySlug];
    const chat = await prisma.chat.create({
      data: {
        propertyId: property.id,
        buyerId: users[c.buyerEmail].id,
        sellerId: property.ownerId,
        messages: {
          create: c.messages.map(m => ({ senderId: users[m.senderEmail].id, content: m.content, isRead: m.isRead })),
        },
      },
    });
    await prisma.auditLog.create({
      data: { actorId: users[c.buyerEmail].id, action: 'CHAT_CREATE', target: chat.id },
    });
  }

  // --- Contact requests (user enquiries) ---
  for (const c of CONTACT_REQUESTS) {
    await prisma.contactRequest.create({
      data: {
        type: c.type,
        name: c.name,
        email: c.email,
        phone: c.phone,
        message: c.message,
        status: c.status,
        propertyId: c.propertySlug ? properties[c.propertySlug].id : null,
        userId: c.userEmail ? users[c.userEmail].id : null,
      },
    });
  }

  // --- Subscriptions + payments ---
  const proPlan = (await prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } }))!
  const brokerPlan = (await prisma.subscriptionPlan.findUnique({ where: { code: 'BROKER' } }))!
  const now = new Date();
  const activeSub = (userId: string, plan: any, amount: number) =>
    prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        planCode: plan.code,
        billingCycle: 'MONTHLY',
        amount,
        status: 'ACTIVE',
        startsAt: new Date(now.getTime() - 30 * 86400000),
        expiresAt: new Date(now.getTime() + 30 * 86400000),
      },
    });

  const proSub = await activeSub(users['pro@estatebazaar.com'].id, proPlan, proPlan.priceMonthly);
  const brokerSub = await activeSub(users['broker@estatebazaar.com'].id, brokerPlan, brokerPlan.priceMonthly);

  await prisma.payment.createMany({
    data: [
      { userId: users['pro@estatebazaar.com'].id, subscriptionId: proSub.id, type: 'SUBSCRIPTION', method: 'DEMO', amount: proPlan.priceMonthly, currency: 'INR', status: 'PAID', providerOrderId: 'demo_order_pro' },
      { userId: users['broker@estatebazaar.com'].id, subscriptionId: brokerSub.id, type: 'SUBSCRIPTION', method: 'DEMO', amount: brokerPlan.priceMonthly, currency: 'INR', status: 'PAID', providerOrderId: 'demo_order_broker' },
      { userId: users['broker@estatebazaar.com'].id, type: 'BROKERAGE_SIGNUP', method: 'DEMO', amount: 299900, currency: 'INR', status: 'PAID', providerOrderId: 'demo_order_brokerage' },
    ],
  });

  // --- Audit logs ---
  for (const a of AUDIT_LOGS) {
    await prisma.auditLog.create({
      data: { actorId: users[a.actorEmail].id, action: a.action, target: a.target, meta: a.meta ? JSON.stringify(a.meta) : null },
    });
  }

  const [userCount, propertyCount, favoriteCount, chatCount, reportCount, contactCount] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.favorite.count(),
    prisma.chat.count(),
    prisma.report.count(),
    prisma.contactRequest.count(),
  ]);

  console.log('✅ Seed completed!');
  console.log('Users:', userCount);
  console.log('Properties:', propertyCount, '| Favorites:', favoriteCount, '| Chats:', chatCount, '| Reports:', reportCount, '| Contact requests:', contactCount);
  console.log('Accounts (password: password123): admin@, user@, pro@, broker@, vendor@ (VENDOR), buyer@ — all @estatebazaar.com');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
