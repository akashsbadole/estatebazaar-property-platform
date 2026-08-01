import { NextRequest, NextResponse } from 'next/server'
import { rateLimitAsync } from '@/lib/rate-limit'

const STATIC_PREFIXES = [
  '/_next/static',
  '/_next/image',
  '/favicon',
  '/manifest.json',
  '/icon-192',
  '/icon-512',
]

const CSRF_EXEMPT_PREFIXES = ['/api/auth/', '/api/internal/']

const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET

function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p))
}

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
}

function corsPreflightResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token, x-internal-auth',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function securityHeaders() {
  const headers = new Headers()
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  )

  // ponytail: unsafe-inline/'unsafe-eval' for scripts/styles required for Next.js/Tailwind dev runtime injection.
  // Drop unsafe-eval in production — React doesn't use eval() there.
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )

  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    )
  }

  return headers
}

async function checkRateLimit(ip: string): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  return rateLimitAsync(`global:${ip}`, 100, 15_000)
}

function isInternalRequest(request: NextRequest): boolean {
  if (!INTERNAL_SECRET) return false
  return request.headers.get('x-internal-auth') === INTERNAL_SECRET
}

const JWT_SECRET = process.env.JWT_SECRET

async function hmacSha256(key: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function validateCsrfToken(request: NextRequest, sessionToken: string | undefined): Promise<{ ok: boolean; error?: string }> {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true }

  const csrfHeader = request.headers.get('x-csrf-token')
  const formCsrf = (await request.formData().catch(() => null))?.get('csrfToken')

  const expectedToken = sessionToken && JWT_SECRET
    ? await hmacSha256(JWT_SECRET, sessionToken)
    : null

  const providedToken = csrfHeader || (typeof formCsrf === 'string' ? formCsrf : null)

  if (expectedToken && providedToken && timingSafeEqual(expectedToken, providedToken)) {
    return { ok: true }
  }

  return { ok: false, error: 'Invalid or missing CSRF token' }
}

function validateOrigin(request: NextRequest): { ok: boolean; error?: string } {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host') || 'localhost:3000'

  if (!origin && !referer && process.env.NODE_ENV === 'development') return { ok: true }

  const checkHost = (url: string) => {
    try {
      return new URL(url).host === host
    } catch {
      return false
    }
  }

  if (origin && checkHost(origin)) return { ok: true }
  if (referer && checkHost(referer)) return { ok: true }

  return { ok: false, error: 'Origin mismatch' }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto !== 'https') {
      const httpsUrl = request.nextUrl.clone()
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl, 307)
    }
  }

  const response = NextResponse.next()
  const headers = securityHeaders()
  for (const [key, value] of headers) {
    response.headers.set(key, value)
  }

  const isInternal = isInternalRequest(request)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'

  if (!isInternal) {
    const rl = await checkRateLimit(ip)
    if (!rl.ok) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      })
    }
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
  }

  const pathExempt = isCsrfExempt(pathname)

  if (!isInternal && !pathExempt) {
    const cookies = request.cookies.get('__Host-olx_session')
    const csrfResult = await validateCsrfToken(request, cookies?.value)
    if (!csrfResult.ok) {
      return new NextResponse(JSON.stringify({ error: csrfResult.error || 'CSRF validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const originResult = validateOrigin(request)
    if (!originResult.ok) {
      return new NextResponse(JSON.stringify({ error: originResult.error || 'Origin validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  response.headers.set('X-Content-Type-Options', 'nosniff')

  if (isStaticAsset(pathname)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return response
}

export const config = {
  matcher: ['/(.*)'],
}
