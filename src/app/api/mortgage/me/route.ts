import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse } from '@/lib/auth'

// GET /api/mortgage/me — list current user's mortgage applications
export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  const items = await db.mortgageApplication.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { id: true, title: true, price: true, city: true } },
    },
  })
  return jsonResponse({ items })
}
