import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/mortgage
// Query: status, page, pageSize
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  const where: any = {}
  if (status) where.status = status

  const [total, items] = await Promise.all([
    db.mortgageApplication.count({ where }),
    db.mortgageApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, title: true, price: true, city: true } },
      },
    }),
  ])

  return jsonResponse({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
