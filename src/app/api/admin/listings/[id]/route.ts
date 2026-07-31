import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/listings/[id]
// Body: { status: APPROVED | REJECTED | SOLD | PENDING, reason? }
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

  const status = body.status
  if (!['PENDING', 'APPROVED', 'REJECTED', 'SOLD'].includes(status)) {
    return errorResponse('Invalid status', 400)
  }

  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Listing not found', 404)

  const updated = await db.property.update({
    where: { id },
    data: { status },
  })

  await audit('LISTING_MODERATE', admin.id, id, { status, reason: body.reason }, ip)

  return jsonResponse({ property: updated, message: `Listing ${status.toLowerCase()}` })
}
