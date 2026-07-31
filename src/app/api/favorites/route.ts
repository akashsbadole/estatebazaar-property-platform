import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse } from '@/lib/auth'

// GET /api/favorites  — list current user's favorites
export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: {
        include: {
          owner: { select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { id: true, url: true, isPrimary: true } },
        },
      },
    },
  })
  return jsonResponse({ items: favorites.map(f => f.property) })
}
