import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createOtp,
  verifyOtp,
  hashPassword,
  isValidEmail,
  sanitizeString,
  rateLimit,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

// POST /api/auth/forgot-password
// Two-step flow controlled by `step` in body:
//   step=send  → Body: { email } → generates and "sends" OTP
//   step=reset → Body: { email, code, newPassword } → verifies OTP and updates password
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`forgot-pw:${ip}`, 5, 60_000)
  if (!rl.ok) return errorResponse('Too many attempts. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const step = body.step === 'reset' ? 'reset' : 'send'
  const email = sanitizeString(body.email || '', 200).toLowerCase()
  if (!isValidEmail(email)) return errorResponse('Valid email is required', 400)

  // Look up the user
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    // For privacy, return success even if user doesn't exist (don't leak account existence)
    return jsonResponse({
      message: 'If an account exists with this email, an OTP has been sent.',
      ...(step === 'send' && user ? { otpPreview: 'demo-otp-returned-separately' } : {}),
    })
  }

  if (step === 'send') {
    const otp = await createOtp(email, 'RESET', user.id)
    await audit('PASSWORD_RESET_OTP_SENT', user.id, user.id, { email }, ip)
    return jsonResponse({
      message: 'If an account exists with this email, an OTP has been sent.',
      otpPreview: otp.code, // demo only — remove in production
      userId: user.id,
    })
  }

  // step === 'reset'
  const code = sanitizeString(body.code || '', 10)
  const newPassword = String(body.newPassword || '')

  if (!code) return errorResponse('OTP code is required', 400)
  if (newPassword.length < 6) return errorResponse('New password must be at least 6 characters', 400)

  const ok = await verifyOtp(email, code, 'RESET')
  if (!ok) {
    return errorResponse('Invalid or expired OTP', 400)
  }

  const newHash = await hashPassword(newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

  await audit('PASSWORD_RESET_COMPLETE', user.id, user.id, {}, ip)

  return jsonResponse({ message: 'Password reset successful. You can now log in with your new password.' })
}
