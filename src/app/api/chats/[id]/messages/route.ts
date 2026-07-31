import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'
import { sendEmail, newChatMessageEmail } from '@/lib/email'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/chats/[id]/messages
// Body: { content }
// (Alias for /api/chats/[id] POST — kept for clarity on the frontend)
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await requireAuth()
  const ip = getClientIp(request)

  const chat = await db.chat.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true, email: true, emailNotifications: true } },
      seller: { select: { id: true, name: true, email: true, emailNotifications: true } },
    },
  })
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

  // Send email notification to the recipient (non-blocking, fire-and-forget)
  const recipient = chat.buyerId === user.id ? chat.seller : chat.buyer
  if (recipient && recipient.emailNotifications) {
    const emailPayload = newChatMessageEmail({
      toName: recipient.name,
      toEmail: recipient.email,
      fromName: user.name,
      messagePreview: content,
      propertyTitle: chat.property.title,
      chatId: id,
    })
    // Don't await — fire and forget so the API responds quickly
    sendEmail(emailPayload).catch(err => {
      console.error('[chat] email notification failed:', err.message)
    })
  }

  return jsonResponse({ message }, 201)
}
