import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser, jsonResponse, authResponse, errorResponse, generateCsrfToken, COOKIE_NAME } from '@/lib/auth'

// GET /api/auth/me
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorResponse('Not authenticated', 401)

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value
  if (sessionToken) {
    return authResponse({ user }, generateCsrfToken(sessionToken))
  }
  return jsonResponse({ user })
}
