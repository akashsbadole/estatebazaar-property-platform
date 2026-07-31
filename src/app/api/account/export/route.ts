import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'

// GET /api/account/export
// Exports all of the current user's data as JSON (GDPR-style data portability).
// Returns a structured JSON document containing:
//   - Profile info
//   - All listings (with images)
//   - All favorites
//   - All chats + messages
//   - All reports filed
//   - All subscriptions + payments
//   - All contact requests
//   - All saved searches
//   - All mortgage applications
//   - Recently viewed properties
//   - Audit log entries
export async function GET(_request: NextRequest) {
  const user = await requireAuth()
  const ip = getClientIp(_request)

  await audit('ACCOUNT_EXPORT', user.id, user.id, {}, ip)

  const [
    profile,
    properties,
    favorites,
    chats,
    reports,
    subscriptions,
    payments,
    contactRequests,
    savedSearches,
    mortgageApplications,
    recentlyViewed,
    auditLogs,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isVerified: true, avatarUrl: true, subscriptionTier: true,
        brokeragePaid: true, emailNotifications: true,
        joinedDate: true, createdAt: true,
      },
    }),
    db.property.findMany({
      where: { ownerId: user.id },
      include: {
        category: { select: { name: true } },
        images: { select: { url: true, isPrimary: true } },
      },
    }),
    db.favorite.findMany({
      where: { userId: user.id },
      include: {
        property: { select: { id: true, title: true, price: true, city: true } },
      },
    }),
    db.chat.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: {
        messages: true,
        property: { select: { id: true, title: true, price: true } },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    }),
    db.report.findMany({
      where: { reporterId: user.id },
      include: { property: { select: { id: true, title: true } } },
    }),
    db.subscription.findMany({
      where: { userId: user.id },
      include: { plan: true, payments: true },
    }),
    db.payment.findMany({ where: { userId: user.id } }),
    db.contactRequest.findMany({
      where: { userId: user.id },
      include: { property: { select: { id: true, title: true } } },
    }),
    db.savedSearch.findMany({ where: { userId: user.id } }),
    db.mortgageApplication.findMany({
      where: { userId: user.id },
      include: { property: { select: { id: true, title: true, price: true } } },
    }),
    db.recentlyViewed.findMany({
      where: { userId: user.id },
      include: { property: { select: { id: true, title: true, price: true } } },
    }),
    db.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    properties: properties.map(p => ({
      ...p,
      price: p.price,
      isNegotiable: p.isNegotiable,
    })),
    favorites,
    chats: chats.map(c => ({
      ...c,
      messages: c.messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
    })),
    reports,
    subscriptions,
    payments: payments.map(p => ({
      ...p,
      amountRupees: p.amount / 100,
    })),
    contactRequests,
    savedSearches: savedSearches.map(s => ({
      ...s,
      filters: s.filters ? JSON.parse(s.filters) : null,
    })),
    mortgageApplications,
    recentlyViewed,
    auditLogs: auditLogs.map(log => ({
      ...log,
      meta: log.meta ? JSON.parse(log.meta) : null,
    })),
  }

  return jsonResponse(exportData)
}
