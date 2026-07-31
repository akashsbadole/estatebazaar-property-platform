import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createOtp,
  isValidEmail,
  sanitizeString,
  rateLimit,
  jsonResponse,
  errorResponse,
  getClientIp,
} from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST /api/auth/send-otp
// Body: { identifier, purpose }
//   identifier: email or phone
//   purpose: SIGNUP | LOGIN | RESET
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`send-otp:${ip}`, 5, 60_000)
  if (!rl.ok) return errorResponse('Too many requests. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const identifier = sanitizeString(body.identifier || '', 200).toLowerCase()
  const purpose = ['SIGNUP', 'LOGIN', 'RESET'].includes(body.purpose) ? body.purpose : 'LOGIN'

  if (!identifier) return errorResponse('Identifier is required', 400)
  if (isValidEmail(identifier) === false && !/^[\d\s+()-]+$/.test(identifier)) {
    return errorResponse('Invalid email or phone', 400)
  }

  // For LOGIN/RESET, user must exist
  if (purpose !== 'SIGNUP') {
    const user = await db.user.findFirst({
      where: {
        OR: [{ email: identifier }, ...(identifier.match(/^[\d\s+()-]+$/) ? [{ phone: identifier }] : [])],
      },
    })
    if (!user) return errorResponse('No account found with this identifier', 404)
    const otp = await createOtp(identifier, purpose, user.id)
    // Send via email
    const emailResult = await sendEmail({
      to: identifier,
      subject: `EstateBazaar — ${purpose === 'RESET' ? 'Password reset' : 'Verification'} OTP`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #475569; margin: 0 0 16px;">Your OTP for ${purpose.toLowerCase()} is:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #0e7490; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">${otp.code}</div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This OTP expires in 10 minutes.</p>
        </div>
      </div>`,
      text: `Your EstateBazaar OTP is: ${otp.code}. Expires in 10 minutes.`,
    })
    return jsonResponse({
      message: 'OTP sent to your email',
      emailPreviewUrl: emailResult.previewUrl,
      otpPreview: emailResult.previewUrl ? otp.code : undefined,
      userId: user.id,
    })
  }

  // SIGNUP — just create OTP without a user
  const otp = await createOtp(identifier, purpose)
  const emailResult = await sendEmail({
    to: identifier,
    subject: 'EstateBazaar — Verification OTP',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #475569; margin: 0 0 16px;">Your verification OTP is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #0e7490; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px;">${otp.code}</div>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This OTP expires in 10 minutes.</p>
      </div>
    </div>`,
    text: `Your EstateBazaar OTP is: ${otp.code}. Expires in 10 minutes.`,
  })
  return jsonResponse({
    message: 'OTP sent to your email',
    emailPreviewUrl: emailResult.previewUrl,
    otpPreview: emailResult.previewUrl ? otp.code : undefined,
  })
}
