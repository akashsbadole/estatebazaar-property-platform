import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/listings
// Query: status, page, pageSize, q
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q')?.trim() || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  const where: any = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { location: { contains: q } },
      { city: { contains: q } },
    ]
  }

  const [total, items] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true, email: true, isVerified: true, isBanned: true } },
        category: { select: { id: true, name: true } },
        images: { select: { id: true, url: true, isPrimary: true }, take: 1 },
        _count: { select: { reports: true, favorites: true } },
      },
    }),
  ])

  return jsonResponse({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
