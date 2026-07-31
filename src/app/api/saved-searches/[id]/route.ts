import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/saved-searches/[id]
// Body: { name?, alertEnabled? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const existing = await db.savedSearch.findUnique({ where: { id } })
  if (!existing) return errorResponse('Saved search not found', 404)
  if (existing.userId !== user.id) return errorResponse('Not authorized', 403)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const data: any = {}
  if (typeof body.name === 'string') data.name = body.name.slice(0, 100).trim()
  if (typeof body.alertEnabled === 'boolean') {
    data.alertEnabled = body.alertEnabled
    // Reset newMatchCount when alerts toggled
    data.newMatchCount = 0
    data.lastCheckedAt = new Date()
  }

  const updated = await db.savedSearch.update({ where: { id }, data })
  await audit('SAVED_SEARCH_UPDATE', user.id, id, data, ip)

  return jsonResponse({
    savedSearch: { ...updated, filters: JSON.parse(updated.filters) },
    message: 'Saved search updated',
  })
}

// DELETE /api/saved-searches/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const existing = await db.savedSearch.findUnique({ where: { id } })
  if (!existing) return errorResponse('Saved search not found', 404)
  if (existing.userId !== user.id) return errorResponse('Not authorized', 403)

  await db.savedSearch.delete({ where: { id } })
  await audit('SAVED_SEARCH_DELETE', user.id, id, {}, ip)

  return jsonResponse({ message: 'Saved search deleted' })
}
