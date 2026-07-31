import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/auth'

// GET /api/properties/featured
// Returns a curated set of featured/recent approved properties for homepage.
export async function GET(_request: NextRequest) {
  const [latest, popular, cities] = await Promise.all([
    db.property.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        owner: { select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
      },
    }),
    db.property.findMany({
      where: { status: 'APPROVED' },
      orderBy: { viewCount: 'desc' },
      take: 4,
      include: {
        owner: { select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
      },
    }),
    db.property.findMany({
      where: { status: 'APPROVED' },
      distinct: ['city'],
      take: 12,
      select: { city: true, state: true },
    }),
  ])

  return jsonResponse({ latest, popular, cities })
}
