import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse, audit } from '@/lib/auth'
import crypto from 'crypto'

// POST /api/payments/webhook
// Razorpay webhook endpoint for payment status updates
// Verify signature using webhook secret
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not configured')
    return errorResponse('Webhook not configured', 500)
  }

  // Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return errorResponse('Missing signature', 400)
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (expectedSignature !== signature) {
    console.error('[webhook] Invalid signature')
    return errorResponse('Invalid signature', 400)
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  console.log(`[webhook] Received event: ${event.event}`)

  // Handle payment.captured event
  if (event.event === 'payment.captured') {
    const paymentEntity = event.payload.payment.entity
    const orderId = paymentEntity.order_id
    const paymentId = paymentEntity.id
    const signature = paymentEntity.signature

    // Find our payment record by providerOrderId
    const payment = await db.payment.findFirst({
      where: { providerOrderId: orderId },
      include: { subscription: true },
    })

    if (!payment) {
      console.warn(`[webhook] Payment not found for order_id: ${orderId}`)
      return jsonResponse({ received: true })
    }

    if (payment.status === 'PAID') {
      console.log(`[webhook] Payment already processed: ${paymentId}`)
      return jsonResponse({ received: true })
    }

    // Verify payment signature (additional check)
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (keySecret) {
      const expectedPaymentSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      if (expectedPaymentSignature !== signature) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', meta: JSON.stringify({ reason: 'Webhook signature mismatch' }) },
        })
        console.error('[webhook] Payment signature mismatch')
        return errorResponse('Signature mismatch', 400)
      }
    }

    // Activate subscription if linked
    if (payment.subscription) {
      await db.$transaction([
        db.subscription.update({
          where: { id: payment.subscription.id },
          data: { status: 'ACTIVE' },
        }),
        db.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            providerPaymentId: paymentId,
            providerSignature: signature,
          },
        }),
        db.user.update({
          where: { id: payment.userId },
          data: { subscriptionTier: payment.subscription.planCode },
        }),
      ])

      await audit('SUBSCRIPTION_ACTIVATED', payment.userId, payment.subscription.id, {
        planCode: payment.subscription.planCode,
        method: 'RAZORPAY',
        webhook: true,
      }, ip)

      console.log(`[webhook] Subscription activated for user ${payment.userId}`)
    } else {
      // Just mark payment as paid (e.g., for brokerage fee)
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          providerPaymentId: paymentId,
          providerSignature: signature,
        },
      })
    }
  }

  // Handle payment.failed event
  if (event.event === 'payment.failed') {
    const paymentEntity = event.payload.payment.entity
    const orderId = paymentEntity.order_id

    const payment = await db.payment.findFirst({
      where: { providerOrderId: orderId },
    })

    if (payment) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', meta: JSON.stringify({ error: paymentEntity.error_description }) },
      })
      console.log(`[webhook] Payment failed for order_id: ${orderId}`)
    }
  }

  // Handle subscription events (if using Razorpay subscriptions)
  if (event.event === 'subscription.charged') {
    const subscriptionEntity = event.payload.subscription.entity
    const paymentId = subscriptionEntity.current_payment_id
    // Handle recurring payments if needed
    console.log(`[webhook] Subscription charged: ${subscriptionEntity.id}`)
  }

  return jsonResponse({ received: true })
}