import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/listings/[id]/verify
// Body: { isVerifiedListing: boolean, reason? }
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

  const isVerifiedListing = Boolean(body.isVerifiedListing)
  const reason = body.reason ? String(body.reason) : undefined

  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Listing not found', 404)

  // Check subscription tier eligibility
  const owner = await db.user.findUnique({ where: { id: property.ownerId } })
  if (!owner) return errorResponse('Property owner not found', 404)

  if (isVerifiedListing && !['PRO', 'BROKER'].includes(owner.subscriptionTier || 'FREE')) {
    return errorResponse('Verified badge only available for PRO/BROKER subscribers', 403)
  }

  const updated = await db.property.update({
    where: { id },
    data: { isVerifiedListing },
  })

  await audit('LISTING_VERIFIED_BADGE', admin.id, id, { isVerifiedListing, reason }, ip)

  return jsonResponse({
    property: updated,
    message: isVerifiedListing ? 'Verified badge granted' : 'Verified badge revoked',
  })
}