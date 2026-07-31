import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/users
// Query: q, role, isBanned, page, pageSize
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || undefined
  const role = searchParams.get('role') || undefined
  const isBanned = searchParams.get('isBanned')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ]
  }
  if (role) where.role = role
  if (isBanned === 'true') where.isBanned = true
  if (isBanned === 'false') where.isBanned = false

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { joinedDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isBanned: true,
        isVerified: true,
        avatarUrl: true,
        joinedDate: true,
        _count: { select: { properties: true } },
      },
    }),
  ])

  return jsonResponse({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
