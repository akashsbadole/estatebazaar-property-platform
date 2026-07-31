import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/auth'

// POST /api/payments/create-order
// NOTE: Razorpay order creation is handled by POST /api/subscriptions/subscribe
// when method=RAZORPAY is passed. This route is kept as a stub for clients
// that want a single endpoint. Just redirect there.
export async function POST(request: NextRequest) {
  return errorResponse(
    'Use POST /api/subscriptions/subscribe with method=RAZORPAY to create an order.',
    400,
  )
}
