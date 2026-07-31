import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  sanitizeString,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

// GET /api/users/me
export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  const full = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      avatarUrl: true,
      joinedDate: true,
      emailNotifications: true,
      _count: { select: { properties: true, favorites: true } },
    },
  })
  return jsonResponse({ user: full })
}

// PATCH /api/users/me
// Body: { name?, phone?, avatarUrl? }
export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const data: any = {}
  if (body.name !== undefined) {
    const name = sanitizeString(body.name, 100)
    if (!name) return errorResponse('Name cannot be empty', 400)
    data.name = name
  }
  if (body.phone !== undefined) {
    if (body.phone && !/^[\d\s+()-]{8,15}$/.test(body.phone)) {
      return errorResponse('Invalid phone number', 400)
    }
    data.phone = body.phone || null
  }
  if (body.avatarUrl !== undefined) {
    data.avatarUrl = body.avatarUrl ? sanitizeString(body.avatarUrl, 2000) : null
  }
  if (typeof body.emailNotifications === 'boolean') {
    data.emailNotifications = body.emailNotifications
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      avatarUrl: true,
      joinedDate: true,
    },
  })

  await audit('USER_UPDATE', user.id, user.id, { fields: Object.keys(data) }, ip)

  return jsonResponse({ user: updated, message: 'Profile updated' })
}
