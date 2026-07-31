import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/admin/users/[id]/detail
// Returns a complete profile of a user for the admin detail drawer:
//   - Basic info (name, email, phone, role, tier, joined, verified, banned)
//   - Counts: listings, favorites, chats, reports filed, reports received, payments
//   - Recent listings (10 most recent)
//   - Recent chats (10 most recent)
//   - Recent payments (10 most recent)
//   - Audit log entries for this user (last 20)
export async function GET(_request: NextRequest, { params }: Params) {
  await requireAdmin()
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      isBanned: true,
      avatarUrl: true,
      subscriptionTier: true,
      brokeragePaid: true,
      emailNotifications: true,
      joinedDate: true,
      createdAt: true,
    },
  })
  if (!user) return errorResponse('User not found', 404)

  const [
    listingsCount,
    favoritesCount,
    chatsAsBuyerCount,
    chatsAsSellerCount,
    messagesCount,
    reportsFiledCount,
    paymentsCount,
    contactRequestsCount,
    mortgageApplicationsCount,
    recentListings,
    recentChats,
    recentPayments,
    recentAuditLogs,
    reportsOnListings,
  ] = await Promise.all([
    db.property.count({ where: { ownerId: id } }),
    db.favorite.count({ where: { userId: id } }),
    db.chat.count({ where: { buyerId: id } }),
    db.chat.count({ where: { sellerId: id } }),
    db.message.count({ where: { senderId: id } }),
    db.report.count({ where: { reporterId: id } }),
    db.payment.count({ where: { userId: id } }),
    db.contactRequest.count({ where: { userId: id } }),
    db.mortgageApplication.count({ where: { userId: id } }),
    db.property.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, price: true, city: true, status: true,
        viewCount: true, isVerifiedListing: true, createdAt: true,
        images: { select: { url: true, isPrimary: true }, take: 1 },
        _count: { select: { favorites: true, chats: true, reports: true } },
      },
    }),
    db.chat.findMany({
      where: { OR: [{ buyerId: id }, { sellerId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, createdAt: true, updatedAt: true,
        buyerId: true,
        property: { select: { id: true, title: true, price: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, type: true, method: true, amount: true, status: true,
        providerPaymentId: true, upiRef: true, createdAt: true,
      },
    }),
    db.auditLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, target: true, ip: true, createdAt: true, meta: true },
    }),
    db.report.count({
      where: { property: { ownerId: id } },
    }),
  ])

  return jsonResponse({
    user,
    counts: {
      listings: listingsCount,
      favorites: favoritesCount,
      chatsAsBuyer: chatsAsBuyerCount,
      chatsAsSeller: chatsAsSellerCount,
      messages: messagesCount,
      reportsFiled: reportsFiledCount,
      reportsOnListings: reportsOnListings,
      payments: paymentsCount,
      contactRequests: contactRequestsCount,
      mortgageApplications: mortgageApplicationsCount,
    },
    recentListings,
    recentChats: recentChats.map(c => ({
      ...c,
      otherUser: c.buyer.id === id ? c.seller : c.buyer,
    })),
    recentPayments: recentPayments.map(p => ({
      ...p,
      amountRupees: p.amount / 100,
    })),
    recentAuditLogs: recentAuditLogs.map(log => ({
      ...log,
      meta: log.meta ? JSON.parse(log.meta) : null,
    })),
  })
}
