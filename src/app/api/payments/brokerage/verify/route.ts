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

// POST /api/payments/brokerage/verify
// Body: { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
// Verifies the Razorpay signature and marks brokerage fee as paid if valid.
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
  })
  if (!payment) return errorResponse('Payment not found', 404)
  if (payment.userId !== user.id) return errorResponse('Not authorized', 403)
  if (payment.status === 'PAID') return errorResponse('Payment already verified', 409)
  if (payment.type !== 'BROKERAGE_SIGNUP') return errorResponse('Not a brokerage payment', 400)

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
    await audit('BROKERAGE_VERIFY_FAILED', user.id, paymentId, { razorpayOrderId }, ip)
    return errorResponse('Signature verification failed', 400)
  }

  // Mark brokerage as paid
  await db.$transaction([
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
      data: { brokeragePaid: true },
    }),
  ])

  await audit('BROKERAGE_SIGNUP_COMPLETED', user.id, paymentId, { method: 'RAZORPAY' }, ip)

  return jsonResponse({
    verified: true,
    brokeragePaid: true,
    message: 'Brokerage fee verified and paid.',
  })
}

// POST /api/payments/brokerage/verify-upi
// Body: { paymentId, upiRef }
// Manual verification for UPI payments
export async function PUT(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const paymentId = body.paymentId
  const upiRef = body.upiRef

  if (!paymentId) {
    return errorResponse('Missing paymentId', 400)
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  })
  if (!payment) return errorResponse('Payment not found', 404)
  if (payment.userId !== user.id) return errorResponse('Not authorized', 403)
  if (payment.status === 'PAID') return errorResponse('Payment already verified', 409)
  if (payment.type !== 'BROKERAGE_SIGNUP') return errorResponse('Not a brokerage payment', 400)

  // Mark brokerage as paid (manual UPI verification)
  await db.$transaction([
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        upiRef: upiRef || `upi_manual_${Date.now()}`,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { brokeragePaid: true },
    }),
  ])

  await audit('BROKERAGE_SIGNUP_COMPLETED', user.id, paymentId, { method: 'UPI', upiRef }, ip)

  return jsonResponse({
    verified: true,
    brokeragePaid: true,
    message: 'Brokerage fee verified and paid.',
  })
}