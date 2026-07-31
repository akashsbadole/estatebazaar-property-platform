import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, jsonResponse } from '@/lib/auth'

// GET /api/properties/recommended
// Returns up to 8 properties recommended for the current user based on:
//   1. Their RecentlyViewed history (last 20 views)
//   2. Their Favorites
//   3. Their own listings (to infer their "taste")
//
// Algorithm:
//   - Build a taste profile: most common city, type, category, price range
//   - Score every approved property by how well it matches the profile
//   - Exclude already-viewed and already-favorited properties
//   - Return top 8 by score
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser()

  // If not logged in, fall back to trending properties
  if (!user) {
    const trending = await db.property.findMany({
      where: { status: 'APPROVED' },
      orderBy: { viewCount: 'desc' },
      take: 8,
      include: {
        owner: {
          select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
        _count: { select: { favorites: true, reports: true } },
      },
    })
    return jsonResponse({ items: trending, reason: 'trending' })
  }

  // 1. Build taste profile from history
  const [recentViews, favorites, ownListings] = await Promise.all([
    db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: 'desc' },
      take: 20,
      include: {
        property: { select: { city: true, type: true, categoryId: true, price: true, area: true } },
      },
    }),
    db.favorite.findMany({
      where: { userId: user.id },
      take: 20,
      include: {
        property: { select: { city: true, type: true, categoryId: true, price: true, area: true } },
      },
    }),
    db.property.findMany({
      where: { ownerId: user.id },
      select: { id: true, city: true, type: true, categoryId: true, price: true, area: true },
      take: 10,
    }),
  ])

  // Combine all reference properties
  const referenceProps = [
    ...recentViews.map(r => r.property).filter(Boolean),
    ...favorites.map(f => f.property).filter(Boolean),
    ...ownListings,
  ].filter(p => p != null) as Array<{ city: string; type: string; categoryId: string; price: number; area: number }>

  // Not enough history → fall back to trending
  if (referenceProps.length < 2) {
    const trending = await db.property.findMany({
      where: {
        status: 'APPROVED',
        ownerId: { not: user.id }, // exclude own
      },
      orderBy: { viewCount: 'desc' },
      take: 8,
      include: {
        owner: {
          select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
        _count: { select: { favorites: true, reports: true } },
      },
    })
    return jsonResponse({ items: trending, reason: 'trending' })
  }

  // 2. Compute weights for each dimension
  const cityCounts: Record<string, number> = {}
  const typeCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const prices: number[] = []
  const areas: number[] = []

  // Weight recently viewed = 1, favorites = 2 (stronger signal), own listings = 1.5
  const weights = [
    ...recentViews.map(() => 1),
    ...favorites.map(() => 2),
    ...ownListings.map(() => 1.5),
  ]
  referenceProps.forEach((p, i) => {
    const w = weights[i] || 1
    cityCounts[p.city] = (cityCounts[p.city] || 0) + w
    typeCounts[p.type] = (typeCounts[p.type] || 0) + w
    categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + w
    prices.push(p.price)
    areas.push(p.area)
  })

  // Top city + type + category
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  // Average price ± 50% as the "comfortable price range"
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const minPrice = avgPrice * 0.5
  const maxPrice = avgPrice * 1.5

  // 3. Fetch candidate properties: approved, exclude own + already viewed/favorited
  const excludeIds = new Set<string>(
    [
      ...recentViews.map(r => r.propertyId),
      ...favorites.map(f => f.propertyId),
      ...ownListings.map(p => p.id),
    ].filter((id): id is string => typeof id === 'string' && id.length > 0)
  )

  const candidates = await db.property.findMany({
    where: {
      status: 'APPROVED',
      id: { notIn: excludeIds.size > 0 ? Array.from(excludeIds) : undefined },
      ownerId: { not: user.id },
    },
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
      _count: { select: { favorites: true, reports: true } },
    },
    take: 100, // Pull a reasonable pool, then score & rank
  })

  // 4. Score each candidate
  const scored = candidates.map(p => {
    let score = 0
    if (p.city === topCity) score += 30
    if (p.type === topType) score += 25
    if (p.categoryId === topCategory) score += 15
    // Price within ±50% of average gets higher score, scaling linearly
    if (p.price >= minPrice && p.price <= maxPrice) {
      const distFromAvg = Math.abs(p.price - avgPrice) / avgPrice
      score += Math.round(20 * (1 - distFromAvg))
    }
    // Bonus for verified listings + popular properties
    if (p.isVerifiedListing) score += 5
    score += Math.min(p.viewCount / 10, 10) // up to +10 for view count
    return { property: p, score }
  })

  // Sort by score desc, take top 8
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 8).map(s => s.property)

  return jsonResponse({
    items: top,
    reason: 'personalized',
    profile: {
      topCity,
      topType,
      topCategory,
      avgPrice: Math.round(avgPrice),
      referenceCount: referenceProps.length,
    },
  })
}
