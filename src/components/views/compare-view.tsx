'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  X,
  Check,
  Minus,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Car,
  IndianRupee,
  CheckCircle2,
  Eye,
  Calendar,
  BadgeCheck,
  Building2,
  Layers,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import {
  formatPrice,
  formatPriceFull,
  timeAgo,
  PROPERTY_TYPES,
  FURNISHING_TYPES,
  type PropertyWithRelations,
} from '@/lib/constants'
import { toast } from 'sonner'

interface CompareResponse {
  items: PropertyWithRelations[]
}

interface Props {
  initialIds: string[]
}

// Rows for the comparison table — each row shows one attribute across all properties.
interface Row {
  label: string
  icon: any
  render: (p: PropertyWithRelations) => React.ReactNode
  // Highlight the "best" value across properties (e.g., lowest price)
  best?: (values: PropertyWithRelations[]) => number[] // returns indices of best properties
}

const ROWS: Row[] = [
  {
    label: 'Price',
    icon: IndianRupee,
    render: p => <span className="font-bold text-primary">{formatPriceFull(p.price)}</span>,
    best: values => {
      const min = Math.min(...values.map(v => v.price))
      return values.map((v, i) => v.price === min ? i : -1).filter(i => i >= 0)
    },
  },
  {
    label: 'Price / sqft',
    icon: Layers,
    render: p => <span>₹ {Math.round(p.price / p.area).toLocaleString('en-IN')}</span>,
    best: values => {
      const perSqft = values.map(v => v.price / v.area)
      const min = Math.min(...perSqft)
      return perSqft.map((v, i) => v === min ? i : -1).filter(i => i >= 0)
    },
  },
  {
    label: 'Negotiable',
    icon: IndianRupee,
    render: p => p.isNegotiable ? <Check className="h-4 w-4 text-emerald-500" /> : <Minus className="h-4 w-4 text-muted-foreground" />,
  },
  {
    label: 'Area',
    icon: Maximize,
    render: p => <span>{p.area.toLocaleString('en-IN')} sqft</span>,
    best: values => {
      const max = Math.max(...values.map(v => v.area))
      return values.map((v, i) => v.area === max ? i : -1).filter(i => i >= 0)
    },
  },
  {
    label: 'Type',
    icon: Building2,
    render: p => <span>{PROPERTY_TYPES.find(t => t.value === p.type)?.label || p.type}</span>,
  },
  {
    label: 'Bedrooms',
    icon: Bed,
    render: p => p.bedrooms > 0 ? <span>{p.bedrooms} BHK</span> : <span className="text-muted-foreground">N/A</span>,
    best: values => {
      const max = Math.max(...values.map(v => v.bedrooms))
      return values.map((v, i) => v.bedrooms === max && max > 0 ? i : -1).filter(i => i >= 0)
    },
  },
  {
    label: 'Bathrooms',
    icon: Bath,
    render: p => p.bathrooms > 0 ? <span>{p.bathrooms}</span> : <span className="text-muted-foreground">N/A</span>,
    best: values => {
      const max = Math.max(...values.map(v => v.bathrooms))
      return values.map((v, i) => v.bathrooms === max && max > 0 ? i : -1).filter(i => i >= 0)
    },
  },
  {
    label: 'Parking',
    icon: Car,
    render: p => p.parking > 0 ? <span>{p.parking} car{p.parking > 1 ? 's' : ''}</span> : <span className="text-muted-foreground">None</span>,
  },
  {
    label: 'Furnishing',
    icon: CheckCircle2,
    render: p => <span>{FURNISHING_TYPES.find(f => f.value === p.furnishing)?.label || p.furnishing}</span>,
  },
  {
    label: 'Location',
    icon: MapPin,
    render: p => <span className="text-sm">{p.location}<br /><span className="text-xs text-muted-foreground">{p.city}, {p.state}</span></span>,
  },
  {
    label: 'Category',
    icon: Building2,
    render: p => <Badge variant="outline">{p.category?.name || 'Property'}</Badge>,
  },
  {
    label: 'Posted',
    icon: Calendar,
    render: p => <span className="text-sm">{timeAgo(p.createdAt)}</span>,
  },
  {
    label: 'Views',
    icon: Eye,
    render: p => <span>{p.viewCount}</span>,
  },
  {
    label: 'Verified Listing',
    icon: BadgeCheck,
    render: p => p.isVerifiedListing
      ? <Badge className="bg-blue-600 hover:bg-blue-600 border-0">Verified</Badge>
      : <Minus className="h-4 w-4 text-muted-foreground" />,
  },
  {
    label: 'Verified Seller',
    icon: BadgeCheck,
    render: p => p.owner?.isVerified
      ? <Badge className="bg-emerald-600 hover:bg-emerald-600 border-0">Verified</Badge>
      : <Minus className="h-4 w-4 text-muted-foreground" />,
  },
]

export function CompareView({ initialIds }: Props) {
  const { navigate, goBack, clearCompare } = useApp()
  const [items, setItems] = useState<PropertyWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (initialIds.length < 2) {
      toast.error('Select at least 2 properties to compare')
      navigate({ name: 'listings' })
      return
    }
    const load = async () => {
      try {
        if (!cancelled) setLoading(true)
        const res = await apiGet<CompareResponse>(`/api/properties/compare?ids=${initialIds.join(',')}`)
        if (cancelled) return
        setItems(res.items)
        if (res.items.length < 2) {
          toast.error('Could not load enough properties for comparison')
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load comparison')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [initialIds, navigate])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (items.length < 2) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Not enough properties to compare.</p>
        <Button onClick={() => navigate({ name: 'listings' })}>Browse Listings</Button>
      </div>
    )
  }

  // Precompute "best" indices per row
  const bestIndicesByRow = ROWS.map(row => row.best ? row.best(items) : [])

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Compare Properties</h1>
          <Badge variant="outline">{items.length} properties</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearCompare()
            navigate({ name: 'listings' })
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Clear & Exit
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <tbody>
              {/* Header row with property cards */}
              <tr className="border-b">
                <td className="p-4 sticky left-0 bg-card z-10 min-w-[140px] align-top">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Compare
                  </div>
                  <div className="text-sm font-medium mt-1">{items.length} selected</div>
                </td>
                {items.map(p => {
                  const primary = p.images?.find(i => i.isPrimary) || p.images?.[0]
                  return (
                    <td key={p.id} className="p-3 align-top min-w-[220px] max-w-[260px]">
                      <div
                        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer mb-2"
                        onClick={() => navigate({ name: 'detail', propertyId: p.id })}
                      >
                        {primary && (
                          <Image
                            src={primary.url}
                            alt={p.title}
                            fill
                            sizes="220px"
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        <div className="absolute top-1.5 left-1.5 flex gap-1">
                          {p.isNegotiable && (
                            <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0 text-xs">Negotiable</Badge>
                          )}
                          {p.isVerifiedListing && (
                            <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white border-0 text-xs">Verified</Badge>
                          )}
                        </div>
                      </div>
                      <button
                        className="font-semibold text-sm line-clamp-2 hover:text-primary text-left"
                        onClick={() => navigate({ name: 'detail', propertyId: p.id })}
                      >
                        {p.title}
                      </button>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.city}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Data rows */}
              {ROWS.map((row, rowIdx) => {
                const bestIndices = bestIndicesByRow[rowIdx]
                return (
                  <tr key={row.label} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {row.label}
                      </div>
                    </td>
                    {items.map((p, i) => {
                      const isBest = bestIndices.includes(i)
                      return (
                        <td key={p.id} className={`p-3 text-sm align-top ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            {row.render(p)}
                            {isBest && (
                              <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1 py-0 ml-1">BEST</Badge>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Action row */}
              <tr>
                <td className="p-3 sticky left-0 bg-card z-10" />
                {items.map(p => (
                  <td key={p.id} className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate({ name: 'detail', propertyId: p.id })}
                    >
                      View Details
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        <strong>Tip:</strong> Cells highlighted in green indicate the best value across compared properties.
        Lower price, lower price/sqft, larger area, and more bedrooms/bathrooms are considered &quot;better&quot;.
      </p>
    </div>
  )
}
