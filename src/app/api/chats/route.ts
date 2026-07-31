import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// GET /api/chats  — list current user's chats with last message preview + unread count
export async function GET(_request: NextRequest) {
  const user = await requireAuth()

  const chats = await db.chat.findMany({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          city: true,
          images: { select: { url: true, isPrimary: true }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
      seller: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, content: true, senderId: true, createdAt: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  })

  // Compute unread count per chat
  const chatIds = chats.map(c => c.id)
  const unread = await db.message.groupBy({
    by: ['chatId'],
    where: {
      chatId: { in: chatIds },
      senderId: { not: user.id },
      isRead: false,
    },
    _count: { _all: true },
  })
  const unreadMap = new Map(unread.map(u => [u.chatId, u._count._all]))

  const items = chats.map(c => ({
    ...c,
    unreadCount: unreadMap.get(c.id) || 0,
    otherUser: c.buyerId === user.id ? c.seller : c.buyer,
  }))

  return jsonResponse({ items })
}

// POST /api/chats  — start or resume a chat about a property
// Body: { propertyId, message? }
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const propertyId = body.propertyId
  if (!propertyId) return errorResponse('propertyId is required', 400)

  const property = await db.property.findUnique({ where: { id: propertyId } })
  if (!property) return errorResponse('Property not found', 404)
  if (property.status !== 'APPROVED') return errorResponse('Property not available', 400)
  if (property.ownerId === user.id) return errorResponse('Cannot start a chat on your own listing', 400)
  if (property.contactPref === 'CALL') return errorResponse('Seller prefers calls only', 400)

  // Find or create chat
  let chat = await db.chat.findUnique({
    where: { propertyId_buyerId: { propertyId, buyerId: user.id } },
    include: {
      property: {
        select: { id: true, title: true, price: true, city: true, images: { select: { url: true, isPrimary: true }, take: 1 } },
      },
      buyer: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
      seller: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
    },
  })

  if (!chat) {
    chat = await db.chat.create({
      data: { propertyId, buyerId: user.id, sellerId: property.ownerId },
      include: {
        property: {
          select: { id: true, title: true, price: true, city: true, images: { select: { url: true, isPrimary: true }, take: 1 } },
        },
        buyer: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
        seller: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
      },
    })
    await audit('CHAT_CREATE', user.id, chat.id, { propertyId }, ip)
  }

  // Optional initial message
  const initialMessage = body.message ? String(body.message).slice(0, 2000).trim() : null
  if (initialMessage) {
    await db.message.create({
      data: { chatId: chat.id, senderId: user.id, content: initialMessage },
    })
    await db.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
  }

  return jsonResponse({ chat, message: initialMessage ? 'Chat started' : 'Chat resumed' })
}
