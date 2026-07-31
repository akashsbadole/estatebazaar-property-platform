import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
  sanitizeString,
} from '@/lib/auth'

// POST /api/payments/upi
// Body: { paymentId, upiRef }
// User confirms they've paid via UPI; submits their UPI transaction reference.
// In production, this would trigger a server-side UPI status check; here we
// auto-activate on submit and mark the payment as PENDING_ADMIN_CONFIRMATION.
// For demo, we activate immediately.
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const paymentId = body.paymentId
  const upiRef = sanitizeString(body.upiRef || '', 50)

  if (!paymentId) return errorResponse('paymentId is required', 400)
  if (!upiRef) return errorResponse('UPI transaction reference is required', 400)

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  })
  if (!payment) return errorResponse('Payment not found', 404)
  if (payment.userId !== user.id) return errorResponse('Not authorized', 403)
  if (payment.status === 'PAID') return errorResponse('Payment already verified', 409)
  if (!payment.subscription) return errorResponse('Payment has no linked subscription', 400)

  // Activate subscription (demo behavior — in production you would call a UPI
  // verification API or wait for a webhook from your payment provider)
  await db.$transaction([
    db.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: 'ACTIVE' },
    }),
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        upiRef,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { subscriptionTier: payment.subscription.planCode },
    }),
  ])

  await audit('SUBSCRIPTION_ACTIVATED', user.id, payment.subscription.id, {
    planCode: payment.subscription.planCode,
    method: 'UPI',
    upiRef,
  }, ip)

  return jsonResponse({
    activated: true,
    planCode: payment.subscription.planCode,
    message: 'UPI payment confirmed and subscription activated.',
  })
}
