import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/properties/[id]/price-trends
// Returns REAL price history for this property + similar properties' averages.
// Uses the PriceHistory table (actual price changes) instead of approximating
// from listing creation dates.
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const property = await db.property.findUnique({
    where: { id },
    select: { id: true, city: true, type: true, price: true, area: true, createdAt: true },
  })

  if (!property) return errorResponse('Property not found', 404)

  // 1. This property's actual price history
  const priceHistory = await db.priceHistory.findMany({
    where: { propertyId: id },
    orderBy: { changedAt: 'asc' },
  })

  // 2. Similar properties (same city + type, APPROVED) — their current prices
  const similar = await db.property.findMany({
    where: {
      city: property.city,
      type: property.type,
      status: 'APPROVED',
      area: { gt: 0 },
      id: { not: id },
    },
    select: { id: true, price: true, area: true },
  })

  // 3. Similar properties' price changes (for market trend)
  const similarIds = similar.map(s => s.id)
  let similarPriceHistory: any[] = []
  if (similarIds.length > 0) {
    similarPriceHistory = await db.priceHistory.findMany({
      where: { propertyId: { in: similarIds } },
      orderBy: { changedAt: 'asc' },
      select: { oldPrice: true, newPrice: true, changedAt: true, propertyId: true },
    })
  }

  // Build this property's price timeline
  const thisPropertyTimeline = priceHistory.map(h => ({
    date: h.changedAt.toISOString().slice(0, 10),
    label: h.changedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }),
    price: h.newPrice,
    oldPrice: h.oldPrice,
    change: h.oldPrice > 0 ? Math.round(((h.newPrice - h.oldPrice) / h.oldPrice) * 100) : null,
    pricePerSqft: Math.round(h.newPrice / property.area),
  }))

  // Compute market statistics
  const allPricesPerSqft = similar.map(p => p.price / p.area)
  const thisPropertyPricePerSqft = property.price / property.area

  const stats = {
    thisPropertyPricePerSqft: Math.round(thisPropertyPricePerSqft),
    thisPropertyCurrentPrice: property.price,
    thisPropertyOriginalPrice: priceHistory.length > 0 ? priceHistory[0]!.newPrice : property.price,
    priceChangeCount: priceHistory.length,
    priceChangeTotalPct: priceHistory.length > 0 && priceHistory[0]!.newPrice > 0
      ? Math.round(((property.price - priceHistory[0]!.newPrice) / priceHistory[0]!.newPrice) * 100)
      : 0,
    cityAveragePricePerSqft: allPricesPerSqft.length > 0
      ? Math.round(allPricesPerSqft.reduce((a, b) => a + b, 0) / allPricesPerSqft.length)
      : 0,
    cityMinPricePerSqft: allPricesPerSqft.length > 0 ? Math.round(Math.min(...allPricesPerSqft)) : 0,
    cityMaxPricePerSqft: allPricesPerSqft.length > 0 ? Math.round(Math.max(...allPricesPerSqft)) : 0,
    similarCount: similar.length + 1, // +1 for this property
    vsCityAveragePct: allPricesPerSqft.length > 0
      ? Math.round(((thisPropertyPricePerSqft - (allPricesPerSqft.reduce((a, b) => a + b, 0) / allPricesPerSqft.length)) / (allPricesPerSqft.reduce((a, b) => a + b, 0) / allPricesPerSqft.length)) * 100)
      : 0,
  }

  return jsonResponse({
    // This property's actual price history (real data, not approximated)
    priceHistory: thisPropertyTimeline,
    stats,
    city: property.city,
    type: property.type,
    // For the chart — if we have real price history, use it; otherwise fall back to
    // the current price as a single data point
    chartData: thisPropertyTimeline.length > 0
      ? thisPropertyTimeline.map(t => ({ month: t.label, avgPricePerSqft: t.pricePerSqft, count: 1 }))
      : [{
          month: new Date(property.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          avgPricePerSqft: Math.round(thisPropertyPricePerSqft),
          count: 1,
        }],
  })
}
