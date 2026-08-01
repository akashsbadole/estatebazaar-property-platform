import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, jsonResponse, errorResponse } from '@/lib/auth'

interface SuggestionItem {
  id: string
  title: string
  location: string
  city: string
  type: string
  price: number
  image?: string | null
}

interface RecentItem {
  q: string
  timestamp: number
}

const MAX_SUGGESTIONS = 8
const MAX_RECENT = 8
const COOKIE_NAME = 'eb_recent_searches'

function parseRecentCookie(value: string | undefined): RecentItem[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(value))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((r: any) => r && typeof r.q === 'string' && typeof r.timestamp === 'number')
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function buildRecentCookieValue(recent: RecentItem[]): string {
  return encodeURIComponent(JSON.stringify(recent.slice(0, MAX_RECENT)))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  const cookieHeader = request.headers.get('cookie') || ''
  const recentCookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const recent: RecentItem[] = parseRecentCookie(recentCookieMatch?.[1])

  if (!q) {
    return jsonResponse({ suggestions: [], recent })
  }

  try {
    const items = await db.property.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { title: { contains: q } },
          { location: { contains: q } },
          { city: { contains: q } },
        ],
      },
      select: {
        id: true,
        title: true,
        location: true,
        city: true,
        type: true,
        price: true,
        images: { select: { url: true, isPrimary: true }, take: 1 },
      },
      take: MAX_SUGGESTIONS,
      orderBy: { viewCount: 'desc' },
    })

    const suggestions: SuggestionItem[] = items.map(p => ({
      id: p.id,
      title: p.title,
      location: p.location,
      city: p.city,
      type: p.type,
      price: p.price,
      image: p.images[0]?.url || null,
    }))

    return jsonResponse({ suggestions, recent })
  } catch {
    return jsonResponse({ suggestions: [], recent })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const searchQ = (body.q || '').trim()
    if (!searchQ) return jsonResponse({ ok: true })

    const cookieHeader = request.headers.get('cookie') || ''
    const recentCookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    const recent: RecentItem[] = parseRecentCookie(recentCookieMatch?.[1])

    const existing = recent.find(r => r.q.toLowerCase() === searchQ.toLowerCase())
    if (existing) {
      existing.timestamp = Date.now()
    } else {
      recent.unshift({ q: searchQ, timestamp: Date.now() })
    }

    const trimmed = recent.slice(0, MAX_RECENT)
    const value = buildRecentCookieValue(trimmed)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_NAME}=${value}; Path=/; Max-Age=${864000 * 10}; SameSite=Lax; HttpOnly`,
      },
    })
  } catch {
    return jsonResponse({ ok: true })
  }
}
