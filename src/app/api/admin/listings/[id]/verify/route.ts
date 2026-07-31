import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/admin/listings/[id]/verify
// Toggles the isVerifiedListing flag on a property.
// Body: { verified: boolean }
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const verified = Boolean(body.verified)
  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Listing not found', 404)

  const updated = await db.property.update({
    where: { id },
    data: { isVerifiedListing: verified },
  })

  await audit('LISTING_VERIFY_TOGGLE', admin.id, id, { verified }, ip)

  return jsonResponse({
    property: updated,
    message: verified ? 'Listing marked as Verified' : 'Verified badge removed',
  })
}
