import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse } from '@/lib/auth'

// GET /api/recently-viewed — returns the 12 most recently viewed properties
// for the current user.
export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  const recent = await db.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: 'desc' },
    take: 12,
    include: {
      property: {
        include: {
          owner: {
            select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
          },
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
          _count: { select: { favorites: true, reports: true } },
        },
      },
    },
  })

  const items = recent
    .filter(r => r.property.status === 'APPROVED')
    .map(r => ({
      ...r.property,
      viewedAt: r.viewedAt,
    }))

  return jsonResponse({ items })
}

// DELETE /api/recently-viewed — clears all recently viewed history for the user
export async function DELETE(_request: NextRequest) {
  const user = await requireAuth()
  await db.recentlyViewed.deleteMany({ where: { userId: user.id } })
  return jsonResponse({ message: 'Recently viewed history cleared' })
}
