import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser,
  requireAuth,
  sanitizeString,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

// GET /api/properties
// Query params: page, pageSize, q, type, city, minPrice, maxPrice, minArea,
//   maxArea, bedrooms, furnishing, sort (latest|price_asc|price_desc|relevance),
//   categoryId, status (default APPROVED), ownerId
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10) || 12))
  const q = searchParams.get('q')?.trim() || undefined
  const type = searchParams.get('type') || undefined
  const city = searchParams.get('city') || undefined
  const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined
  const minArea = searchParams.get('minArea') ? parseInt(searchParams.get('minArea')!, 10) : undefined
  const maxArea = searchParams.get('maxArea') ? parseInt(searchParams.get('maxArea')!, 10) : undefined
  const bedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!, 10) : undefined
  const furnishing = searchParams.get('furnishing') || undefined
  const categoryId = searchParams.get('categoryId') || undefined
  const ownerId = searchParams.get('ownerId') || undefined
  const sort = searchParams.get('sort') || 'latest'
  const statusParam = searchParams.get('status')

  const currentUser = await getCurrentUser()

  // Default: only APPROVED listings are public.
  // Owners can see their own PENDING/REJECTED listings via /api/properties/my
  // Admins can see everything
  let statusFilter: string[] = ['APPROVED']
  if (statusParam && currentUser?.role === 'ADMIN') {
    statusFilter = statusParam.split(',')
  } else if (statusParam === 'OWN' && currentUser) {
    statusFilter = ['PENDING', 'APPROVED', 'REJECTED', 'SOLD']
  }

  const where: any = {
    status: { in: statusFilter },
  }
  if (currentUser && statusParam === 'OWN') {
    where.ownerId = currentUser.id
  } else if (ownerId) {
    where.ownerId = ownerId
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { location: { contains: q } },
      { city: { contains: q } },
    ]
  }
  if (type) where.type = type
  if (city) where.city = { contains: city }
  if (categoryId) where.categoryId = categoryId
  if (furnishing) where.furnishing = furnishing
  if (bedrooms !== undefined) where.bedrooms = { gte: bedrooms }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {}
    if (minPrice !== undefined) where.price.gte = minPrice
    if (maxPrice !== undefined) where.price.lte = maxPrice
  }
  if (minArea !== undefined || maxArea !== undefined) {
    where.area = {}
    if (minArea !== undefined) where.area.gte = minArea
    if (maxArea !== undefined) where.area.lte = maxArea
  }

  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  else if (sort === 'price_desc') orderBy = { price: 'desc' }
  else if (sort === 'relevance') orderBy = { viewCount: 'desc' }

  const [total, items] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            avatarUrl: true,
            joinedDate: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, isPrimary: true } },
        _count: { select: { favorites: true, reports: true } },
      },
    }),
  ])

  // Attach isFavorited flag
  let favoriteIds = new Set<string>()
  if (currentUser) {
    const favs = await db.favorite.findMany({
      where: { userId: currentUser.id, propertyId: { in: items.map(p => p.id) } },
      select: { propertyId: true },
    })
    favoriteIds = new Set(favs.map(f => f.propertyId))
  }

  const itemsWithFav = items.map(p => ({
    ...p,
    isFavorited: favoriteIds.has(p.id),
  }))

  return jsonResponse({
    items: itemsWithFav,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

// POST /api/properties
// Create new property listing (defaults to PENDING status for admin approval)
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const title = sanitizeString(body.title || '', 200)
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 8)
  const description = sanitizeString(body.description || '', 5000)
  const type = body.type
  const categoryId = sanitizeString(body.categoryId || '', 50)
  const price = parseInt(body.price, 10)
  const isNegotiable = Boolean(body.isNegotiable)
  const area = parseInt(body.area, 10)
  const furnishing = body.furnishing || 'UNFURNISHED'
  const bedrooms = parseInt(body.bedrooms, 10) || 0
  const bathrooms = parseInt(body.bathrooms, 10) || 0
  const parking = parseInt(body.parking, 10) || 0
  const location = sanitizeString(body.location || '', 300)
  const city = sanitizeString(body.city || '', 100)
  const state = sanitizeString(body.state || '', 100)
  const pincode = body.pincode ? sanitizeString(body.pincode, 10) : null
  const latitude = body.latitude ? parseFloat(body.latitude) : null
  const longitude = body.longitude ? parseFloat(body.longitude) : null
  const contactPhone = body.contactPhone ? sanitizeString(body.contactPhone, 20) : null
  const contactPref = body.contactPref || 'BOTH'
  const images: Array<{ url: string; isPrimary?: boolean }> = Array.isArray(body.images) ? body.images : []

  if (!title) return errorResponse('Title is required', 400)
  if (!description) return errorResponse('Description is required', 400)
  if (!['FLAT', 'HOUSE', 'VILLA', 'PLOT', 'BUILDER_FLOOR', 'COMMERCIAL'].includes(type)) {
    return errorResponse('Valid property type is required', 400)
  }
  if (!categoryId) return errorResponse('Category is required', 400)
  if (!Number.isFinite(price) || price <= 0) return errorResponse('Valid price is required', 400)
  if (!Number.isFinite(area) || area <= 0) return errorResponse('Valid area is required', 400)
  if (!location) return errorResponse('Location is required', 400)
  if (!city) return errorResponse('City is required', 400)
  if (!state) return errorResponse('State is required', 400)

  const category = await db.category.findUnique({ where: { id: categoryId } })
  if (!category) return errorResponse('Category not found', 400)

  // ----- Subscription plan enforcement -----
  // Fetch the user's plan from DB (or default to FREE)
  const plan = await db.subscriptionPlan.findFirst({
    where: { code: user.subscriptionTier || 'FREE', isActive: true },
  })
  const features = plan ? JSON.parse(plan.features) : { maxListings: 3, maxImagesPerListing: 3 }

  // 1. Check listing count limit
  if (features.maxListings !== -1) {
    const currentCount = await db.property.count({ where: { ownerId: user.id } })
    if (currentCount >= features.maxListings) {
      return errorResponse(
        `Your ${(plan?.name) || 'Free'} plan allows up to ${features.maxListings} listings. Please upgrade to post more.`,
        403,
      )
    }
  }

  // 2. Check images count limit
  if (images.length > features.maxImagesPerListing) {
    return errorResponse(
      `Your ${(plan?.name) || 'Free'} plan allows up to ${features.maxImagesPerListing} photos per listing. Please upgrade to add more.`,
      403,
    )
  }

  const property = await db.property.create({
    data: {
      ownerId: user.id,
      categoryId,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 8),
      description,
      type,
      price,
      isNegotiable,
      area,
      furnishing,
      bedrooms,
      bathrooms,
      parking,
      location,
      city,
      state,
      pincode,
      latitude,
      longitude,
      contactPhone,
      contactPref,
      status: 'PENDING',
      images: {
        create: images.length
          ? images.map((img, i) => ({
              url: sanitizeString(img.url, 2000),
              isPrimary: i === 0 || Boolean(img.isPrimary),
            }))
          : [{ url: '/placeholder-property.svg', isPrimary: true }],
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true } },
    },
  })

  await audit('PROPERTY_CREATE', user.id, property.id, { title, type }, ip)

  // Record initial price in PriceHistory
  await db.priceHistory.create({
    data: {
      propertyId: property.id,
      oldPrice: 0,
      newPrice: price,
    },
  })

  return jsonResponse({ property, message: 'Property posted. Pending admin approval.' }, 201)
}
