import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/contact
// Query: type, status, page, pageSize
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || undefined
  const status = searchParams.get('status') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  const where: any = {}
  if (type) where.type = type
  if (status) where.status = status

  const [total, items] = await Promise.all([
    db.contactRequest.count({ where }),
    db.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: {
          select: { id: true, title: true, price: true, city: true, images: { select: { url: true, isPrimary: true }, take: 1 } },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  return jsonResponse({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
