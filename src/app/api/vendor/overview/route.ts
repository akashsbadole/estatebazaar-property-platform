import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  if (user.role !== 'VENDOR') {
    return errorResponse('Vendor access required', 403)
  }

  const [totalListings, activeListings, pendingListings, soldListings, totalViews, totalFavorites, totalChats] = await Promise.all([
    db.property.count({ where: { ownerId: user.id } }),
    db.property.count({ where: { ownerId: user.id, status: 'APPROVED' } }),
    db.property.count({ where: { ownerId: user.id, status: 'PENDING' } }),
    db.property.count({ where: { ownerId: user.id, status: 'SOLD' } }),
    db.property.aggregate({ where: { ownerId: user.id }, _sum: { viewCount: true } }),
    db.favorite.count({ where: { property: { ownerId: user.id } } }),
    db.chat.count({ where: { property: { ownerId: user.id } } }),
  ])

  return jsonResponse({
    totalListings,
    activeListings,
    pendingListings,
    soldListings,
    totalViews: totalViews._sum.viewCount || 0,
    totalFavorites,
    totalChats,
  })
}
