import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonResponse, errorResponse, getClientIp, audit } from '@/lib/auth'
import { sendEmail, savedSearchAlertEmail } from '@/lib/email'

// POST /api/saved-searches/check-alerts
// Can be called by:
//   - An admin manually (to trigger alert batch)
//   - A cron job / scheduled task (with admin API key)
//
// For each SavedSearch with alertEnabled=true, find properties created since
// lastCheckedAt that match the saved filters. If new matches exist, send an
// email alert and update newMatchCount + lastCheckedAt.
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    return errorResponse('Admin access required', 403)
  }
  const ip = getClientIp(request)

  const alerts = await db.savedSearch.findMany({
    where: { alertEnabled: true },
    include: {
      user: { select: { id: true, name: true, email: true, emailNotifications: true } },
    },
  })

  let totalAlertsSent = 0
  let totalNewMatches = 0
  const perSearchResults: any[] = []

  for (const alert of alerts) {
    let filters: any = {}
    try {
      filters = JSON.parse(alert.filters)
    } catch {
      continue
    }

    // Build where clause from filters
    const where: any = {
      status: 'APPROVED',
      createdAt: { gt: alert.lastCheckedAt || new Date(0) },
    }
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q } },
        { description: { contains: filters.q } },
        { location: { contains: filters.q } },
        { city: { contains: filters.q } },
      ]
    }
    if (filters.type) where.type = filters.type
    if (filters.city) where.city = { contains: filters.city }
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.furnishing) where.furnishing = filters.furnishing
    if (filters.bedrooms) where.bedrooms = { gte: filters.bedrooms }
    if (filters.minPrice || filters.maxPrice) {
      where.price = {}
      if (filters.minPrice) where.price.gte = Number(filters.minPrice)
      if (filters.maxPrice) where.price.lte = Number(filters.maxPrice)
    }

    const newMatches = await db.property.findMany({
      where,
      select: { id: true, title: true, price: true, city: true },
      take: 50,
    })

    if (newMatches.length === 0) {
      perSearchResults.push({
        searchId: alert.id,
        searchName: alert.name,
        userEmail: alert.user.email,
        newMatches: 0,
        emailSent: false,
      })
      continue
    }

    // Send email if user has notifications enabled
    let emailSent = false
    if (alert.user.emailNotifications) {
      const emailPayload = savedSearchAlertEmail({
        toName: alert.user.name,
        toEmail: alert.user.email,
        searchName: alert.name,
        newMatchCount: newMatches.length,
        sampleMatches: newMatches.slice(0, 3).map(m => ({
          title: m.title,
          price: m.price,
          city: m.city,
        })),
      })
      const result = await sendEmail(emailPayload)
      emailSent = result.sent
      if (emailSent) totalAlertsSent++
    }

    // Update the search's newMatchCount + lastCheckedAt
    await db.savedSearch.update({
      where: { id: alert.id },
      data: {
        newMatchCount: newMatches.length,
        lastCheckedAt: new Date(),
      },
    })

    totalNewMatches += newMatches.length
    perSearchResults.push({
      searchId: alert.id,
      searchName: alert.name,
      userEmail: alert.user.email,
      newMatches: newMatches.length,
      emailSent,
    })
  }

  await audit('SAVED_SEARCH_ALERTS_CHECKED', user.id, undefined, {
    alertsChecked: alerts.length,
    totalNewMatches,
    totalAlertsSent,
  }, ip)

  return jsonResponse({
    alertsChecked: alerts.length,
    totalNewMatches,
    totalAlertsSent,
    perSearchResults,
    message: `Checked ${alerts.length} saved searches. ${totalNewMatches} new matches found, ${totalAlertsSent} emails sent.`,
  })
}
