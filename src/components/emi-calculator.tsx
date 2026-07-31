'use client'

import { useState, useMemo } from 'react'
import { Calculator, IndianRupee, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPriceFull } from '@/lib/constants'

interface Props {
  /** Property price in rupees */
  price: number
}

// Standard Indian home loan formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
// where P = principal, r = monthly interest rate, n = tenure in months
function calculateEMI(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / months
  const pow = Math.pow(1 + r, months)
  return (principal * r * pow) / (pow - 1)
}

export function EmiCalculator({ price }: Props) {
  // Default: 80% of price as loan, 8.5% interest (typical Indian home loan rate), 20 years
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [interestRate, setInterestRate] = useState(8.5)
  const [tenureYears, setTenureYears] = useState(20)

  const { loanAmount, emi, totalInterest, totalPayable } = useMemo(() => {
    const downPayment = Math.round((price * downPaymentPct) / 100)
    const loan = price - downPayment
    const months = tenureYears * 12
    const monthlyEmi = calculateEMI(loan, interestRate, months)
    const total = monthlyEmi * months
    return {
      loanAmount: loan,
      emi: Math.round(monthlyEmi),
      totalInterest: Math.round(total - loan),
      totalPayable: Math.round(total),
    }
  }, [price, downPaymentPct, interestRate, tenureYears])

  const principalPct = loanAmount > 0 ? Math.round((loanAmount / totalPayable) * 100) : 0
  const interestPct = 100 - principalPct

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          EMI Calculator
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDownPaymentPct(20)
            setInterestRate(8.5)
            setTenureYears(20)
          }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
      </div>

      <div className="space-y-5">
        {/* Quick summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Monthly EMI</div>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {formatPriceFull(emi)}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            for {loanAmount > 0 ? formatPriceFull(loanAmount) : '—'} loan
          </div>
        </div>

        {/* Down payment % */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Down Payment</Label>
            <Badge variant="outline">{downPaymentPct}% · {formatPriceFull(Math.round((price * downPaymentPct) / 100))}</Badge>
          </div>
          <Slider
            value={[downPaymentPct]}
            onValueChange={v => setDownPaymentPct(v[0] || 0)}
            min={0}
            max={90}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>90%</span>
          </div>
        </div>

        {/* Interest rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Interest Rate (p.a.)</Label>
            <Badge variant="outline">{interestRate.toFixed(1)}%</Badge>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={v => setInterestRate(v[0] || 0)}
            min={6}
            max={15}
            step={0.1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>6%</span>
            <span>15%</span>
          </div>
        </div>

        {/* Tenure */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Loan Tenure</Label>
            <Badge variant="outline">{tenureYears} years</Badge>
          </div>
          <Slider
            value={[tenureYears]}
            onValueChange={v => setTenureYears(v[0] || 0)}
            min={5}
            max={30}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 yrs</span>
            <span>30 yrs</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan Amount</span>
            <span className="font-medium">{formatPriceFull(loanAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Interest</span>
            <span className="font-medium text-amber-600">{formatPriceFull(totalInterest)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-medium">Total Payable</span>
            <span className="font-bold">{formatPriceFull(totalPayable)}</span>
          </div>
        </div>

        {/* Visual split bar */}
        {loanAmount > 0 && (
          <div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div className="bg-primary" style={{ width: `${principalPct}%` }} />
              <div className="bg-amber-500" style={{ width: `${interestPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" /> Principal ({principalPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Interest ({interestPct}%)
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          * Indicative EMI based on standard home loan formula. Actual rates may vary by bank, credit
          score, and loan amount. Contact your bank for an exact quote.
        </p>
      </div>
    </Card>
  )
}
