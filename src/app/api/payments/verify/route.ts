import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'
import crypto from 'crypto'

// POST /api/payments/verify
// Body: { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
// Verifies the Razorpay signature and activates the subscription if valid.
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
  const razorpayOrderId = body.razorpayOrderId
  const razorpayPaymentId = body.razorpayPaymentId
  const razorpaySignature = body.razorpaySignature

  if (!paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return errorResponse('Missing Razorpay verification fields', 400)
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  })
  if (!payment) return errorResponse('Payment not found', 404)
  if (payment.userId !== user.id) return errorResponse('Not authorized', 403)
  if (payment.status === 'PAID') return errorResponse('Payment already verified', 409)
  if (!payment.subscription) return errorResponse('Payment has no linked subscription', 400)

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return errorResponse('Razorpay keys not configured', 500)
  }

  // Verify signature: HMAC-SHA256(razorpayOrderId + '|' + razorpayPaymentId, keySecret)
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  if (expectedSignature !== razorpaySignature) {
    await db.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED', meta: JSON.stringify({ reason: 'Signature mismatch' }) },
    })
    await audit('PAYMENT_VERIFY_FAILED', user.id, paymentId, { razorpayOrderId }, ip)
    return errorResponse('Signature verification failed', 400)
  }

  // Activate subscription
  await db.$transaction([
    db.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: 'ACTIVE' },
    }),
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { subscriptionTier: payment.subscription.planCode },
    }),
  ])

  await audit('SUBSCRIPTION_ACTIVATED', user.id, payment.subscription.id, {
    planCode: payment.subscription.planCode,
    method: 'RAZORPAY',
  }, ip)

  return jsonResponse({
    activated: true,
    planCode: payment.subscription.planCode,
    message: 'Payment verified and subscription activated.',
  })
}
