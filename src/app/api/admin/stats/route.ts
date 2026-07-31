import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse } from '@/lib/auth'

// GET /api/admin/stats  — dashboard analytics
export async function GET(_request: NextRequest) {
  await requireAdmin()

  const [
    totalUsers,
    totalProperties,
    pendingProperties,
    approvedProperties,
    rejectedProperties,
    soldProperties,
    totalChats,
    totalMessages,
    openReports,
    totalFavorites,
    bannedUsers,
    verifiedUsers,
    proSubscribers,
    brokerSubscribers,
    totalRevenue,
    mortgageApplications,
    pendingMortgages,
    contactRequests,
    newContactRequests,
  ] = await Promise.all([
    db.user.count(),
    db.property.count(),
    db.property.count({ where: { status: 'PENDING' } }),
    db.property.count({ where: { status: 'APPROVED' } }),
    db.property.count({ where: { status: 'REJECTED' } }),
    db.property.count({ where: { status: 'SOLD' } }),
    db.chat.count(),
    db.message.count(),
    db.report.count({ where: { status: 'OPEN' } }),
    db.favorite.count(),
    db.user.count({ where: { isBanned: true } }),
    db.user.count({ where: { isVerified: true } }),
    db.user.count({ where: { subscriptionTier: 'PRO' } }),
    db.user.count({ where: { subscriptionTier: 'BROKER' } }),
    db.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    db.mortgageApplication.count(),
    db.mortgageApplication.count({ where: { status: 'PENDING' } }),
    db.contactRequest.count(),
    db.contactRequest.count({ where: { status: 'NEW' } }),
  ])

  // Property type distribution
  const typeDistributionRaw = await db.property.groupBy({
    by: ['type'],
    _count: { _all: true },
  })
  const typeDistribution = typeDistributionRaw.map(t => ({ type: t.type, count: t._count._all }))

  // Top cities
  const cityDistributionRaw = await db.property.groupBy({
    by: ['city'],
    where: { status: 'APPROVED' },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  })
  const cityDistribution = cityDistributionRaw.map(c => ({ city: c.city, count: c._count._all }))

  // 30-day trends for users + properties + chats
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [recentProperties, recentUsers, recentChats, recentPayments] = await Promise.all([
    db.property.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.user.findMany({
      where: { joinedDate: { gte: thirtyDaysAgo } },
      select: { joinedDate: true },
    }),
    db.chat.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.payment.findMany({
      where: { status: 'PAID', createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, amount: true },
    }),
  ])

  // Build 30-day histograms
  const buildHistogram = (items: Array<{ createdAt: Date }>, key: 'createdAt' | 'joinedDate' = 'createdAt') => {
    const dayMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      dayMap.set(d.toISOString().slice(0, 10), 0)
    }
    items.forEach(item => {
      const date = key === 'joinedDate' ? (item as any).joinedDate : (item as any).createdAt
      const k = date.toISOString().slice(0, 10)
      if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) || 0) + 1)
    })
    return Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count,
    }))
  }

  // Revenue trend (sum of payments per day)
  const revenueByDay = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    revenueByDay.set(d.toISOString().slice(0, 10), 0)
  }
  recentPayments.forEach(p => {
    const k = p.createdAt.toISOString().slice(0, 10)
    if (revenueByDay.has(k)) revenueByDay.set(k, (revenueByDay.get(k) || 0) + p.amount)
  })
  const revenueTrend = Array.from(revenueByDay.entries()).map(([date, amount]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    amount: amount / 100, // convert paise to rupees
  }))

  // Recent activity feed (last 20 audit log entries)
  const recentAuditLogs = await db.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  const activityFeed = recentAuditLogs.map(log => {
    let description = log.action
    let icon = 'activity'
    if (log.action === 'USER_SIGNUP') { description = 'signed up'; icon = 'user-plus' }
    else if (log.action === 'USER_LOGIN') { description = 'logged in'; icon = 'log-in' }
    else if (log.action === 'PROPERTY_CREATE') { description = 'posted a new property'; icon = 'home' }
    else if (log.action === 'PROPERTY_UPDATE') { description = 'updated a property'; icon = 'edit' }
    else if (log.action === 'PROPERTY_DELETE') { description = 'deleted a property'; icon = 'trash' }
    else if (log.action === 'LISTING_MODERATE') { description = 'moderated a listing'; icon = 'shield' }
    else if (log.action === 'USER_MODERATE') { description = 'moderated a user'; icon = 'ban' }
    else if (log.action === 'FAVORITE_ADD') { description = 'favorited a property'; icon = 'heart' }
    else if (log.action === 'CHAT_CREATE') { description = 'started a chat'; icon = 'message' }
    else if (log.action === 'MESSAGE_SEND') { description = 'sent a message'; icon = 'message' }
    else if (log.action === 'REPORT_CREATE') { description = 'reported a listing'; icon = 'flag' }
    else if (log.action === 'SUBSCRIPTION_ACTIVATED') { description = 'subscribed'; icon = 'crown' }
    else if (log.action === 'CONTACT_REQUEST_CREATE') { description = 'submitted a contact request'; icon = 'mail' }
    else if (log.action === 'MORTGAGE_APPLY') { description = 'applied for a mortgage'; icon = 'bank' }
    return {
      id: log.id,
      action: log.action,
      description,
      icon,
      actor: log.actor ? { id: log.actor.id, name: log.actor.name, email: log.actor.email, avatarUrl: log.actor.avatarUrl } : null,
      target: log.target,
      meta: log.meta ? JSON.parse(log.meta) : null,
      ip: log.ip,
      createdAt: log.createdAt.toISOString(),
    }
  })

  // Subscription tier distribution
  const subscriptionDistribution = [
    { tier: 'FREE', count: totalUsers - proSubscribers - brokerSubscribers },
    { tier: 'PRO', count: proSubscribers },
    { tier: 'BROKER', count: brokerSubscribers },
  ]

  return jsonResponse({
    totals: {
      users: totalUsers,
      properties: totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      soldProperties,
      chats: totalChats,
      messages: totalMessages,
      openReports,
      favorites: totalFavorites,
      bannedUsers,
      verifiedUsers,
      proSubscribers,
      brokerSubscribers,
      mortgageApplications,
      pendingMortgages,
      contactRequests,
      newContactRequests,
      // Revenue in rupees (stored as paise)
      totalRevenue: (totalRevenue._sum.amount || 0) / 100,
    },
    charts: {
      typeDistribution,
      cityDistribution,
      listingsTrend: buildHistogram(recentProperties, 'createdAt'),
      usersTrend: buildHistogram(recentUsers, 'joinedDate'),
      chatsTrend: buildHistogram(recentChats, 'createdAt'),
      revenueTrend,
      subscriptionDistribution,
    },
    activityFeed,
  })
}
