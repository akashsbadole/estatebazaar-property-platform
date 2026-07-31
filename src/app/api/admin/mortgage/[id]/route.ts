import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit, sanitizeString } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/mortgage/[id]
// Body: { status?, approvedAmount?, interestRate?, bankNotes?, partnerBank? }
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
  if (body.status && ['PENDING', 'UNDER_REVIEW', 'PRE_APPROVED', 'REJECTED', 'DISBURSED'].includes(body.status)) {
    data.status = body.status
  }
  if (body.approvedAmount !== undefined) data.approvedAmount = parseInt(body.approvedAmount, 10) || null
  if (body.interestRate !== undefined) data.interestRate = parseFloat(body.interestRate) || null
  if (body.partnerBank !== undefined) data.partnerBank = sanitizeString(body.partnerBank, 100)
  if (body.bankNotes !== undefined) data.bankNotes = sanitizeString(body.bankNotes, 2000)

  const existing = await db.mortgageApplication.findUnique({ where: { id } })
  if (!existing) return errorResponse('Application not found', 404)

  const updated = await db.mortgageApplication.update({ where: { id }, data })
  await audit('MORTGAGE_UPDATE', admin.id, id, data, ip)

  return jsonResponse({ application: updated, message: 'Application updated' })
}
