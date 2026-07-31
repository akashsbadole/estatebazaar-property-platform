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

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/properties/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const currentUser = await getCurrentUser()

  const property = await db.property.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true } },
      _count: { select: { favorites: true, reports: true } },
    },
  })

  if (!property) return errorResponse('Property not found', 404)

  // Access control: only approved properties are public; owner & admin can see others
  const isOwner = currentUser?.id === property.ownerId
  const isAdmin = currentUser?.role === 'ADMIN'
  if (property.status !== 'APPROVED' && !isOwner && !isAdmin) {
    return errorResponse('Property not found', 404)
  }

  // Increment view count (skip if owner viewing own property)
  if (!isOwner) {
    await db.property.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    // Record view in RecentlyViewed (upsert to refresh timestamp)
    if (currentUser) {
      await db.recentlyViewed.upsert({
        where: { userId_propertyId: { userId: currentUser.id, propertyId: id } },
        update: { viewedAt: new Date() },
        create: { userId: currentUser.id, propertyId: id },
      })
    }
  }

  // Is favorited?
  let isFavorited = false
  if (currentUser) {
    const fav = await db.favorite.findUnique({
      where: { userId_propertyId: { userId: currentUser.id, propertyId: id } },
    })
    isFavorited = !!fav
  }

  // Similar properties (same category or city, exclude self)
  const similar = await db.property.findMany({
    where: {
      id: { not: id },
      status: 'APPROVED',
      OR: [{ categoryId: property.categoryId }, { city: property.city }],
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
      _count: { select: { favorites: true, reports: true } },
    },
  })

  return jsonResponse({
    property: { ...property, isFavorited },
    similar,
  })
}

// PUT /api/properties/[id]  (only owner)
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Property not found', 404)
  if (property.ownerId !== user.id && user.role !== 'ADMIN') {
    return errorResponse('Not authorized to edit this property', 403)
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const data: any = {}
  if (body.title !== undefined) data.title = sanitizeString(body.title, 200)
  if (body.description !== undefined) data.description = sanitizeString(body.description, 5000)
  if (body.type !== undefined) data.type = body.type
  if (body.categoryId !== undefined) data.categoryId = body.categoryId
  if (body.price !== undefined) data.price = parseInt(body.price, 10)
  if (body.isNegotiable !== undefined) data.isNegotiable = Boolean(body.isNegotiable)
  if (body.area !== undefined) data.area = parseInt(body.area, 10)
  if (body.furnishing !== undefined) data.furnishing = body.furnishing
  if (body.bedrooms !== undefined) data.bedrooms = parseInt(body.bedrooms, 10) || 0
  if (body.bathrooms !== undefined) data.bathrooms = parseInt(body.bathrooms, 10) || 0
  if (body.parking !== undefined) data.parking = parseInt(body.parking, 10) || 0
  if (body.location !== undefined) data.location = sanitizeString(body.location, 300)
  if (body.city !== undefined) data.city = sanitizeString(body.city, 100)
  if (body.state !== undefined) data.state = sanitizeString(body.state, 100)
  if (body.pincode !== undefined) data.pincode = body.pincode ? sanitizeString(body.pincode, 10) : null
  if (body.latitude !== undefined) data.latitude = body.latitude ? parseFloat(body.latitude) : null
  if (body.longitude !== undefined) data.longitude = body.longitude ? parseFloat(body.longitude) : null
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone ? sanitizeString(body.contactPhone, 20) : null
  if (body.contactPref !== undefined) data.contactPref = body.contactPref

  // If significant fields changed, send back to PENDING for re-approval
  const reApprovalFields = ['title', 'description', 'price', 'type', 'categoryId', 'area', 'location', 'city']
  const requiresReApproval = reApprovalFields.some(f => f in data) && property.status === 'APPROVED'
  if (requiresReApproval) data.status = 'PENDING'

  // Record price change in PriceHistory if price changed
  if (body.price !== undefined && Number(body.price) !== property.price) {
    await db.priceHistory.create({
      data: {
        propertyId: id,
        oldPrice: property.price,
        newPrice: parseInt(body.price, 10),
      },
    })
  }

  // Update images if provided
  if (Array.isArray(body.images)) {
    await db.propertyImage.deleteMany({ where: { propertyId: id } })
    if (body.images.length > 0) {
      await db.propertyImage.createMany({
        data: body.images.map((img: any, i: number) => ({
          propertyId: id,
          url: sanitizeString(img.url, 2000),
          isPrimary: i === 0 || Boolean(img.isPrimary),
        })),
      })
    } else {
      await db.propertyImage.create({
        data: { propertyId: id, url: '/placeholder-property.svg', isPrimary: true },
      })
    }
  }

  const updated = await db.property.update({
    where: { id },
    data,
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true } },
    },
  })

  await audit('PROPERTY_UPDATE', user.id, id, { fields: Object.keys(data) }, ip)

  return jsonResponse({
    property: updated,
    message: requiresReApproval ? 'Updated. Pending re-approval by admin.' : 'Property updated',
  })
}

// DELETE /api/properties/[id]  (only owner or admin)
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Property not found', 404)
  if (property.ownerId !== user.id && user.role !== 'ADMIN') {
    return errorResponse('Not authorized to delete this property', 403)
  }

  await db.property.delete({ where: { id } })

  await audit('PROPERTY_DELETE', user.id, id, { title: property.title }, ip)

  return jsonResponse({ message: 'Property deleted' })
}
