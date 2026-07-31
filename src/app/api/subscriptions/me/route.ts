import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// DELETE /api/subscriptions/me
// Cancel the current user's active subscription
export async function DELETE(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  const subscription = await db.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { plan: true },
  })

  if (!subscription) {
    return errorResponse('No active subscription found', 404)
  }

  // Cancel the subscription
  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELLED' },
  })

  // Downgrade user to FREE tier
  await db.user.update({
    where: { id: user.id },
    data: { subscriptionTier: 'FREE' },
  })

  await audit('SUBSCRIPTION_CANCELLED', user.id, subscription.id, {
    planCode: subscription.planCode,
  }, ip)

  return jsonResponse({
    message: 'Subscription cancelled. You will retain access until the end of the billing period.',
    cancelledAt: new Date().toISOString(),
  })
}

// PATCH /api/subscriptions/me
// Upgrade/downgrade subscription (immediate or at period end)
export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const newPlanCode = String(body.planCode || '').toUpperCase()
  const billingCycle = String(body.billingCycle || 'MONTHLY').toUpperCase()
  const immediate = Boolean(body.immediate) // if true, prorate and charge now; if false, schedule at period end

  if (!['PRO', 'BROKER', 'FREE'].includes(newPlanCode)) {
    return errorResponse('Invalid plan code', 400)
  }

  const currentSubscription = await db.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { plan: true },
  })

  // If downgrading to FREE, just cancel
  if (newPlanCode === 'FREE') {
    if (currentSubscription) {
      await db.subscription.update({
        where: { id: currentSubscription.id },
        data: { status: 'CANCELLED' },
      })
      await db.user.update({
        where: { id: user.id },
        data: { subscriptionTier: 'FREE' },
      })
      await audit('SUBSCRIPTION_CANCELLED', user.id, currentSubscription.id, { planCode: 'FREE' }, ip)
    }
    return jsonResponse({ message: 'Downgraded to Free plan' })
  }

  // If upgrading/changing plan
  const newPlan = await db.subscriptionPlan.findFirst({
    where: { code: newPlanCode, isActive: true },
  })

  if (!newPlan) {
    return errorResponse('Plan not found', 404)
  }

  if (currentSubscription) {
    if (currentSubscription.planCode === newPlanCode && currentSubscription.billingCycle === billingCycle) {
      return errorResponse('Already subscribed to this plan', 409)
    }

    if (immediate) {
      // Cancel current, create new subscription with immediate payment
      await db.subscription.update({
        where: { id: currentSubscription.id },
        data: { status: 'CANCELLED' },
      })
    } else {
      // Schedule change at period end
      await db.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: 'PENDING_CHANGE',
        },
      })
      await audit('SUBSCRIPTION_CHANGE_SCHEDULED', user.id, currentSubscription.id, { newPlanCode, billingCycle }, ip)
      return jsonResponse({
        message: `Plan change scheduled for ${currentSubscription.expiresAt?.toISOString()}`,
        scheduled: true,
      })
    }
  }

  // Create new subscription (immediate or for new user)
  const amount = billingCycle === 'YEARLY' ? newPlan.priceYearly : newPlan.priceMonthly
  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  if (billingCycle === 'YEARLY') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  else expiresAt.setMonth(expiresAt.getMonth() + 1)

  const subscription = await db.subscription.create({
    data: {
      userId: user.id,
      planId: newPlan.id,
      planCode: newPlan.code,
      billingCycle,
      amount,
      status: 'PENDING',
      startsAt,
      expiresAt,
    },
  })

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      type: 'SUBSCRIPTION',
      method: 'DEMO', // Will be overridden by client to RAZORPAY/UPI
      amount,
      currency: 'INR',
      status: 'CREATED',
    },
  })

  await audit('SUBSCRIPTION_CHANGE_INITIATED', user.id, subscription.id, { planCode: newPlanCode, billingCycle, immediate }, ip)

  return jsonResponse({
    subscriptionId: subscription.id,
    paymentId: payment.id,
    planCode: newPlan.code,
    billingCycle,
    amount,
    activated: false,
    message: 'Proceed to payment to activate new plan',
  })
}