import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  setSessionCookie,
  createOtp,
  isValidEmail,
  sanitizeString,
  rateLimit,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST /api/auth/login
// Body: { email, password }
// On success issues session cookie.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`login:${ip}`, 10, 60_000)
  if (!rl.ok) return errorResponse('Too many login attempts. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const email = sanitizeString(body.email || '', 200).toLowerCase()
  const password = String(body.password || '')

  if (!isValidEmail(email)) return errorResponse('Valid email is required', 400)
  if (!password) return errorResponse('Password is required', 400)

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return errorResponse('Invalid email or password', 401)
  }

  if (user.isBanned) {
    return errorResponse('Your account has been suspended. Contact support.', 403)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return errorResponse('Invalid email or password', 401)
  }

  // If unverified, request OTP first instead of logging in
  if (!user.isVerified) {
    const otp = await createOtp(email, 'LOGIN', user.id)
    // Send the OTP via email
    const emailResult = await sendEmail({
      to: email,
      subject: 'EstateBazaar — Login verification (OTP)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="margin: 0 0 12px;">Verify your login</h2>
            <p style="color: #475569; margin: 0 0 16px;">Use this OTP to complete your login to EstateBazaar.</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #0e7490; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">${otp.code}</div>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This OTP expires in 10 minutes. If you didn't attempt to log in, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Your EstateBazaar login OTP is: ${otp.code}. This code expires in 10 minutes.`,
    })
    return jsonResponse({
      message: 'Please verify your email first. We\'ve sent an OTP to your email.',
      requiresOtp: true,
      userId: user.id,
      emailPreviewUrl: emailResult.previewUrl,
      otpPreview: emailResult.previewUrl ? otp.code : undefined,
    })
  }

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    role: user.role as 'USER' | 'ADMIN',
    name: user.name,
  })

  await audit('USER_LOGIN', user.id, user.id, { email }, ip)

  return jsonResponse({
    message: 'Login successful',
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
  })
}
