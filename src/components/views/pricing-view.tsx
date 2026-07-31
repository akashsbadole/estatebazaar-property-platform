'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  X,
  Crown,
  Sparkles,
  Building2,
  Zap,
  Shield,
  ArrowRight,
  Loader2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatPaise, type Plan, type BillingCycle } from '@/lib/plans'
import { SubscribeModal } from '@/components/subscribe-modal'

interface PlansResponse {
  plans: Plan[]
}

interface SubMeResponse {
  tier: string
  brokeragePaid: boolean
  activeSubscription: any
  currentPlan: any
}

const FAQ = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately and we prorate the difference. Downgrades take effect at the end of your current billing cycle.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We support Razorpay (UPI, credit/debit cards, net banking, wallets) and direct UPI transfers. All payments are secured with bank-grade encryption.',
  },
  {
    q: 'Is there a one-time brokerage signup fee?',
    a: 'Yes, professional brokers pay a one-time ₹99 brokerage signup fee at registration. This covers identity verification and onboarding. The fee is waived for individual homeowners.',
  },
  {
    q: 'What happens when my subscription expires?',
    a: 'Your listings remain visible but new listings are blocked. Existing chats and favorites continue to work. Reactivate anytime to restore full access.',
  },
  {
    q: 'How does the Verified Listing badge work?',
    a: 'On Pro and Broker plans, you can request verification for any listing. Our team manually reviews the property documents and grants the verified badge within 48 hours. Verified listings get 3x more enquiries.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes, within the first 7 days of a monthly subscription or 14 days of a yearly subscription, if you have not posted more than 3 listings, we offer a full refund. Contact support for assistance.',
  },
]

export function PricingView() {
  const { user, openAuthModal, navigate, fetchUser } = useApp()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY')
  const [currentTier, setCurrentTier] = useState<string>('FREE')
  const [subscribeModalPlan, setSubscribeModalPlan] = useState<Plan | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<PlansResponse>('/api/plans'),
      user ? apiGet<SubMeResponse>('/api/subscriptions/me').catch(() => null) : Promise.resolve(null),
    ])
      .then(([p, s]) => {
        setPlans(p.plans)
        if (s) setCurrentTier(s.tier)
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleSubscribe = (plan: Plan) => {
    if (!user) {
      openAuthModal('signup')
      return
    }
    if (plan.code === 'FREE') {
      navigate({ name: 'home' })
      return
    }
    if (plan.code === currentTier) {
      // Already on this plan
      return
    }
    setSubscribeModalPlan(plan)
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/20 border-b">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <Badge className="mb-4 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> Plans for every seller
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Choose the plan that fits <br className="hidden md:block" />
            <span className="text-primary">your selling needs</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            From free listings for one-time sellers to unlimited inventory for professional brokers.
            Cancel anytime. No hidden fees.
          </p>

          {/* Billing cycle toggle */}
          <div className="inline-flex items-center gap-1 bg-card border rounded-full p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'MONTHLY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billingCycle === 'YEARLY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white border-0 text-xs">Save 16%</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(plan => {
              const price = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
              const isCurrent = plan.code === currentTier
              const isPopular = plan.popular
              return (
                <Card
                  key={plan.id}
                  className={`relative p-6 flex flex-col ${
                    isPopular ? 'border-primary border-2 shadow-lg md:scale-105' : ''
                  }`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                      <Crown className="h-3 w-3 mr-1" /> Most Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-3 right-4 bg-emerald-500 text-white border-0">
                      Current Plan
                    </Badge>
                  )}

                  <div className="mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {plan.code === 'FREE' && <Building2 className="h-5 w-5 text-muted-foreground" />}
                      {plan.code === 'PRO' && <Zap className="h-5 w-5 text-primary" />}
                      {plan.code === 'BROKER' && <Crown className="h-5 w-5 text-amber-500" />}
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.tagline}</p>
                  </div>

                  <div className="mb-6">
                    {price === 0 ? (
                      <div className="text-4xl font-bold">Free</div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">{formatPaise(price)}</span>
                          <span className="text-sm text-muted-foreground">
                            /{billingCycle === 'YEARLY' ? 'year' : 'month'}
                          </span>
                        </div>
                        {billingCycle === 'YEARLY' && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Equivalent to {formatPaise(price / 12)}/mo — save 16%
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent}
                    className={`w-full mb-6 ${
                      isPopular
                        ? 'bg-primary hover:bg-primary/90'
                        : isCurrent
                          ? 'bg-emerald-500 hover:bg-emerald-500'
                          : ''
                    }`}
                    variant={isPopular ? 'default' : isCurrent ? 'default' : 'outline'}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Your Current Plan
                      </>
                    ) : plan.code === 'FREE' ? (
                      'Get Started Free'
                    ) : (
                      <>Subscribe to {plan.name} <ArrowRight className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>

                  <div className="space-y-2.5 flex-1">
                    {plan.featureLabels.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Shield, title: 'Secure Payments', desc: 'Razorpay-verified, 256-bit SSL' },
            { icon: Zap, title: 'Instant Activation', desc: 'Subscription activates immediately' },
            { icon: Building2, title: 'No Hidden Fees', desc: 'Transparent pricing, no surprises' },
            { icon: Check, title: 'Cancel Anytime', desc: 'No long-term contracts' },
          ].map(t => (
            <Card key={t.title} className="p-4 text-center">
              <t.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-sm font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Brokerage signup callout */}
      <section className="container mx-auto px-4 pb-12">
        <Card className="p-6 md:p-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Professional Broker? Pay ₹99 one-time signup fee</h3>
              <p className="text-sm text-muted-foreground">
                Brokers pay a one-time ₹99 brokerage signup fee at registration. This covers identity verification,
                KYC, and onboarding support. The fee is waived for individual homeowners posting their own properties.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30 shrink-0"
              onClick={() => user ? navigate({ name: 'profile' }) : openAuthModal('signup')}
            >
              Get Started
            </Button>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about our plans and payments.</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to supercharge your property sales?</h2>
              <p className="opacity-90">Join 10,000+ sellers who trust EstateBazaar to find serious buyers faster.</p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 shrink-0"
              onClick={() => user ? navigate({ name: 'post' }) : openAuthModal('signup')}
            >
              {user ? 'Post Your Property' : 'Get Started Free'}
            </Button>
          </div>
        </Card>
      </section>

      {/* Subscribe Modal */}
      {subscribeModalPlan && (
        <SubscribeModal
          plan={subscribeModalPlan}
          billingCycle={billingCycle}
          onClose={() => setSubscribeModalPlan(null)}
          onSuccess={(tier) => {
            setCurrentTier(tier)
            setSubscribeModalPlan(null)
            // Refresh the user object so the tier badge shows in the header
            fetchUser()
            navigate({ name: 'profile' })
          }}
        />
      )}
    </div>
  )
}
