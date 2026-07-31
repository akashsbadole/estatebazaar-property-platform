'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api-client'
import { formatPriceFull } from '@/lib/constants'

interface Props {
  propertyId: string
}

interface TrendPoint {
  month: string
  avgPricePerSqft: number | null
  count: number
}

interface Stats {
  thisPropertyPricePerSqft: number
  cityAveragePricePerSqft: number
  cityMinPricePerSqft: number
  cityMaxPricePerSqft: number
  similarCount: number
  vsCityAveragePct: number
}

interface Response {
  trend: TrendPoint[]
  stats: Stats
  city: string
  type: string
}

export function PriceTrendsChart({ propertyId }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Response>(`/api/properties/${propertyId}/price-trends`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [propertyId])

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </Card>
    )
  }

  if (!data || data.stats.similarCount === 0) {
    return null
  }

  const { trend, stats } = data
  const vsAvg = stats.vsCityAveragePct
  const trendIcon = vsAvg > 5 ? <TrendingUp className="h-4 w-4" /> : vsAvg < -5 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />
  const trendColor = vsAvg > 5 ? 'text-amber-600' : vsAvg < -5 ? 'text-emerald-600' : 'text-muted-foreground'
  const trendLabel = vsAvg > 5 ? 'above market' : vsAvg < -5 ? 'below market' : 'at market rate'

  // Format Y axis values (₹/sqft)
  const formatY = (val: number) => `₹${(val / 1000).toFixed(0)}k`

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Price Trends in {data.city}
        </h3>
        <Badge variant="outline" className="text-xs">
          {stats.similarCount} similar
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Average price per sqft for {data.type.toLowerCase()} properties in {data.city} over the last 6 months.
      </p>

      {/* This property's key stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-md bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground">This Property</div>
          <div className="text-sm font-bold text-primary">
            ₹{stats.thisPropertyPricePerSqft.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-muted-foreground">/sqft</div>
        </div>
        <div className="p-2 rounded-md bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground">City Average</div>
          <div className="text-sm font-bold">
            ₹{stats.cityAveragePricePerSqft.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-muted-foreground">/sqft</div>
        </div>
        <div className="p-2 rounded-md bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground">vs. Average</div>
          <div className={`text-sm font-bold flex items-center justify-center gap-1 ${trendColor}`}>
            {trendIcon}
            {vsAvg > 0 ? '+' : ''}{vsAvg}%
          </div>
          <div className="text-[10px] text-muted-foreground">{trendLabel}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={formatY}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              formatter={(value: any, name: string) => {
                if (value === null) return ['No data', 'Avg price/sqft']
                return [`₹${Number(value).toLocaleString('en-IN')}`, 'Avg price/sqft']
              }}
            />
            <ReferenceLine
              y={stats.thisPropertyPricePerSqft}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'This property',
                position: 'right',
                fill: 'hsl(var(--primary))',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Line
              type="monotone"
              dataKey="avgPricePerSqft"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-start gap-2 mt-3 pt-3 border-t">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Trend based on {stats.similarCount} {data.type.toLowerCase()} listings in {data.city}. Dashed line shows this
          property&apos;s price/sqft vs. the city average. Range: ₹{stats.cityMinPricePerSqft.toLocaleString('en-IN')} –
          ₹{stats.cityMaxPricePerSqft.toLocaleString('en-IN')}/sqft.
        </p>
      </div>
    </Card>
  )
}
