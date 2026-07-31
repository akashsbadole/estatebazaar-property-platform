import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/subscriptions/me — returns current user's active subscription + plan
export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  const [activeSub, latestSub, planRows] = await Promise.all([
    db.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    }),
    db.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  const currentPlan = planRows.find(p => p.code === user.subscriptionTier) || planRows.find(p => p.code === 'FREE')!

  return jsonResponse({
    tier: user.subscriptionTier,
    brokeragePaid: user.brokeragePaid,
    activeSubscription: activeSub
      ? {
          id: activeSub.id,
          planCode: activeSub.planCode,
          billingCycle: activeSub.billingCycle,
          startsAt: activeSub.startsAt,
          expiresAt: activeSub.expiresAt,
          status: activeSub.status,
          plan: activeSub.plan,
        }
      : null,
    latestSubscription: latestSub
      ? { id: latestSub.id, status: latestSub.status, createdAt: latestSub.createdAt }
      : null,
    currentPlan,
  })
}
