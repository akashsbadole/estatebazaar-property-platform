import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  createOtp,
  verifyOtp,
  isValidEmail,
  isValidPhone,
  isValidPassword,
  sanitizeString,
  rateLimit,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST /api/auth/signup
// Body: { name, email, phone?, password }
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`signup:${ip}`, 5, 60_000)
  if (!rl.ok) return errorResponse('Too many requests. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const name = sanitizeString(body.name || '', 100)
  const email = sanitizeString(body.email || '', 200).toLowerCase()
  const phone = body.phone ? sanitizeString(body.phone, 20) : null
  const password = String(body.password || '')
  const role = body.role === 'VENDOR' ? 'VENDOR' : 'USER'

  if (!name) return errorResponse('Name is required', 400)
  if (!isValidEmail(email)) return errorResponse('Valid email is required', 400)
  if (phone && !isValidPhone(phone)) return errorResponse('Valid phone number is required', 400)
  if (!isValidPassword(password)) return errorResponse('Password must be at least 6 characters', 400)

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  })
  if (existing) {
    return errorResponse('User already exists with this email or phone', 409)
  }

  const passwordHash = await hashPassword(password)
  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role,
      isVerified: false,
    },
  })

  const otp = await createOtp(email, 'SIGNUP', user.id)

  await audit('USER_SIGNUP', user.id, user.id, { email }, ip)

  // Actually send the OTP via email (falls back to Ethereal test account
  // when SMTP is not configured — the preview URL is returned so you can
  // view the email in a browser)
  const emailResult = await sendEmail({
    to: email,
    subject: 'EstateBazaar — Verify your email (OTP)',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 12px;">Welcome to EstateBazaar, ${name}!</h2>
          <p style="color: #475569; margin: 0 0 16px;">Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #0e7490; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">${otp.code}</div>
          </div>
          <p style="color: #475569; margin: 0 0 8px;">Enter this 6-digit code in the verification screen.</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This OTP expires in 10 minutes. If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    `,
    text: `Welcome to EstateBazaar, ${name}! Your verification OTP is: ${otp.code}. This code expires in 10 minutes.`,
  })

  return jsonResponse({
    message: 'Account created. We\'ve sent a 6-digit OTP to your email.',
    userId: user.id,
    requiresOtp: true,
    // Include the email preview URL if using Ethereal (test mode)
    // In production with real SMTP, this is undefined
    emailPreviewUrl: emailResult.previewUrl,
    // Only include otpPreview in development mode (no SMTP configured)
    otpPreview: emailResult.previewUrl ? otp.code : undefined,
  })
}
