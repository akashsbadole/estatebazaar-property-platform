import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/reports/[id]
// Body: { status: OPEN | REVIEWING | RESOLVED | DISMISSED }
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
  if (!['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status)) {
    return errorResponse('Invalid status', 400)
  }

  const report = await db.report.findUnique({ where: { id } })
  if (!report) return errorResponse('Report not found', 404)

  const updated = await db.report.update({ where: { id }, data: { status } })
  await audit('REPORT_MODERATE', admin.id, id, { status }, ip)

  return jsonResponse({ report: updated, message: `Report marked ${status.toLowerCase()}` })
}
