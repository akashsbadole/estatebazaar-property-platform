import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyOtp,
  setSessionCookie,
  sanitizeString,
  rateLimit,
  jsonResponse,
  authResponse,
  errorResponse,
  getClientIp,
  audit,
  generateCsrfToken,
} from '@/lib/auth'

// POST /api/auth/verify-otp
// Body: { identifier, code, purpose, userId? }
//   purpose: SIGNUP | LOGIN
// On success:
//   - if SIGNUP, marks user verified and logs in
//   - if LOGIN, logs in
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`verify-otp:${ip}`, 10, 60_000)
  if (!rl.ok) return errorResponse('Too many attempts. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const identifier = sanitizeString(body.identifier || '', 200).toLowerCase()
  const code = sanitizeString(body.code || '', 10)
  const purpose = body.purpose === 'LOGIN' ? 'LOGIN' : 'SIGNUP'
  const userId = body.userId ? sanitizeString(body.userId, 50) : undefined

  if (!identifier || !code) return errorResponse('Identifier and code are required', 400)

  const ok = await verifyOtp(identifier, code, purpose)
  if (!ok) {
    return errorResponse('Invalid or expired OTP', 400)
  }

  // Look up user
  let user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier }, ...(identifier.match(/^[\d\s+()-]+$/) ? [{ phone: identifier }] : [])],
    },
  })

  if (!user && userId) {
    user = await db.user.findUnique({ where: { id: userId } })
  }

  if (!user) {
    return errorResponse('User not found', 404)
  }

  if (!user.isVerified) {
    user = await db.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    })
  }

  const sessionToken = await setSessionCookie({
    sub: user.id,
    email: user.email,
    role: user.role as 'USER' | 'ADMIN',
    name: user.name,
  })

  const csrfToken = generateCsrfToken(sessionToken)

  await audit('OTP_VERIFIED', user.id, user.id, { purpose }, ip)

  return authResponse({
    message: 'Verified and logged in',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      joinedDate: user.joinedDate,
      subscriptionTier: user.subscriptionTier,
      brokeragePaid: user.brokeragePaid,
    },
  }, csrfToken)
}
