import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/[id]
// Body: { isBanned?, isVerified?, role? }
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
  if (typeof body.isBanned === 'boolean') data.isBanned = body.isBanned
  if (typeof body.isVerified === 'boolean') data.isVerified = body.isVerified
  if (body.role === 'USER' || body.role === 'ADMIN') data.role = body.role

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return errorResponse('User not found', 404)
  if (user.id === admin.id && body.isBanned) {
    return errorResponse('You cannot ban yourself', 400)
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isBanned: true, isVerified: true, joinedDate: true },
  })

  await audit('USER_MODERATE', admin.id, id, data, ip)

  return jsonResponse({ user: updated, message: 'User updated' })
}
