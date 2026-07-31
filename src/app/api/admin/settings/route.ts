import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// GET /api/admin/settings — all settings (admin only)
export async function GET(_request: NextRequest) {
  await requireAdmin()
  const settings = await db.siteSetting.findMany({
    orderBy: { category: 'asc' },
  })
  return jsonResponse({ settings })
}

// POST /api/admin/settings — create or update setting
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const key = String(body.key || '').trim()
  const value = String(body.value || '')
  const category = String(body.category || 'general').trim()
  const isSecret = Boolean(body.isSecret)

  if (!key) return errorResponse('Key is required', 400)

  const setting = await db.siteSetting.upsert({
    where: { key },
    update: { value, category, isSecret, updatedBy: admin.id },
    create: { key, value, category, isSecret, updatedBy: admin.id },
  })

  await audit('SETTING_UPSERT', admin.id, key, { category, isSecret }, ip)

  return jsonResponse({ setting, message: 'Setting saved' })
}

// DELETE /api/admin/settings — delete setting
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  if (!key) return errorResponse('Key is required', 400)

  await db.siteSetting.delete({ where: { key } })
  await audit('SETTING_DELETE', admin.id, key, {}, ip)

  return jsonResponse({ message: 'Setting deleted' })
}