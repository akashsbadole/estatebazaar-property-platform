import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// POST /api/admin/users/bulk
// Body: { ids: string[], action: 'ban' | 'unban' | 'verify' | 'unverify' | 'delete' }
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === 'string') : []
  const action = String(body.action || '').toLowerCase()

  if (ids.length === 0) return errorResponse('At least one user ID is required', 400)
  if (ids.length > 100) return errorResponse('Cannot process more than 100 users at once', 400)
  if (!['ban', 'unban', 'verify', 'unverify', 'delete'].includes(action)) {
    return errorResponse('Invalid action. Use: ban, unban, verify, unverify, or delete', 400)
  }

  // Self-protection: never include the admin's own ID
  const safeIds = ids.filter(id => id !== admin.id)
  if (safeIds.length === 0) {
    return errorResponse('No valid user IDs (cannot action yourself)', 400)
  }

  let success = 0
  let failed = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const id of safeIds) {
    try {
      const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, name: true } })
      if (!user) {
        errors.push({ id, error: 'User not found' })
        failed++
        continue
      }
      // Protect admins from being bulk-actioned
      if (user.role === 'ADMIN') {
        errors.push({ id, error: 'Cannot action an admin' })
        failed++
        continue
      }

      if (action === 'ban') {
        await db.user.update({ where: { id }, data: { isBanned: true } })
      } else if (action === 'unban') {
        await db.user.update({ where: { id }, data: { isBanned: false } })
      } else if (action === 'verify') {
        await db.user.update({ where: { id }, data: { isVerified: true } })
      } else if (action === 'unverify') {
        await db.user.update({ where: { id }, data: { isVerified: false } })
      } else if (action === 'delete') {
        await db.user.delete({ where: { id } })
      }
      success++
    } catch (err: any) {
      errors.push({ id, error: err.message || 'Unknown error' })
      failed++
    }
  }

  await audit('USER_BULK_ACTION', admin.id, null, {
    action,
    count: safeIds.length,
    success,
    failed,
  }, ip)

  return jsonResponse({
    success,
    failed,
    total: safeIds.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Bulk ${action} complete: ${success} succeeded, ${failed} failed`,
  })
}
