import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  verifyPassword,
  clearSessionCookie,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

// DELETE /api/account/delete
// Body: { password }
// Permanently deletes the current user's account and all associated data:
//   - Properties (and their images, chats, favorites, reports)
//   - Favorites
//   - Chats (as buyer or seller) + messages
//   - Reports filed
//   - Subscriptions + payments
//   - Contact requests
//   - Recently viewed
//   - Saved searches
//   - Mortgage applications
//   - Audit log entries (actorId set to null)
//
// Requires password confirmation for security.
export async function DELETE(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const password = String(body.password || '')
  if (!password) return errorResponse('Password confirmation is required', 400)

  // Verify password
  const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, email: true } })
  if (!fullUser) return errorResponse('User not found', 404)

  const valid = await verifyPassword(password, fullUser.passwordHash)
  if (!valid) {
    return errorResponse('Password is incorrect', 401)
  }

  // Prevent admins from deleting their own account (would lock out the system)
  if (user.role === 'ADMIN') {
    return errorResponse('Admins cannot delete their own account. Ask another admin to demote you first.', 403)
  }

  // Log before deletion (so we have a record even after the user is gone)
  await audit('ACCOUNT_DELETE', user.id, user.id, { email: fullUser.email }, ip)

  // Cascade delete — Prisma onDelete: Cascade on most relations handles this.
  // The User delete will cascade to: properties, favorites, chats (buyer+seller),
  // messages, reports, otps, subscriptions, payments, contactRequests,
  // recentlyViewed, savedSearches, mortgageApplications.
  // AuditLog.actorId is nullable (onDelete: SetNull implicit).
  await db.user.delete({ where: { id: user.id } })

  // Clear session
  await clearSessionCookie()

  return jsonResponse({
    message: 'Your account has been permanently deleted. We\'re sorry to see you go!',
  })
}
