import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/properties/[id]/report
// Body: { reason, description? }
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const property = await db.property.findUnique({ where: { id } })
  if (!property) return errorResponse('Property not found', 404)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const reason = body.reason
  const description = body.description ? String(body.description).slice(0, 1000) : null
  if (!['FRAUD', 'DUPLICATE', 'SPAM', 'WRONG_INFO', 'OTHER'].includes(reason)) {
    return errorResponse('Valid reason is required', 400)
  }

  // Prevent duplicate reports from same user
  const existing = await db.report.findFirst({
    where: { propertyId: id, reporterId: user.id, status: 'OPEN' },
  })
  if (existing) return errorResponse('You have already reported this listing', 409)

  const report = await db.report.create({
    data: {
      propertyId: id,
      reporterId: user.id,
      reason,
      description,
      status: 'OPEN',
    },
  })

  await audit('REPORT_CREATE', user.id, id, { reason }, ip)

  return jsonResponse({ report, message: 'Report submitted. Our team will review it.' }, 201)
}
