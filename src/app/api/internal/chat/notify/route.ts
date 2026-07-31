import { NextRequest } from 'next/server'
import { sendEmail, newChatMessageEmail } from '@/lib/email'
import { jsonResponse, errorResponse } from '@/lib/auth'

// POST /api/internal/chat/notify
// Internal endpoint for chat-service to send email notifications
// Expects: { toEmail, toName, fromName, messagePreview, propertyTitle, chatId }
export async function POST(request: NextRequest) {
  // Verify this is an internal request (simple shared secret check)
  const authHeader = request.headers.get('x-internal-auth')
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'dev-internal-secret'
  
  if (authHeader !== internalSecret) {
    return errorResponse('Unauthorized', 401)
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const { toEmail, toName, fromName, messagePreview, propertyTitle, chatId } = body

  if (!toEmail || !toName || !fromName || !messagePreview || !propertyTitle) {
    return errorResponse('Missing required fields', 400)
  }

  try {
    const emailPayload = newChatMessageEmail({
      toEmail,
      toName,
      fromName,
      messagePreview,
      propertyTitle,
      chatId,
    })
    const result = await sendEmail(emailPayload)
    
    if (!result.sent) {
      return errorResponse('Failed to send email', 500)
    }

    return jsonResponse({ success: true, previewUrl: result.previewUrl })
  } catch (err: any) {
    console.error('[chat-notify] Error:', err.message)
    return errorResponse('Email service error', 500)
  }
}