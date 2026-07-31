'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Copy,
  ArrowLeft,
  Shield,
  Sparkles,
} from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { formatPaise, type Plan, type BillingCycle } from '@/lib/plans'
import { toast } from 'sonner'

interface Props {
  plan: Plan
  billingCycle: BillingCycle
  onClose: () => void
  onSuccess: (tier: string) => void
}

type Step = 'method' | 'upi' | 'success'
type Method = 'RAZORPAY' | 'UPI' | 'DEMO'

export function SubscribeModal({ plan, billingCycle, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('method')
  const [loading, setLoading] = useState(false)
  const [upiData, setUpiData] = useState<any>(null)
  const [upiRef, setUpiRef] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [subscriptionId, setSubscriptionId] = useState<string>('')

  const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly

  // Load Razorpay checkout script when needed
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise(resolve => {
      if (window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Generate QR code when UPI data arrives
  useEffect(() => {
    if (!upiData?.deepLink) return
    QRCode.toDataURL(upiData.deepLink, { width: 256, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [upiData])

  // ---- Razorpay flow ----
  const payWithRazorpay = async () => {
    setLoading(true)
    try {
      // 1. Create subscription + Razorpay order on server
      const res = await apiPost<any>('/api/subscriptions/subscribe', {
        planCode: plan.code,
        billingCycle,
        method: 'RAZORPAY',
      })

      // If demo-mode auto-activated (no Razorpay keys configured), show success
      if (res.activated) {
        setStep('success')
        return
      }

      const rzp = res.razorpay
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay checkout. Try UPI instead.')
        return
      }

      // 2. Open Razorpay checkout
      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        name: rzp.name,
        description: rzp.description,
        order_id: rzp.orderId,
        prefill: rzp.prefill,
        notes: rzp.notes,
        theme: { color: '#0e7490' },
        handler: async (response: any) => {
          // 3. Verify payment on server
          try {
            const verifyRes = await apiPost<any>('/api/payments/verify', {
              paymentId: res.paymentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            if (verifyRes.activated) {
              setStep('success')
              toast.success('Subscription activated!')
            }
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed')
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. You can try again.')
          },
        },
      }
      const rzpInstance = new (window as any).Razorpay(options)
      rzpInstance.on('payment.failed', (resp: any) => {
        toast.error(resp.error.description || 'Payment failed')
      })
      rzpInstance.open()
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  // ---- UPI flow ----
  const payWithUpi = async () => {
    setLoading(true)
    try {
      const res = await apiPost<any>('/api/subscriptions/subscribe', {
        planCode: plan.code,
        billingCycle,
        method: 'UPI',
      })
      setUpiData(res.upi)
      setSubscriptionId(res.subscriptionId)
      setStep('upi')
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate UPI payment')
    } finally {
      setLoading(false)
    }
  }

  // ---- UPI confirm ----
  const confirmUpiPayment = async () => {
    if (!upiRef.trim()) {
      toast.error('Please enter the UPI transaction reference')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<any>('/api/payments/upi', {
        paymentId: upiData.paymentId,
        upiRef: upiRef.trim(),
      })
      if (res.activated) {
        setStep('success')
        toast.success('Subscription activated!')
      }
    } catch (err: any) {
      toast.error(err.message || 'UPI verification failed')
    } finally {
      setLoading(false)
    }
  }

  // ---- Demo flow (instant) ----
  const payWithDemo = async () => {
    setLoading(true)
    try {
      const res = await apiPost<any>('/api/subscriptions/subscribe', {
        planCode: plan.code,
        billingCycle,
        method: 'DEMO',
      })
      if (res.activated) {
        setStep('success')
        toast.success('Demo payment successful — subscription activated!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const copyUpiId = () => {
    if (upiData?.upiId) {
      navigator.clipboard.writeText(upiData.upiId)
      toast.success('UPI ID copied')
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'method' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Subscribe to {plan.name}
              </DialogTitle>
              <DialogDescription>
                {plan.name} plan · {billingCycle.toLowerCase()} billing ·{' '}
                <span className="font-semibold text-foreground">{formatPaise(amount)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Button
                onClick={payWithRazorpay}
                disabled={loading}
                className="w-full justify-start h-14"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Pay with Razorpay</div>
                  <div className="text-xs opacity-80">Cards, UPI, wallets, net banking</div>
                </div>
              </Button>

              <Button
                onClick={payWithUpi}
                disabled={loading}
                variant="outline"
                className="w-full justify-start h-14"
                size="lg"
              >
                <Smartphone className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Pay with UPI QR</div>
                  <div className="text-xs text-muted-foreground">Scan &amp; pay with any UPI app</div>
                </div>
              </Button>

              <Button
                onClick={payWithDemo}
                disabled={loading}
                variant="ghost"
                className="w-full justify-start h-12 text-muted-foreground"
                size="sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-xs">Skip payment (demo mode — instant activation)</span>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
              <Shield className="h-3.5 w-3.5" />
              Secured by Razorpay · 256-bit SSL encryption
            </div>
          </>
        )}

        {step === 'upi' && upiData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Scan &amp; Pay with UPI
              </DialogTitle>
              <DialogDescription>
                Use any UPI app (GPay, PhonePe, Paytm, BHIM) to scan the QR and pay{' '}
                <span className="font-semibold text-foreground">{formatPaise(amount)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-lg border-2 border-border">
                  <img src={qrDataUrl} alt="UPI QR Code" width={220} height={220} />
                </div>
              ) : (
                <div className="h-[244px] flex items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="w-full space-y-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                  <div>
                    <div className="text-xs text-muted-foreground">Pay to UPI ID</div>
                    <div className="font-mono text-sm">{upiData.upiId}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyUpiId}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Amount: <span className="font-semibold text-foreground">₹ {upiData.amount}</span> · Ref: {upiData.note}
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="upi-ref">UPI Transaction Reference (12-digit UTR)</Label>
                <Input
                  id="upi-ref"
                  placeholder="e.g. 452819637012"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  maxLength={22}
                />
                <p className="text-xs text-muted-foreground">
                  Find the 12-digit UTR in your UPI app&apos;s payment confirmation.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('method')} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={confirmUpiPayment} disabled={loading || !upiRef.trim()} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I&apos;ve Paid — Verify
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                Payment Successful!
              </DialogTitle>
              <DialogDescription>
                Your {plan.name} subscription is now active. Enjoy all the premium features!
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <Badge className="bg-emerald-500/90 hover:bg-emerald-500 border-0">
                {plan.name} Plan Active
              </Badge>
              <div className="text-sm text-muted-foreground">
                You can now post up to{' '}
                {plan.features.maxListings === -1 ? 'unlimited' : plan.features.maxListings} listings with{' '}
                {plan.features.maxImagesPerListing} photos each.
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => onSuccess(plan.code)}
                className="w-full"
                size="lg"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Got it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
