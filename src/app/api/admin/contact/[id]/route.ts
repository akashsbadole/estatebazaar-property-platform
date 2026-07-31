import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit, sanitizeString } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/contact/[id]
// Body: { status?: 'NEW'|'CONTACTED'|'RESOLVED'|'ARCHIVED', notes?: string }
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const data: any = {}
  if (body.status && ['NEW', 'CONTACTED', 'RESOLVED', 'ARCHIVED'].includes(body.status)) {
    data.status = body.status
  }
  if (body.notes !== undefined) {
    data.notes = sanitizeString(body.notes, 2000)
  }

  const existing = await db.contactRequest.findUnique({ where: { id } })
  if (!existing) return errorResponse('Contact request not found', 404)

  const updated = await db.contactRequest.update({ where: { id }, data })
  await audit('CONTACT_REQUEST_UPDATE', admin.id, id, data, ip)

  return jsonResponse({ contact: updated, message: 'Contact request updated' })
}
