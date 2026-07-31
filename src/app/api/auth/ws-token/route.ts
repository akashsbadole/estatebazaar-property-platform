import { NextRequest } from 'next/server'
import { getCurrentUser, signToken, jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/auth/ws-token
// Returns a short-lived JWT for WebSocket authentication
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return errorResponse('Authentication required', 401)
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })

  return jsonResponse({ token })
}