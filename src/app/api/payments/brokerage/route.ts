import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'
import type { PaymentMethod } from '@/lib/plans'

// POST /api/payments/brokerage
// Body: { method: 'RAZORPAY'|'UPI'|'DEMO' }
// Creates a payment for the one-time brokerage signup fee
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const method = String(body.method || 'DEMO').toUpperCase() as PaymentMethod
  if (!['RAZORPAY', 'UPI', 'DEMO'].includes(method)) {
    return errorResponse('Invalid payment method', 400)
  }

  // Check if user already paid brokerage fee
  if (user.brokeragePaid) {
    return errorResponse('Brokerage fee already paid', 409)
  }

  // Check if user is trying to subscribe to BROKER plan
  if (user.subscriptionTier !== 'BROKER') {
    return errorResponse('Brokerage fee only applies to BROKER plan', 400)
  }

  const amount = 9900 // ₹99 in paise (from BROKERAGE_SIGNUP_FEE_PAISE)

  // Create payment record
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      type: 'BROKERAGE_SIGNUP',
      method,
      amount,
      currency: 'INR',
      status: 'CREATED',
    },
  })

  await audit('BROKERAGE_SIGNUP_INITIATED', user.id, payment.id, { method, amount }, ip)

  // -----------------------------------------------------------------------
  // Razorpay order creation
  // -----------------------------------------------------------------------
  if (method === 'RAZORPAY') {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      // No keys configured — fall back to DEMO auto-success
      await activateBrokerage(payment.id, user.id, 'DEMO', ip)
      return jsonResponse({
        paymentId: payment.id,
        method: 'DEMO',
        amount,
        activated: true,
        message: 'Razorpay keys not configured — demo mode auto-activated.',
      })
    }
    try {
      const Razorpay = (await import('razorpay')).default
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
      const order = await rzp.orders.create({
        amount,
        currency: 'INR',
        receipt: `brokerage_${payment.id.slice(-12)}`,
        notes: {
          paymentId: payment.id,
          userId: user.id,
          type: 'BROKERAGE_SIGNUP',
        },
      })
      await db.payment.update({
        where: { id: payment.id },
        data: { providerOrderId: order.id },
      })
      return jsonResponse({
        paymentId: payment.id,
        method: 'RAZORPAY',
        amount,
        razorpay: {
          orderId: order.id,
          keyId,
          amount,
          currency: 'INR',
          name: 'EstateBazaar',
          description: 'Brokerage Signup Fee',
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || undefined,
          },
          notes: {
            paymentId: payment.id,
            userId: user.id,
          },
        },
        activated: false,
      })
    } catch (err: any) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', meta: JSON.stringify({ error: err.message }) },
      })
      return errorResponse(`Razorpay order creation failed: ${err.message}`, 500)
    }
  }

  // -----------------------------------------------------------------------
  // UPI flow
  // -----------------------------------------------------------------------
  if (method === 'UPI') {
    const upiId = process.env.UPI_MERCHANT_ID || 'estatebazaar@upi'
    const payeeName = 'EstateBazaar'
    const note = `Brokerage signup fee payment_${payment.id.slice(-8)}`
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${(amount / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    await db.payment.update({
      where: { id: payment.id },
      data: { meta: JSON.stringify({ upiDeepLink, upiId }) },
    })
    return jsonResponse({
      paymentId: payment.id,
      method: 'UPI',
      amount,
      upi: {
        deepLink: upiDeepLink,
        upiId,
        payeeName,
        amount: (amount / 100).toFixed(2),
        note,
        paymentId: payment.id,
      },
      activated: false,
      message: 'Scan the QR with any UPI app to pay. After payment, click "I have paid" to verify.',
    })
  }

  // -----------------------------------------------------------------------
  // DEMO flow — auto-activate immediately
  // -----------------------------------------------------------------------
  await activateBrokerage(payment.id, user.id, 'DEMO', ip)
  return jsonResponse({
    paymentId: payment.id,
    method: 'DEMO',
    amount,
    activated: true,
    message: 'Demo payment successful — brokerage fee paid.',
  })
}

// Helper: mark brokerage as paid and update user
async function activateBrokerage(paymentId: string, userId: string, method: string, ip: string) {
  await db.$transaction([
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        providerPaymentId: method === 'DEMO' ? `demo_${Date.now()}` : undefined,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { brokeragePaid: true },
    }),
  ])
  await audit('BROKERAGE_SIGNUP_COMPLETED', userId, paymentId, { method }, ip)
}