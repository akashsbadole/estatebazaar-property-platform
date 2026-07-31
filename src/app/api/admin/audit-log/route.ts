import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/audit-log
// Query: action, actorId, target, page, pageSize, q
// Returns paginated, filterable audit log entries.
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || undefined
  const actorId = searchParams.get('actorId') || undefined
  const target = searchParams.get('target') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50))

  const where: any = {}
  if (action) where.action = action
  if (actorId) where.actorId = actorId
  if (target) where.target = target

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // Fetch actor details separately (AuditLog.actorId is not a relation)
  const actorIds = [...new Set(items.map(i => i.actorId).filter(Boolean))] as string[]
  const actors = actorIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })
    : []
  const actorMap = new Map(actors.map(a => [a.id, a]))

  return jsonResponse({
    items: items.map(log => ({
      ...log,
      meta: log.meta ? JSON.parse(log.meta) : null,
      actor: log.actorId ? actorMap.get(log.actorId) || null : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
