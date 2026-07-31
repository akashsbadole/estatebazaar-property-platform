import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse } from '@/lib/auth'

// GET /api/properties/my
// Returns the current user's own listings (all statuses)
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const where: any = { ownerId: user.id }
  if (status) where.status = status

  const items = await db.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true } },
      _count: { select: { favorites: true, reports: true } },
    },
  })

  return jsonResponse({ items })
}
