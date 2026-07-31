import nodemailer from 'nodemailer'

// SMTP configuration from env vars. If not set, email sending is skipped
// (the rest of the app still works — emails are optional).
//
// Example .env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=your-app-password
//   SMTP_FROM="EstateBazaar <noreply@estatebazaar.in>"

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
}

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null // SMTP not configured
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  } as SmtpConfig)

  return cachedTransporter
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; previewUrl?: string; error?: string }> {
  const transporter = getTransporter()
  const from = process.env.SMTP_FROM || 'EstateBazaar <noreply@estatebazaar.in>'

  // If SMTP is not configured, use Ethereal (test) account for demo purposes
  if (!transporter) {
    try {
      const testAccount = await nodemailer.createTestAccount()
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
      const info = await testTransporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      })
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined
      console.log(`[email] (test) sent to ${payload.to}, preview: ${previewUrl}`)
      return { sent: true, previewUrl: previewUrl || undefined }
    } catch (err: any) {
      console.error('[email] failed to send via Ethereal:', err.message)
      return { sent: false, error: err.message }
    }
  }

  // Real SMTP
  try {
    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    console.log(`[email] sent to ${payload.to}, messageId: ${info.messageId}`)
    return { sent: true }
  } catch (err: any) {
    console.error(`[email] failed to send to ${payload.to}:`, err.message)
    return { sent: false, error: err.message }
  }
}

// ---------- Pre-built email templates ----------

export function newChatMessageEmail(opts: {
  toName: string
  toEmail: string
  fromName: string
  messagePreview: string
  propertyTitle: string
  chatId: string
}): EmailPayload {
  const preview = opts.messagePreview.length > 100
    ? opts.messagePreview.slice(0, 100) + '…'
    : opts.messagePreview
  return {
    to: opts.toEmail,
    subject: `New message from ${opts.fromName} on EstateBazaar`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">India's property marketplace</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 12px; color: #0f172a;">You have a new message</h2>
          <p style="color: #475569; margin: 0 0 16px;">
            <strong>${opts.fromName}</strong> sent you a message about
            <strong>${opts.propertyTitle}</strong>.
          </p>
          <div style="background: white; border-left: 4px solid #0e7490; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-style: italic; color: #334155;">
            "${preview}"
          </div>
          <p style="color: #475569; margin: 16px 0 8px;">To reply, open the chat in your EstateBazaar account.</p>
          <a href="#" style="display: inline-block; background: #0e7490; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">Open Chat</a>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You received this email because you have email notifications enabled.
            To unsubscribe, visit your profile settings.
          </p>
        </div>
      </div>
    `,
    text: `Hi ${opts.toName}, ${opts.fromName} sent you a message about ${opts.propertyTitle}: "${preview}". Log in to EstateBazaar to reply.`,
  }
}

export function savedSearchAlertEmail(opts: {
  toName: string
  toEmail: string
  searchName: string
  newMatchCount: number
  sampleMatches: Array<{ title: string; price: number; city: string }>
}): EmailPayload {
  const sampleHtml = opts.sampleMatches
    .map(m => `<li style="margin-bottom: 8px;"><strong>${m.title}</strong> — ₹${m.price.toLocaleString('en-IN')} (${m.city})</li>`)
    .join('')
  return {
    to: opts.toEmail,
    subject: `${opts.newMatchCount} new ${opts.newMatchCount === 1 ? 'property matches' : 'properties match'} your saved search "${opts.searchName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e7490, #14b8a6); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">EstateBazaar</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">India's property marketplace</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 12px; color: #0f172a;">New matches for your saved search</h2>
          <p style="color: #475569; margin: 0 0 16px;">
            Hi ${opts.toName}, we found <strong>${opts.newMatchCount}</strong> new ${opts.newMatchCount === 1 ? 'property that matches' : 'properties that match'} your saved search "<strong>${opts.searchName}</strong>".
          </p>
          ${sampleHtml ? `
            <p style="color: #475569; margin: 16px 0 8px;">Here's a preview:</p>
            <ul style="color: #334155; padding-left: 20px; margin: 0 0 16px;">
              ${sampleHtml}
            </ul>
          ` : ''}
          <a href="#" style="display: inline-block; background: #0e7490; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">View All Matches</a>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You received this email because you enabled alerts for this saved search.
            To disable alerts, visit your profile settings.
          </p>
        </div>
      </div>
    `,
    text: `Hi ${opts.toName}, we found ${opts.newMatchCount} new properties matching your saved search "${opts.searchName}". Log in to EstateBazaar to view them.`,
  }
}
