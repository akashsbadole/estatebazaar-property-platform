import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  sanitizeString,
  jsonResponse,
  errorResponse,
  getClientIp,
  audit,
} from '@/lib/auth'

// POST /api/mortgage/apply
// Body: { propertyId?, employmentType, monthlyIncome, loanAmount, tenureYears, employerName?, creditScore?, existingEMIs?, notes? }
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const employmentType = String(body.employmentType || '').toUpperCase()
  const monthlyIncome = parseInt(body.monthlyIncome, 10)
  const loanAmount = parseInt(body.loanAmount, 10)
  const tenureYears = parseInt(body.tenureYears, 10)
  const employerName = body.employerName ? sanitizeString(body.employerName, 100) : null
  const creditScore = body.creditScore ? parseInt(body.creditScore, 10) : null
  const existingEMIs = body.existingEMIs ? parseInt(body.existingEMIs, 10) : 0
  const notes = body.notes ? sanitizeString(body.notes, 1000) : null
  const propertyId = body.propertyId ? sanitizeString(body.propertyId, 50) : null

  if (!['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'RETIRED'].includes(employmentType)) {
    return errorResponse('Valid employment type is required', 400)
  }
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    return errorResponse('Valid monthly income is required', 400)
  }
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return errorResponse('Valid loan amount is required', 400)
  }
  if (!Number.isFinite(tenureYears) || tenureYears < 1 || tenureYears > 30) {
    return errorResponse('Tenure must be between 1 and 30 years', 400)
  }
  if (creditScore !== null && (creditScore < 300 || creditScore > 900)) {
    return errorResponse('Credit score must be between 300 and 900', 400)
  }

  // Validate propertyId if provided
  if (propertyId) {
    const property = await db.property.findUnique({ where: { id: propertyId } })
    if (!property) return errorResponse('Property not found', 404)
  }

  // Auto-assign a partner bank based on round-robin
  const partnerBanks = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank']
  const applicationCount = await db.mortgageApplication.count()
  const assignedBank = partnerBanks[applicationCount % partnerBanks.length]

  // Auto-evaluation logic
  const r = (loanAmount * 0.0085 * Math.pow(1.0085, tenureYears * 12)) / (Math.pow(1.0085, tenureYears * 12) - 1)
  const approxEMI = Math.round(r)
  const disposableIncome = monthlyIncome - existingEMIs - (monthlyIncome * 0.4)

  let status: string = 'UNDER_REVIEW'
  let approvedAmount: number | null = null
  let interestRate: number | null = null
  let bankNotes: string | null = null

  if (creditScore && creditScore >= 750 && disposableIncome >= approxEMI * 1.5) {
    status = 'PRE_APPROVED'
    approvedAmount = loanAmount
    interestRate = 8.4
    bankNotes = `Congratulations! You're pre-approved for ₹${loanAmount.toLocaleString('en-IN')} at ${interestRate}% p.a. for ${tenureYears} years. Approx EMI: ₹${approxEMI.toLocaleString('en-IN')}/mo. Our representative will contact you within 24 hours.`
  } else if (creditScore && creditScore < 600) {
    status = 'REJECTED'
    bankNotes = 'We regret to inform you that your application was not approved due to a low credit score. Please work on improving your credit score and reapply.'
  } else if (disposableIncome < approxEMI) {
    status = 'REJECTED'
    bankNotes = `Based on your monthly income and existing obligations, the EMI of ₹${approxEMI.toLocaleString('en-IN')}/mo exceeds your disposable income. Consider a smaller loan amount or longer tenure.`
  } else {
    status = 'UNDER_REVIEW'
    bankNotes = `Your application is under review. Approx EMI for the requested amount: ₹${approxEMI.toLocaleString('en-IN')}/mo. Our representative will contact you within 48 hours.`
  }

  const application = await db.mortgageApplication.create({
    data: {
      userId: user.id,
      propertyId,
      employmentType,
      monthlyIncome,
      loanAmount,
      tenureYears,
      employerName,
      creditScore,
      existingEMIs,
      notes,
      status,
      partnerBank: assignedBank,
      approvedAmount,
      interestRate,
      bankNotes,
    },
    include: {
      property: { select: { id: true, title: true, price: true, city: true } },
    },
  })

  await audit('MORTGAGE_APPLY', user.id, application.id, {
    employmentType,
    loanAmount,
    tenureYears,
    status,
    partnerBank: assignedBank,
  }, ip)

  return jsonResponse({
    application,
    message: status === 'PRE_APPROVED'
      ? `Great news! You're pre-approved by ${assignedBank}.`
      : status === 'REJECTED'
        ? 'Application could not be approved at this time.'
        : `Application submitted to ${assignedBank}. They'll respond within 48 hours.`,
  }, 201)
}
