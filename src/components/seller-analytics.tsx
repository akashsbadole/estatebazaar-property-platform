'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Eye,
  Heart,
  MessageCircle,
  Flag,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  Target,
  MapPin,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api-client'
import { formatPrice, timeAgo } from '@/lib/constants'
import { useApp } from '@/lib/store'

interface AnalyticsData {
  hasListings: boolean
  summary: {
    totalListings: number
    totalViews: number
    totalFavorites: number
    totalChats: number
    totalReports: number
    avgViewsPerListing: number
    conversionRate: number
  }
  listings: Array<{
    id: string
    title: string
    city: string
    price: number
    status: string
    views: number
    favorites: number
    chats: number
    reports: number
    isVerifiedListing: boolean
    primaryImage: string
    conversionRate: number
  }>
  trend: Array<{ date: string; views: number; favorites: number; chats: number }>
  topPerformers: AnalyticsData['listings']
  cityBreakdown: Array<{ city: string; listings: number; views: number; chats: number }>
}

const PIE_COLORS = ['#0e7490', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#10b981']

export function SellerAnalytics() {
  const { navigate } = useApp()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<AnalyticsData>('/api/analytics/seller')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="p-6 md:col-span-3">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  if (!data || !data.hasListings) {
    return (
      <Card className="p-6 md:col-span-3 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No analytics to show yet. Post a property to start tracking views, favorites, and chats.
        </p>
        <Button size="sm" className="mt-3" onClick={() => navigate({ name: 'post' })}>
          Post Your First Property
        </Button>
      </Card>
    )
  }

  const { summary, trend, topPerformers, cityBreakdown } = data

  // Format trend dates for display
  const trendFormatted = trend.map(t => ({
    ...t,
    label: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }))

  const stats = [
    { label: 'Total Views', value: summary.totalViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Favorites', value: summary.totalFavorites, icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Chat Enquiries', value: summary.totalChats, icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Avg Views/Listing', value: summary.avgViewsPerListing, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ]

  return (
    <Card className="p-6 md:col-span-3">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Seller Analytics
        </h3>
        <Badge variant="outline" className="text-xs">
          {summary.totalListings} active listing{summary.totalListings === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`p-3 rounded-lg ${s.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString('en-IN')}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Conversion rate callout */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6 flex items-center gap-3">
        <Target className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium">Conversion Rate: </span>
          <span className="text-sm font-bold text-primary">{summary.conversionRate}%</span>
          <span className="text-xs text-muted-foreground ml-2">
            (chats per view — industry benchmark: 2-5%)
          </span>
        </div>
      </div>

      {/* 30-day trend chart */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3">30-Day Performance Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendFormatted} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0e7490" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0e7490" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFavs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="views" stroke="#0e7490" strokeWidth={2} fill="url(#colorViews)" name="Views" />
              <Area type="monotone" dataKey="favorites" stroke="#ef4444" strokeWidth={2} fill="url(#colorFavs)" name="Favorites" />
              <Area type="monotone" dataKey="chats" stroke="#14b8a6" strokeWidth={2} fill="url(#colorChats)" name="Chats" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column: Top Performers + City Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top performers */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-500" />
            Top Performers
          </h4>
          <div className="space-y-2">
            {topPerformers.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate({ name: 'detail', propertyId: p.id })}
              >
                <div className="relative h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                  <Image src={p.primaryImage} alt="" fill sizes="56px" className="object-cover" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-1">{p.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {p.views}</span>
                    <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {p.favorites}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {p.chats}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  #{i + 1}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* City breakdown pie chart */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            Views by City
          </h4>
          {cityBreakdown.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cityBreakdown}
                    dataKey="views"
                    nameKey="city"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ city, percent }) => `${city} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: '10px' }}
                  >
                    {cityBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No city data available.</p>
          )}
        </div>
      </div>

      {/* All listings table */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold mb-3">All Listings Performance</h4>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-3">Listing</th>
                <th className="py-2 px-3 text-right">Views</th>
                <th className="py-2 px-3 text-right">Favs</th>
                <th className="py-2 px-3 text-right">Chats</th>
                <th className="py-2 px-3 text-right">Conv. Rate</th>
                <th className="py-2 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.listings.map(l => (
                <tr
                  key={l.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate({ name: 'detail', propertyId: l.id })}
                >
                  <td className="py-2 pr-3">
                    <div className="font-medium line-clamp-1 max-w-[200px]">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.city} · {formatPrice(l.price)}</div>
                  </td>
                  <td className="py-2 px-3 text-right">{l.views}</td>
                  <td className="py-2 px-3 text-right">{l.favorites}</td>
                  <td className="py-2 px-3 text-right">{l.chats}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={l.conversionRate >= 3 ? 'text-emerald-600 font-medium' : ''}>
                      {l.conversionRate}%
                    </span>
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <Badge
                      variant="outline"
                      className={
                        l.status === 'APPROVED' ? 'border-emerald-500 text-emerald-700 text-xs' :
                        l.status === 'PENDING' ? 'border-amber-500 text-amber-700 text-xs' :
                        l.status === 'REJECTED' ? 'border-red-500 text-red-700 text-xs' :
                        'text-xs'
                      }
                    >
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
