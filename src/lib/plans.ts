// Subscription plan definitions, feature matrix, and helpers.

export type PlanCode = 'FREE' | 'PRO' | 'BROKER'
export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type PaymentMethod = 'RAZORPAY' | 'UPI' | 'DEMO'

export interface PlanFeatures {
  maxListings: number // -1 means unlimited
  maxImagesPerListing: number
  verifiedListingBadge: boolean
  prioritySupport: boolean
  analytics: boolean
  leadManagement: boolean
  apiAccess: boolean
  featuredPlacement: boolean
}

export interface Plan {
  id: string
  code: PlanCode
  name: string
  tagline: string
  priceMonthly: number // in paise
  priceYearly: number  // in paise
  features: PlanFeatures
  featureLabels: string[] // human-readable bullet points for UI
  sortOrder: number
  popular?: boolean
}

// Default plans — used for seeding and as a fallback if DB doesn't have them.
export const DEFAULT_PLANS: Omit<Plan, 'id'>[] = [
  {
    code: 'FREE',
    name: 'Free',
    tagline: 'For occasional sellers posting a single property',
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 1,
    features: {
      maxListings: 3,
      maxImagesPerListing: 3,
      verifiedListingBadge: false,
      prioritySupport: false,
      analytics: false,
      leadManagement: false,
      apiAccess: false,
      featuredPlacement: false,
    },
    featureLabels: [
      'Up to 3 active listings',
      'Up to 3 photos per listing',
      'Basic search & filters',
      'In-app chat with buyers',
      'Community support',
    ],
  },
  {
    code: 'PRO',
    name: 'Pro',
    tagline: 'For power sellers and small brokers',
    priceMonthly: 49900,  // ₹499
    priceYearly: 499900,  // ₹4,999 (save 16%)
    sortOrder: 2,
    popular: true,
    features: {
      maxListings: 50,
      maxImagesPerListing: 10,
      verifiedListingBadge: true,
      prioritySupport: true,
      analytics: true,
      leadManagement: false,
      apiAccess: false,
      featuredPlacement: true,
    },
    featureLabels: [
      'Up to 50 active listings',
      'Up to 10 photos per listing',
      'Verified listing badge',
      'Priority email & chat support',
      'Listing analytics dashboard',
      'Featured placement in search',
    ],
  },
  {
    code: 'BROKER',
    name: 'Broker',
    tagline: 'For professional brokers and agencies',
    priceMonthly: 149900, // ₹1,499
    priceYearly: 1499900, // ₹14,999 (save 16%)
    sortOrder: 3,
    features: {
      maxListings: -1, // unlimited
      maxImagesPerListing: 20,
      verifiedListingBadge: true,
      prioritySupport: true,
      analytics: true,
      leadManagement: true,
      apiAccess: true,
      featuredPlacement: true,
    },
    featureLabels: [
      'Unlimited active listings',
      'Up to 20 photos per listing',
      'Verified listing badge',
      'Dedicated priority support',
      'Advanced analytics + export',
      'Lead management dashboard',
      'API access for bulk listing',
      'Featured placement in search',
    ],
  },
]

// One-time brokerage signup fee (only for BROKER plan role at signup).
export const BROKERAGE_SIGNUP_FEE_PAISE = 9900 // ₹99

// Helper: format paise as Indian rupee string
export function formatPaise(paise: number): string {
  return `₹ ${(paise / 100).toLocaleString('en-IN')}`
}

// Helper: get plan by code from DB-fetched list
export function getPlanByCode(plans: Plan[], code: PlanCode): Plan | undefined {
  return plans.find(p => p.code === code)
}

// Helper: check whether user can post a new listing
export function canPostNewListing(currentListingsCount: number, tier: string, plans: Plan[]): { ok: boolean; reason?: string; limit: number } {
  const plan = plans.find(p => p.code === tier) || plans.find(p => p.code === 'FREE')!
  const limit = plan.features.maxListings
  if (limit === -1) return { ok: true, limit }
  if (currentListingsCount >= limit) {
    return {
      ok: false,
      reason: `Your ${plan.name} plan allows up to ${limit} listings. Upgrade to post more.`,
      limit,
    }
  }
  return { ok: true, limit }
}

// Helper: max images per listing for a tier
export function maxImagesForTier(tier: string, plans: Plan[]): number {
  const plan = plans.find(p => p.code === tier) || plans.find(p => p.code === 'FREE')!
  return plan.features.maxImagesPerListing
}
