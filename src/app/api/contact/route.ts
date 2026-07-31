import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser,
  sanitizeString,
  isValidEmail,
  rateLimit,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST /api/contact
// Public (works for both logged-in and anonymous users).
// Body: { type?: 'ENQUIRY'|'SUPPORT', name, email, phone?, message, propertyId? }
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`contact:${ip}`, 5, 60_000)
  if (!rl.ok) return errorResponse('Too many requests. Try again later.', 429)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const type = body.type === 'SUPPORT' ? 'SUPPORT' : 'ENQUIRY'
  const name = sanitizeString(body.name || '', 100)
  const email = sanitizeString(body.email || '', 200).toLowerCase()
  const phone = body.phone ? sanitizeString(body.phone, 20) : null
  const message = sanitizeString(body.message || '', 3000)
  const propertyId = body.propertyId ? sanitizeString(body.propertyId, 50) : null

  if (!name) return errorResponse('Name is required', 400)
  if (!isValidEmail(email)) return errorResponse('Valid email is required', 400)
  if (!message) return errorResponse('Message is required', 400)
  if (type === 'ENQUIRY' && !propertyId) {
    return errorResponse('propertyId is required for enquiry type', 400)
  }

  // Validate propertyId if provided
  if (propertyId) {
    const property = await db.property.findUnique({ where: { id: propertyId } })
    if (!property) return errorResponse('Property not found', 404)
  }

  // Attach to current user if logged in
  const currentUser = await getCurrentUser()

  const contact = await db.contactRequest.create({
    data: {
      type,
      name,
      email,
      phone,
      message,
      propertyId,
      userId: currentUser?.id || null,
      status: 'NEW',
    },
    include: {
      property: {
        select: { id: true, title: true, price: true, city: true },
      },
    },
  })

  await audit('CONTACT_REQUEST_CREATE', currentUser?.id || null, contact.id, { type, email, propertyId }, ip)

  // Send a confirmation email to the user
  await sendEmail({
    to: email,
    subject: type === 'ENQUIRY'
      ? `EstateBazaar — We've received your enquiry`
      : `EstateBazaar — We've received your message`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 12px;">Hi ${name},</h2>
          <p style="color: #475569; margin: 0 0 16px;">
            ${type === 'ENQUIRY'
              ? 'Thank you for your interest in this property. Our team will review your enquiry and connect you with the property owner within 24 hours.'
              : 'Thank you for contacting EstateBazaar. Our team will get back to you within 24 hours.'
            }
          </p>
          <div style="background: white; border-left: 4px solid #0e7490; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Your message:</div>
            <div style="color: #334155;">${message}</div>
          </div>
          ${phone ? `<p style="color: #475569; font-size: 14px; margin: 16px 0 0;">We may contact you at <strong>${phone}</strong> or <strong>${email}</strong>.</p>` : `<p style="color: #475569; font-size: 14px; margin: 16px 0 0;">We'll respond to <strong>${email}</strong>.</p>`}
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Reference ID: ${contact.id}</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, thank you for contacting EstateBazaar. ${type === 'ENQUIRY' ? 'Our team will connect you with the property owner within 24 hours.' : 'Our team will get back to you within 24 hours.'} Reference: ${contact.id}`,
  }).catch(err => console.error('[contact] email failed:', err.message))

  return jsonResponse({
    contact,
    message:
      type === 'ENQUIRY'
        ? 'Thanks for your interest! Our team will reach out to you and connect you with the property owner within 24 hours.'
        : 'Thanks for contacting us! Our team will get back to you within 24 hours.',
  }, 201)
}
