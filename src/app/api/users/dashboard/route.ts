import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  const [listingCount, favCount, unreadCount, savedSearchCount, recentListings, recentActivity] = await Promise.all([
    db.property.count({ where: { ownerId: user.id } }),
    db.favorite.count({ where: { userId: user.id } }),
    db.message.count({ where: { chat: { buyerId: user.id }, isRead: false } }),
    db.savedSearch.count({ where: { userId: user.id } }),
    db.property.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, city: true, price: true, status: true, viewCount: true, createdAt: true, images: { select: { url: true, isPrimary: true }, take: 1 } },
    }),
    db.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { action: true, meta: true, createdAt: true },
    }),
  ])

  const savedSearches = await db.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, name: true, filters: true, alertEnabled: true, newMatchCount: true },
  })

  const formattedListings = recentListings.map(l => ({
    id: l.id,
    title: l.title,
    city: l.city,
    price: l.price,
    status: l.status,
    viewCount: l.viewCount,
    createdAt: l.createdAt.toISOString(),
    image: l.images[0]?.url || null,
  }))

  const formattedSearches = savedSearches.map(s => ({
    ...s,
    filters: JSON.parse(s.filters),
  }))

  const formattedActivity = recentActivity.map(a => ({
    action: a.action,
    meta: a.meta ? JSON.parse(a.meta) : null,
    createdAt: a.createdAt.toISOString(),
  }))

  return jsonResponse({
    stats: { listingCount, favCount, unreadCount, savedSearchCount },
    recentListings: formattedListings,
    recentActivity: formattedActivity,
    savedSearches: formattedSearches,
  })
}
