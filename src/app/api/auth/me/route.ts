import { NextRequest } from 'next/server'
import { getCurrentUser, jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/auth/me
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorResponse('Not authenticated', 401)
  return jsonResponse({ user })
}
