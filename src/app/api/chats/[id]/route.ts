import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/chats/[id]  — get chat with paginated messages
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const { searchParams } = new URL(request.url)
  const before = searchParams.get('before') // ISO date cursor for older messages

  const chat = await db.chat.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          city: true,
          status: true,
          images: { select: { url: true, isPrimary: true }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true, avatarUrl: true, isVerified: true, joinedDate: true } },
      seller: { select: { id: true, name: true, email: true, avatarUrl: true, isVerified: true, joinedDate: true } },
    },
  })

  if (!chat) return errorResponse('Chat not found', 404)
  if (chat.buyerId !== user.id && chat.sellerId !== user.id && user.role !== 'ADMIN') {
    return errorResponse('Not authorized to view this chat', 403)
  }

  const messageWhere: any = { chatId: id }
  if (before) messageWhere.createdAt = { lt: new Date(before) }

  const messages = await db.message.findMany({
    where: messageWhere,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Mark messages from the other user as read
  await db.message.updateMany({
    where: {
      chatId: id,
      senderId: { not: user.id },
      isRead: false,
    },
    data: { isRead: true },
  })

  const otherUser = chat.buyerId === user.id ? chat.seller : chat.buyer

  return jsonResponse({
    chat: { ...chat, otherUser: { ...otherUser, email: otherUser.email } },
    messages: messages.reverse(),
  })
}

// POST /api/chats/[id]/messages  — send a message (also used as fallback when WS is unavailable)
// Body: { content }
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const chat = await db.chat.findUnique({ where: { id } })
  if (!chat) return errorResponse('Chat not found', 404)
  if (chat.buyerId !== user.id && chat.sellerId !== user.id) {
    return errorResponse('Not authorized to send message in this chat', 403)
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const content = String(body.content || '').slice(0, 2000).trim()
  if (!content) return errorResponse('Message content is required', 400)

  const message = await db.message.create({
    data: { chatId: id, senderId: user.id, content },
  })

  await db.chat.update({ where: { id }, data: { updatedAt: new Date() } })

  await audit('MESSAGE_SEND', user.id, id, { messageId: message.id }, ip)

  return jsonResponse({ message }, 201)
}
