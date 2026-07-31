import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  sanitizeString,
  getClientIp,
  audit,
} from '@/lib/auth'

// GET /api/saved-searches — list current user's saved searches
export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  const items = await db.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return jsonResponse({
    items: items.map(s => ({
      ...s,
      filters: JSON.parse(s.filters),
    })),
  })
}

// POST /api/saved-searches
// Body: { name, filters, alertEnabled? }
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const name = sanitizeString(body.name || '', 100)
  if (!name) return errorResponse('Name is required', 400)
  if (!body.filters || typeof body.filters !== 'object') {
    return errorResponse('filters object is required', 400)
  }

  // Sanitize filters
  const filters: Record<string, any> = {}
  const allowedKeys = ['q', 'type', 'city', 'categoryId', 'furnishing', 'bedrooms', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'sort']
  for (const k of allowedKeys) {
    if (body.filters[k] !== undefined && body.filters[k] !== '' && body.filters[k] !== null) {
      filters[k] = body.filters[k]
    }
  }

  // Limit to 20 saved searches per user (FREE plan limit, can be raised for paid)
  const count = await db.savedSearch.count({ where: { userId: user.id } })
  if (count >= 20) {
    return errorResponse('You can save up to 20 searches. Delete an old one first.', 400)
  }

  const saved = await db.savedSearch.create({
    data: {
      userId: user.id,
      name,
      filters: JSON.stringify(filters),
      alertEnabled: Boolean(body.alertEnabled),
    },
  })

  await audit('SAVED_SEARCH_CREATE', user.id, saved.id, { name }, ip)

  return jsonResponse({
    savedSearch: { ...saved, filters: JSON.parse(saved.filters) },
    message: 'Search saved',
  }, 201)
}
