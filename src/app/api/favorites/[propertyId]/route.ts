import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ propertyId: string }>
}

// POST /api/favorites/[propertyId]  — toggle favorite
export async function POST(request: NextRequest, { params }: Params) {
  const { propertyId } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const property = await db.property.findUnique({ where: { id: propertyId } })
  if (!property) return errorResponse('Property not found', 404)

  const existing = await db.favorite.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId } },
  })

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } })
    await audit('FAVORITE_REMOVE', user.id, propertyId, {}, ip)
    return jsonResponse({ favorited: false, message: 'Removed from favorites' })
  }

  await db.favorite.create({ data: { userId: user.id, propertyId } })
  await audit('FAVORITE_ADD', user.id, propertyId, {}, ip)
  return jsonResponse({ favorited: true, message: 'Added to favorites' })
}
