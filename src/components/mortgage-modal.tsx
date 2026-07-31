'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Building, CheckCircle2, XCircle, Clock, IndianRupee } from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { formatPrice, formatPriceFull } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  propertyId?: string
  propertyPrice?: number
  propertyTitle?: string
}

type Result = {
  status: 'PRE_APPROVED' | 'UNDER_REVIEW' | 'REJECTED'
  partnerBank: string
  approvedAmount?: number | null
  interestRate?: number | null
  bankNotes?: string | null
}

const PARTNER_BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank']

export function MortgageModal({ open, onClose, propertyId, propertyPrice, propertyTitle }: Props) {
  const [employmentType, setEmploymentType] = useState('SALARIED')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [loanAmount, setLoanAmount] = useState(propertyPrice ? String(Math.round(propertyPrice * 0.8)) : '')
  const [tenureYears, setTenureYears] = useState('20')
  const [employerName, setEmployerName] = useState('')
  const [creditScore, setCreditScore] = useState('')
  const [existingEMIs, setExistingEMIs] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const submit = async () => {
    if (!monthlyIncome || !loanAmount || !tenureYears) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ application: any; message: string }>('/api/mortgage/apply', {
        propertyId,
        employmentType,
        monthlyIncome: Number(monthlyIncome),
        loanAmount: Number(loanAmount),
        tenureYears: Number(tenureYears),
        employerName: employerName || undefined,
        creditScore: creditScore || undefined,
        existingEMIs: existingEMIs ? Number(existingEMIs) : 0,
        notes: notes || undefined,
      })
      setResult({
        status: res.application.status,
        partnerBank: res.application.partnerBank,
        approvedAmount: res.application.approvedAmount,
        interestRate: res.application.interestRate,
        bankNotes: res.application.bankNotes,
      })
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setResult(null)
      setMonthlyIncome('')
      setEmployerName('')
      setCreditScore('')
      setExistingEMIs('')
      setNotes('')
    }, 200)
  }

  // Calculate live EMI preview
  const liveEMI = (() => {
    const p = Number(loanAmount)
    const n = Number(tenureYears) * 12
    if (!p || !n || p <= 0) return 0
    const r = 0.0085 // 8.5% annual
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
  })()

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Mortgage Pre-Approval
              </DialogTitle>
              <DialogDescription>
                Apply for a home loan pre-approval. We work with {PARTNER_BANKS.length} partner banks.
                Get an instant pre-approval decision in seconds.
              </DialogDescription>
            </DialogHeader>

            {propertyTitle && (
              <div className="bg-muted/40 rounded-md p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-0.5">Applying for property:</div>
                <div className="font-medium">{propertyTitle}</div>
                {propertyPrice && (
                  <div className="text-xs text-primary mt-1">{formatPrice(propertyPrice)}</div>
                )}
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALARIED">Salaried</SelectItem>
                    <SelectItem value="SELF_EMPLOYED">Self-Employed Professional</SelectItem>
                    <SelectItem value="BUSINESS">Business Owner</SelectItem>
                    <SelectItem value="RETIRED">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="m-income">Monthly Income (₹) *</Label>
                  <Input id="m-income" type="number" placeholder="100000" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-emi">Existing EMIs (₹/mo)</Label>
                  <Input id="m-emi" type="number" placeholder="0" value={existingEMIs} onChange={e => setExistingEMIs(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="m-loan">Loan Amount (₹) *</Label>
                  <Input id="m-loan" type="number" placeholder="8000000" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-tenure">Tenure (years) *</Label>
                  <Input id="m-tenure" type="number" placeholder="20" min="1" max="30" value={tenureYears} onChange={e => setTenureYears(e.target.value)} />
                </div>
              </div>

              {liveEMI > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approx EMI @ 8.5% p.a.</span>
                    <span className="font-bold text-primary">{formatPriceFull(liveEMI)}/mo</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="m-employer">Employer Name</Label>
                  <Input id="m-employer" placeholder="e.g. Infosys Ltd" value={employerName} onChange={e => setEmployerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-cibil">Credit Score (CIBIL)</Label>
                  <Input id="m-cibil" type="number" placeholder="750" min="300" max="900" value={creditScore} onChange={e => setCreditScore(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-notes">Notes (optional)</Label>
                <Textarea
                  id="m-notes"
                  placeholder="Any additional information for the bank..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
              </div>

              <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                <strong>Disclaimer:</strong> This is an indicative pre-approval based on the information
                you provided. Final approval is subject to document verification and bank&apos;s credit assessment.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={submit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {result.status === 'PRE_APPROVED' && (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span className="text-emerald-600">Pre-Approved!</span>
                  </>
                )}
                {result.status === 'UNDER_REVIEW' && (
                  <>
                    <Clock className="h-6 w-6 text-amber-500" />
                    <span className="text-amber-700">Under Review</span>
                  </>
                )}
                {result.status === 'REJECTED' && (
                  <>
                    <XCircle className="h-6 w-6 text-red-500" />
                    <span className="text-red-600">Not Approved</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Application submitted to <strong>{result.partnerBank}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {result.status === 'PRE_APPROVED' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className="text-xs text-muted-foreground">Approved Amount</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      ₹{result.approvedAmount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className="text-xs text-muted-foreground">Interest Rate</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      {result.interestRate}% p.a.
                    </div>
                  </div>
                </div>
              )}

              {result.bankNotes && (
                <div className={`rounded-md p-3 text-sm ${
                  result.status === 'PRE_APPROVED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : result.status === 'REJECTED'
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}>
                  {result.bankNotes}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                You can track this application in your profile. Our representative will contact you within 24-48 hours.
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
