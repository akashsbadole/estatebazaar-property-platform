import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit, sanitizeString } from '@/lib/auth'

// GET /api/admin/settings — list all settings
export async function GET(_request: NextRequest) {
  await requireAdmin()
  const settings = await db.siteSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  })
  return jsonResponse({
    settings: settings.map(s => ({
      ...s,
      value: s.isSecret ? '••••••••' : s.value,
    })),
  })
}

// PATCH /api/admin/settings — update one or more settings
// Body: { settings: Array<{ key, value }> }
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const updates: Array<{ key: string; value: string }> = Array.isArray(body.settings) ? body.settings : []
  if (updates.length === 0) return errorResponse('No settings provided', 400)

  const results: any[] = []
  for (const { key, value } of updates) {
    const k = sanitizeString(key, 100)
    const v = String(value)
    if (!k) continue

    const existing = await db.siteSetting.findUnique({ where: { key: k } })
    if (existing) {
      const updated = await db.siteSetting.update({
        where: { key: k },
        data: { value: v, updatedBy: admin.id },
      })
      results.push({ key: k, updated: true })
    } else {
      const created = await db.siteSetting.create({
        data: {
          key: k,
          value: v,
          category: 'general',
          updatedBy: admin.id,
        },
      })
      results.push({ key: k, created: true })
    }
  }

  await audit('SETTINGS_UPDATE', admin.id, null, { count: results.length, keys: results.map(r => r.key) }, ip)

  return jsonResponse({
    results,
    message: `${results.length} setting(s) updated`,
  })
}
