import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAdmin,
  setSessionCookie,
  clearSessionCookie,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/admin/users/[id]/impersonate
// Admin "logs in as" this user for support/debugging purposes.
// The admin's session is replaced with the target user's session.
// To restore, the admin must log out and log back in.
export async function POST(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin()
  const { id } = await params
  const ip = getClientIp(request)

  const targetUser = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isVerified: true, isBanned: true, avatarUrl: true, joinedDate: true, subscriptionTier: true, brokeragePaid: true },
  })
  if (!targetUser) return errorResponse('User not found', 404)
  if (targetUser.id === admin.id) return errorResponse('Cannot impersonate yourself', 400)
  if (targetUser.isBanned) return errorResponse('Cannot impersonate a banned user', 400)
  // Don't allow impersonating other admins (privilege escalation risk)
  if (targetUser.role === 'ADMIN') return errorResponse('Cannot impersonate an admin', 403)

  // Set session as the target user
  await setSessionCookie({
    sub: targetUser.id,
    email: targetUser.email,
    role: targetUser.role as 'USER' | 'ADMIN',
    name: targetUser.name,
  })

  await audit('USER_IMPERSONATE', admin.id, targetUser.id, { targetEmail: targetUser.email }, ip)

  return jsonResponse({
    message: `You are now viewing the site as ${targetUser.name}`,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      role: targetUser.role,
      isVerified: targetUser.isVerified,
      avatarUrl: targetUser.avatarUrl,
      joinedDate: targetUser.joinedDate,
      subscriptionTier: targetUser.subscriptionTier,
      brokeragePaid: targetUser.brokeragePaid,
      impersonatedBy: admin.id,
    },
  })
}
