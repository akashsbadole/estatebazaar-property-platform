import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, jsonResponse, errorResponse } from '@/lib/auth'

// GET /api/admin/export?type=listings|users|contacts|reports
// Returns CSV content with Content-Disposition attachment header.
export async function GET(request: NextRequest) {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'listings'

  let csv = ''
  let filename = ''

  if (type === 'listings') {
    const rows = await db.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { name: true, email: true, phone: true } },
        category: { select: { name: true } },
      },
    })
    const headers = [
      'ID', 'Title', 'Type', 'Category', 'Price', 'Area', 'Bedrooms', 'Bathrooms',
      'Parking', 'Furnishing', 'Status', 'Verified Listing', 'City', 'State',
      'Location', 'Owner Name', 'Owner Email', 'Owner Phone', 'Views', 'Created At',
    ]
    csv = headers.join(',') + '\n'
    for (const r of rows) {
      const cells = [
        r.id, r.title, r.type, r.category.name, r.price, r.area, r.bedrooms, r.bathrooms,
        r.parking, r.furnishing, r.status, r.isVerifiedListing ? 'Yes' : 'No', r.city, r.state,
        r.location, r.owner.name, r.owner.email, r.owner.phone || '',
        r.viewCount, r.createdAt.toISOString(),
      ]
      csv += cells.map(escapeCsv).join(',') + '\n'
    }
    filename = `listings-${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'users') {
    const rows = await db.user.findMany({
      orderBy: { joinedDate: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isVerified: true,
        isBanned: true, subscriptionTier: true, joinedDate: true,
        _count: { select: { properties: true } },
      },
    })
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Verified', 'Banned', 'Plan', 'Listings', 'Joined']
    csv = headers.join(',') + '\n'
    for (const r of rows) {
      const cells = [
        r.id, r.name, r.email, r.phone || '', r.role, r.isVerified ? 'Yes' : 'No',
        r.isBanned ? 'Yes' : 'No', r.subscriptionTier, r._count.properties,
        r.joinedDate.toISOString(),
      ]
      csv += cells.map(escapeCsv).join(',') + '\n'
    }
    filename = `users-${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'contacts') {
    const rows = await db.contactRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { title: true } },
      },
    })
    const headers = ['ID', 'Type', 'Name', 'Email', 'Phone', 'Message', 'Property', 'Status', 'Created At']
    csv = headers.join(',') + '\n'
    for (const r of rows) {
      const cells = [
        r.id, r.type, r.name, r.email, r.phone || '', r.message,
        r.property?.title || '', r.status, r.createdAt.toISOString(),
      ]
      csv += cells.map(escapeCsv).join(',') + '\n'
    }
    filename = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'reports') {
    const rows = await db.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { title: true } },
        reporter: { select: { name: true, email: true } },
      },
    })
    const headers = ['ID', 'Property', 'Reason', 'Description', 'Status', 'Reporter', 'Reporter Email', 'Created At']
    csv = headers.join(',') + '\n'
    for (const r of rows) {
      const cells = [
        r.id, r.property?.title || '', r.reason, r.description || '', r.status,
        r.reporter.name, r.reporter.email, r.createdAt.toISOString(),
      ]
      csv += cells.map(escapeCsv).join(',') + '\n'
    }
    filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`
  } else {
    return errorResponse('Invalid export type. Use: listings, users, contacts, or reports.', 400)
  }

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  // Quote if contains comma, newline, or quote
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
