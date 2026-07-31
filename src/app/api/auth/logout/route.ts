import { NextRequest } from 'next/server'
import { clearSessionCookie, jsonResponse, getCurrentUser } from '@/lib/auth'

// POST /api/auth/logout
export async function POST(_request: NextRequest) {
  await clearSessionCookie()
  return jsonResponse({ message: 'Logged out' })
}

// GET /api/auth/logout  (also clear cookie, useful for nav)
export async function GET(_request: NextRequest) {
  await clearSessionCookie()
  return jsonResponse({ message: 'Logged out' })
}

// GET /api/auth/me  — return current user (handled below in /me/route.ts)
