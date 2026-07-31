import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/auth'
import { DEFAULT_PLANS, type Plan } from '@/lib/plans'

// GET /api/plans — public, returns all active subscription plans
export async function GET(_request: NextRequest) {
  const dbPlans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  // Map DB rows to Plan shape (parse features JSON)
  const plans: Plan[] = dbPlans.map(p => ({
    id: p.id,
    code: p.code as Plan['code'],
    name: p.name,
    tagline: p.tagline || '',
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    features: JSON.parse(p.features),
    featureLabels: DEFAULT_PLANS.find(dp => dp.code === p.code)?.featureLabels || [],
    sortOrder: p.sortOrder,
    popular: p.code === 'PRO',
  }))

  return jsonResponse({ plans })
}
