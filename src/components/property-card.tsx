'use client'

import Image from 'next/image'
import { Heart, MapPin, Bed, Bath, Maximize, BadgeCheck, Clock, GitCompare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, timeAgo, type PropertyWithRelations } from '@/lib/constants'
import { useApp } from '@/lib/store'
import { apiPost } from '@/lib/api-client'
import { getImageVariants } from '@/lib/image-utils'
import { ResponsiveImage } from '@/components/responsive-image'
import { toast } from 'sonner'
import { useState } from 'react'

interface Props {
  property: PropertyWithRelations
  layout?: 'grid' | 'list'
}

export function PropertyCard({ property, layout = 'grid' }: Props) {
  const { user, openAuthModal, navigate, compareIds, toggleCompare } = useApp()
  const [favorited, setFavorited] = useState<boolean>(!!property.isFavorited)
  const [busy, setBusy] = useState(false)
  const inCompare = compareIds.includes(property.id)

  const primaryImage =
    property.images?.find(i => i.isPrimary) || property.images?.[0] || { url: '/placeholder-property.svg' }

  const onToggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!inCompare && compareIds.length >= 4) {
      toast.info('You can compare up to 4 properties at a time')
      return
    }
    toggleCompare(property.id)
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      openAuthModal('login')
      return
    }
    setBusy(true)
    try {
      const res = await apiPost<{ favorited: boolean }>(`/api/favorites/${property.id}`)
      setFavorited(res.favorited)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle favorite')
    } finally {
      setBusy(false)
    }
  }

  const openDetail = () => navigate({ name: 'detail', propertyId: property.id })

  return (
    <Card
      onClick={openDetail}
      className={`group cursor-pointer overflow-hidden hover:shadow-lg transition-all border-border/60 hover:border-primary/40 ${
        layout === 'list' ? 'flex flex-row' : ''
      }`}
    >
      <div className={`relative overflow-hidden bg-muted ${layout === 'list' ? 'w-64 shrink-0' : 'aspect-[4/3]'}`}>
        <ResponsiveImage
          src={primaryImage.url}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {property.isNegotiable && (
            <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0">Negotiable</Badge>
          )}
          {property.owner?.isVerified && (
            <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white border-0 gap-1">
              <BadgeCheck className="h-3 w-3" /> Verified Seller
            </Badge>
          )}
          {property.isVerifiedListing && (
            <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white border-0 gap-1">
              <BadgeCheck className="h-3 w-3" /> Verified Listing
            </Badge>
          )}
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            onClick={toggleFavorite}
            disabled={busy}
            className="h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md border-0"
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={onToggleCompare}
            className={`h-9 w-9 rounded-full border-0 shadow-md ${
              inCompare
                ? 'bg-primary text-primary-foreground hover:bg-primary'
                : 'bg-white/90 hover:bg-white text-slate-700'
            }`}
            aria-label={inCompare ? 'Remove from comparison' : 'Add to comparison'}
            title={inCompare ? 'Remove from comparison' : 'Add to comparison'}
          >
            <GitCompare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xl font-bold text-primary">{formatPrice(property.price)}</div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" /> {timeAgo(property.createdAt)}
          </span>
        </div>
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {property.title}
        </h3>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {property.location}, {property.city}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" /> {property.bedrooms} BHK
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5" /> {property.area} sqft
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="text-xs font-medium text-foreground/70">{property.category?.name || 'Property'}</span>
          <span className="text-xs text-muted-foreground">{property.viewCount || 0} views</span>
        </div>
      </div>
    </Card>
  )
}
