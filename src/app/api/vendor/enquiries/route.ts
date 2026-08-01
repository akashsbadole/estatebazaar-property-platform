import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  if (user.role !== 'VENDOR') {
    return errorResponse('Vendor access required', 403)
  }

  const chats = await db.chat.findMany({
    where: { property: { ownerId: user.id } },
    include: {
      property: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true, email: true } },
      messages: { select: { content: true, isRead: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const items = chats.map(c => ({
    id: c.id,
    propertyId: c.propertyId,
    propertyTitle: c.property.title,
    buyerName: c.buyer.name,
    buyerEmail: c.buyer.email,
    type: 'CHAT' as const,
    status: c.messages[0]?.isRead ? 'READ' : 'NEW',
    createdAt: c.createdAt.toISOString(),
    message: c.messages[0]?.content,
  }))

  return jsonResponse({ items })
}
