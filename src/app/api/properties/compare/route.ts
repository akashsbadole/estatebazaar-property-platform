import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/properties/compare?ids=id1,id2,id3
// Returns up to 4 properties for side-by-side comparison.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)

  if (ids.length < 2) {
    return errorResponse('Provide at least 2 property IDs to compare', 400)
  }

  const properties = await db.property.findMany({
    where: {
      id: { in: ids },
      status: 'APPROVED',
    },
    include: {
      owner: {
        select: { id: true, name: true, isVerified: true, avatarUrl: true, joinedDate: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, isPrimary: true } },
      _count: { select: { favorites: true, reports: true } },
    },
  })

  // Preserve the order requested by the user
  const ordered = ids
    .map(id => properties.find(p => p.id === id))
    .filter(Boolean) as typeof properties

  return jsonResponse({ items: ordered })
}
