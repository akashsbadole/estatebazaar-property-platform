import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/analytics/seller
// Returns analytics for the current user's listings:
//   - Total views, favorites, chats, reports (aggregate)
//   - Per-listing breakdown (top 10 by views)
//   - 30-day trend: views, favorites, chats created per day
//   - Performance breakdown by listing (views per day, conversion rate)
export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  // Fetch all user's listings with stats
  const listings = await db.property.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      title: true,
      price: true,
      city: true,
      type: true,
      status: true,
      viewCount: true,
      isVerifiedListing: true,
      createdAt: true,
      images: { select: { url: true, isPrimary: true }, take: 1 },
      _count: {
        select: {
          favorites: true,
          chats: true,
          reports: true,
        },
      },
    },
    orderBy: { viewCount: 'desc' },
  })

  if (listings.length === 0) {
    return jsonResponse({
      hasListings: false,
      summary: { totalViews: 0, totalFavorites: 0, totalChats: 0, totalReports: 0, totalListings: 0 },
      listings: [],
      trend: [],
      topPerformers: [],
    })
  }

  // Aggregate totals
  const summary = {
    totalListings: listings.length,
    totalViews: listings.reduce((sum, l) => sum + l.viewCount, 0),
    totalFavorites: listings.reduce((sum, l) => sum + l._count.favorites, 0),
    totalChats: listings.reduce((sum, l) => sum + l._count.chats, 0),
    totalReports: listings.reduce((sum, l) => sum + l._count.reports, 0),
    avgViewsPerListing: Math.round(listings.reduce((sum, l) => sum + l.viewCount, 0) / listings.length),
    // Conversion rate: chats / views
    conversionRate: 0,
  }
  const totalViews = summary.totalViews
  summary.conversionRate = totalViews > 0
    ? Math.round((summary.totalChats / totalViews) * 1000) / 10 // 1 decimal place
    : 0

  // 30-day trend — for each day, count:
  //   - views: We don't track per-day views (only cumulative), so we approximate
  //            by evenly distributing viewCount across days since createdAt
  //   - favorites: created per day
  //   - chats: created per day
  // In production, you'd have a DailyViewEvent table for accurate per-day views.
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [favorites, chats] = await Promise.all([
    db.favorite.findMany({
      where: {
        property: { ownerId: user.id },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),
    db.chat.findMany({
      where: {
        property: { ownerId: user.id },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),
  ])

  // Build 30-day histogram
  const trend: Array<{ date: string; views: number; favorites: number; chats: number }> = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const favCount = favorites.filter(f => f.createdAt.toISOString().slice(0, 10) === key).length
    const chatCount = chats.filter(c => c.createdAt.toISOString().slice(0, 10) === key).length
    // Approximate views: distribute total views evenly across days the listing has been live
    const dayViews = listings.reduce((sum, l) => {
      const listingAge = Math.max(1, Math.floor((Date.now() - l.createdAt.getTime()) / 86400000))
      const daysActiveIn30 = Math.min(30, Math.floor((Math.min(Date.now(), d.getTime() + 86400000) - l.createdAt.getTime()) / 86400000))
      if (daysActiveIn30 <= 0) return sum
      return sum + Math.round(l.viewCount / listingAge)
    }, 0)
    trend.push({ date: key, views: dayViews, favorites: favCount, chats: chatCount })
  }

  // Top performers (top 5 by views)
  const topPerformers = listings.slice(0, 5).map(l => ({
    id: l.id,
    title: l.title,
    city: l.city,
    price: l.price,
    status: l.status,
    views: l.viewCount,
    favorites: l._count.favorites,
    chats: l._count.chats,
    reports: l._count.reports,
    isVerifiedListing: l.isVerifiedListing,
    primaryImage: l.images.find(i => i.isPrimary)?.url || l.images[0]?.url || '/placeholder-property.svg',
    conversionRate: l.viewCount > 0 ? Math.round((l._count.chats / l.viewCount) * 1000) / 10 : 0,
  }))

  // City breakdown
  const cityBreakdown: Record<string, { listings: number; views: number; chats: number }> = {}
  for (const l of listings) {
    if (!cityBreakdown[l.city]) cityBreakdown[l.city] = { listings: 0, views: 0, chats: 0 }
    cityBreakdown[l.city].listings++
    cityBreakdown[l.city].views += l.viewCount
    cityBreakdown[l.city].chats += l._count.chats
  }

  return jsonResponse({
    hasListings: true,
    summary,
    listings: listings.map(l => ({
      id: l.id,
      title: l.title,
      city: l.city,
      price: l.price,
      status: l.status,
      views: l.viewCount,
      favorites: l._count.favorites,
      chats: l._count.chats,
      reports: l._count.reports,
      isVerifiedListing: l.isVerifiedListing,
      primaryImage: l.images.find(i => i.isPrimary)?.url || l.images[0]?.url || '/placeholder-property.svg',
      conversionRate: l.viewCount > 0 ? Math.round((l._count.chats / l.viewCount) * 1000) / 10 : 0,
    })),
    trend,
    topPerformers,
    cityBreakdown: Object.entries(cityBreakdown).map(([city, stats]) => ({ city, ...stats })),
  })
}
