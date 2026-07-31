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
import type { BillingCycle, PaymentMethod, PlanCode } from '@/lib/plans'

// POST /api/subscriptions/subscribe
// Body: { planCode: 'PRO'|'BROKER', billingCycle: 'MONTHLY'|'YEARLY', method: 'RAZORPAY'|'UPI'|'DEMO' }
// Creates a PENDING subscription + a CREATED payment record.
// If method === 'DEMO', auto-activates immediately (for testing without real Razorpay keys).
// If method === 'RAZORPAY', creates a Razorpay order and returns order_id for client checkout.
// If method === 'UPI', generates a UPI deep link + records the pending payment.
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const planCode = String(body.planCode || '').toUpperCase() as PlanCode
  const billingCycle = String(body.billingCycle || 'MONTHLY').toUpperCase() as BillingCycle
  const method = String(body.method || 'DEMO').toUpperCase() as PaymentMethod

  if (!['PRO', 'BROKER'].includes(planCode)) {
    return errorResponse('Invalid plan code (must be PRO or BROKER)', 400)
  }
  if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
    return errorResponse('Invalid billing cycle', 400)
  }
  if (!['RAZORPAY', 'UPI', 'DEMO'].includes(method)) {
    return errorResponse('Invalid payment method', 400)
  }

  const plan = await db.subscriptionPlan.findFirst({ where: { code: planCode, isActive: true } })
  if (!plan) return errorResponse('Plan not found', 404)

  const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
  if (amount <= 0) return errorResponse('Cannot subscribe to a free plan', 400)

  // Check for an existing ACTIVE subscription — if so, reject (must cancel first)
  const existing = await db.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
  })
  if (existing) {
    return errorResponse('You already have an active subscription. Cancel it first to change plans.', 409)
  }

  // Create the subscription (PENDING until payment is verified)
  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  if (billingCycle === 'YEARLY') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  else expiresAt.setMonth(expiresAt.getMonth() + 1)

  const subscription = await db.subscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      planCode: plan.code,
      billingCycle,
      amount,
      status: 'PENDING',
      startsAt,
      expiresAt,
    },
  })

  // Create payment record
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      type: 'SUBSCRIPTION',
      method,
      amount,
      currency: 'INR',
      status: 'CREATED',
    },
  })

  await audit('SUBSCRIPTION_INITIATED', user.id, subscription.id, { planCode, billingCycle, method, amount }, ip)

  // -----------------------------------------------------------------------
  // Razorpay order creation (only if real keys are configured)
  // -----------------------------------------------------------------------
  if (method === 'RAZORPAY') {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      // No keys configured — fall back to DEMO auto-success
      await activateSubscription(subscription.id, payment.id, user.id, plan.code, 'DEMO', expiresAt, ip)
      return jsonResponse({
        subscriptionId: subscription.id,
        paymentId: payment.id,
        planCode: plan.code,
        billingCycle,
        amount,
        method: 'DEMO',
        activated: true,
        message: 'Razorpay keys not configured — demo mode auto-activated your subscription.',
      })
    }
    try {
      // Dynamic import to avoid loading Razorpay in non-Razorpay flows
      const Razorpay = (await import('razorpay')).default
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
      const order = await rzp.orders.create({
        amount,
        currency: 'INR',
        receipt: `sub_${subscription.id.slice(-12)}`,
        notes: {
          subscriptionId: subscription.id,
          paymentId: payment.id,
          userId: user.id,
          planCode: plan.code,
        },
      })
      await db.payment.update({
        where: { id: payment.id },
        data: { providerOrderId: order.id },
      })
      return jsonResponse({
        subscriptionId: subscription.id,
        paymentId: payment.id,
        planCode: plan.code,
        billingCycle,
        amount,
        method: 'RAZORPAY',
        razorpay: {
          orderId: order.id,
          keyId,
          amount,
          currency: 'INR',
          name: 'EstateBazaar',
          description: `${plan.name} plan — ${billingCycle.toLowerCase()}`,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || undefined,
          },
          notes: {
            subscriptionId: subscription.id,
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
  // UPI flow — generate UPI deep link for QR code
  // -----------------------------------------------------------------------
  if (method === 'UPI') {
    const upiId = process.env.UPI_MERCHANT_ID || 'estatebazaar@upi'
    const payeeName = 'EstateBazaar'
    const note = `${plan.code} plan ${billingCycle.toLowerCase()} sub_${subscription.id.slice(-8)}`
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${(amount / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    await db.payment.update({
      where: { id: payment.id },
      data: { meta: JSON.stringify({ upiDeepLink, upiId }) },
    })
    return jsonResponse({
      subscriptionId: subscription.id,
      paymentId: payment.id,
      planCode: plan.code,
      billingCycle,
      amount,
      method: 'UPI',
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
  await activateSubscription(subscription.id, payment.id, user.id, plan.code, 'DEMO', expiresAt, ip)
  return jsonResponse({
    subscriptionId: subscription.id,
    paymentId: payment.id,
    planCode: plan.code,
    billingCycle,
    amount,
    method: 'DEMO',
    activated: true,
    message: 'Demo payment successful — subscription activated.',
  })
}

// Helper: activate subscription + update user tier
async function activateSubscription(
  subscriptionId: string,
  paymentId: string,
  userId: string,
  planCode: string,
  method: string,
  expiresAt: Date,
  ip: string,
) {
  await db.$transaction([
    db.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE' },
    }),
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        providerPaymentId: method === 'DEMO' ? `demo_${Date.now()}` : undefined,
        upiRef: method === 'UPI' ? `upi_${Date.now()}` : undefined,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { subscriptionTier: planCode },
    }),
  ])
  await audit('SUBSCRIPTION_ACTIVATED', userId, subscriptionId, { planCode, method, expiresAt }, ip)
}
