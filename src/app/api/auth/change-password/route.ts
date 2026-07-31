import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  verifyPassword,
  hashPassword,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
  rateLimit,
} from '@/lib/auth'

// PATCH /api/auth/change-password
// Body: { currentPassword, newPassword }
export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  const rl = rateLimit(`change-pw:${ip}`, 5, 60_000)
  if (!rl.ok) return errorResponse('Too many attempts. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')

  if (!currentPassword || !newPassword) {
    return errorResponse('Current and new passwords are required', 400)
  }
  if (newPassword.length < 6) {
    return errorResponse('New password must be at least 6 characters', 400)
  }
  if (currentPassword === newPassword) {
    return errorResponse('New password must differ from current password', 400)
  }

  // Fetch the current password hash
  const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!fullUser) return errorResponse('User not found', 404)

  const valid = await verifyPassword(currentPassword, fullUser.passwordHash)
  if (!valid) {
    return errorResponse('Current password is incorrect', 401)
  }

  const newHash = await hashPassword(newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

  await audit('PASSWORD_CHANGE', user.id, user.id, {}, ip)

  return jsonResponse({ message: 'Password changed successfully' })
}
