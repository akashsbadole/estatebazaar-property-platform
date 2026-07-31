import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, sanitizeString, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// GET /api/categories  — public
export async function GET(_request: NextRequest) {
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { properties: { where: { status: 'APPROVED' } } },
      },
    },
  })
  return jsonResponse({ items: categories })
}

// POST /api/categories  — admin only
export async function POST(request: NextRequest) {
  const user = await requireAuth().catch(async () => null)
  if (!user) return errorResponse('Authentication required', 401)
  if (user.role !== 'ADMIN') return errorResponse('Admin access required', 403)

  const ip = getClientIp(request)
  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const name = sanitizeString(body.name || '', 100)
  const icon = body.icon ? sanitizeString(body.icon, 50) : null
  if (!name) return errorResponse('Name is required', 400)

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const existing = await db.category.findUnique({ where: { slug } })
  if (existing) return errorResponse('Category already exists', 409)

  const category = await db.category.create({ data: { name, slug, icon } })
  await audit('CATEGORY_CREATE', user.id, category.id, { name }, ip)
  return jsonResponse({ category }, 201)
}
