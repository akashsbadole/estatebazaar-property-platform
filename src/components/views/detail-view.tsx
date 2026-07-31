'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Car,
  Phone,
  MessageCircle,
  Heart,
  Flag,
  Share2,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Building,
  Box,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PropertyCard } from '@/components/property-card'
import { ContactUsModal } from '@/components/contact-us-modal'
import { EmiCalculator } from '@/components/emi-calculator'
import { PriceTrendsChart } from '@/components/price-trends-chart'
import { MortgageModal } from '@/components/mortgage-modal'
import { VirtualTourViewer } from '@/components/virtual-tour-viewer'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import {
  formatPrice,
  formatPriceFull,
  timeAgo,
  PROPERTY_TYPES,
  FURNISHING_TYPES,
  REPORT_REASONS,
  type PropertyWithRelations,
} from '@/lib/constants'
import { toast } from 'sonner'

interface DetailResponse {
  property: PropertyWithRelations
  similar: PropertyWithRelations[]
}

interface Props {
  propertyId: string
}

export function DetailView({ propertyId }: Props) {
  const { user, openAuthModal, navigate, goBack } = useApp()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [mortgageOpen, setMortgageOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>('FRAUD')
  const [reportDesc, setReportDesc] = useState('')
  const [reporting, setReporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<DetailResponse>(`/api/properties/${propertyId}`)
      setData(res)
      setFavorited(!!res.property.isFavorited)
      setActiveImage(0)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load property')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async () => {
    if (!user) {
      openAuthModal('login')
      return
    }
    try {
      const res = await apiPost<{ favorited: boolean; message: string }>(`/api/favorites/${propertyId}`)
      setFavorited(res.favorited)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const startChat = async () => {
    if (!user) {
      openAuthModal('login')
      return
    }
    if (data?.property.ownerId === user.id) {
      toast.error('You cannot chat on your own listing')
      return
    }
    try {
      const res = await apiPost<{ chat: { id: string } }>('/api/chats', {
        propertyId,
        message: `Hi, I'm interested in "${data?.property.title}". Is it still available?`,
      })
      toast.success('Chat started')
      navigate({ name: 'chats', chatId: res.chat.id })
    } catch (err: any) {
      toast.error(err.message || 'Failed to start chat')
    }
  }

  const submitReport = async () => {
    if (!user) {
      openAuthModal('login')
      return
    }
    setReporting(true)
    try {
      await apiPost(`/api/properties/${propertyId}/report`, {
        reason: reportReason,
        description: reportDesc || undefined,
      })
      toast.success('Report submitted. Our team will review it.')
      setReportOpen(false)
      setReportDesc('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report')
    } finally {
      setReporting(false)
    }
  }

  const shareListing = async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.property.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      }
    } catch {
      // user cancelled
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Property not found</h2>
        <p className="text-muted-foreground mb-4">
          It may have been removed or is no longer available.
        </p>
        <Button onClick={() => navigate({ name: 'listings' })}>Browse listings</Button>
      </div>
    )
  }

  const { property, similar } = data
  const images = property.images.length
    ? property.images
    : [{ id: 'placeholder', url: '/placeholder-property.svg', isPrimary: true }]
  // Parse tourImages JSON (stored as string in DB)
  const tourImages: string[] = (() => {
    if (!property.tourImages) return []
    try {
      const parsed = JSON.parse(property.tourImages)
      return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : []
    } catch {
      return []
    }
  })()
  const typeLabel = PROPERTY_TYPES.find(t => t.value === property.type)?.label || property.type
  const furnishingLabel =
    FURNISHING_TYPES.find(f => f.value === property.furnishing)?.label || property.furnishing

  const isOwner = user?.id === property.ownerId

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={goBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: gallery + tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image slider */}
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[16/10] bg-muted">
              <Image
                src={images[activeImage]?.url || '/placeholder-property.svg'}
                alt={property.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
                unoptimized
                priority
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                    onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                    onClick={() => setActiveImage(i => (i + 1) % images.length)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                    {activeImage + 1} / {images.length}
                  </div>
                </>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                {property.isNegotiable && (
                  <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0">Negotiable</Badge>
                )}
                {property.owner.isVerified && (
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
              {/* Virtual Tour button overlay (only if property has tour images) */}
              {tourImages.length > 0 && (
                <Button
                  className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-lg"
                  onClick={() => setTourOpen(true)}
                >
                  <Box className="h-4 w-4" /> Virtual Tour
                </Button>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-thin">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                      i === activeImage ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <Image src={img.url} alt="" fill sizes="96px" className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Property Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Detail icon={Tag} label="Type" value={typeLabel} />
                  <Detail icon={Maximize} label="Area" value={`${property.area} sqft`} />
                  <Detail icon={Bed} label="Bedrooms" value={property.bedrooms > 0 ? `${property.bedrooms} BHK` : 'N/A'} />
                  <Detail icon={Bath} label="Bathrooms" value={property.bathrooms > 0 ? String(property.bathrooms) : 'N/A'} />
                  <Detail icon={Car} label="Parking" value={property.parking > 0 ? `${property.parking} car${property.parking > 1 ? 's' : ''}` : 'None'} />
                  <Detail icon={CheckCircle2} label="Furnishing" value={furnishingLabel} />
                  <Detail icon={Calendar} label="Posted" value={timeAgo(property.createdAt)} />
                  <Detail icon={Eye} label="Views" value={String(property.viewCount)} />
                  <Detail icon={Tag} label="Category" value={property.category.name} />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="description">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">About this property</h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {property.description}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="location">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Location</h3>
                <div className="flex items-start gap-2 text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">{property.location}</div>
                    <div className="text-sm">
                      {property.city}, {property.state}
                      {property.pincode ? ` - ${property.pincode}` : ''}
                    </div>
                  </div>
                </div>
                {property.latitude && property.longitude ? (
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden border bg-muted">
                    <iframe
                      title="Map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.008}%2C${property.longitude + 0.01}%2C${property.latitude + 0.008}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted p-8 text-center text-sm text-muted-foreground">
                    Map preview not available for this listing.
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Similar properties */}
          {similar.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4">Similar Properties</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similar.map(p => (
                  <PropertyCard key={p.id} property={p as any} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: pricing + seller */}
        <div className="space-y-4">
          <Card className="p-5 sticky top-20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="text-3xl font-bold text-primary">{formatPrice(property.price)}</div>
              <Badge variant="outline" className="shrink-0">
                {property.status === 'APPROVED' ? 'Available' : property.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{formatPriceFull(property.price)}</p>

            <h1 className="text-lg font-bold leading-snug mb-2">{property.title}</h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{property.location}, {property.city}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {property.bedrooms > 0 && (
                <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                  <Bed className="h-3.5 w-3.5" /> {property.bedrooms} BHK
                </span>
              )}
              {property.bathrooms > 0 && (
                <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                  <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                <Maximize className="h-3.5 w-3.5" /> {property.area} sqft
              </span>
              {property.parking > 0 && (
                <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                  <Car className="h-3.5 w-3.5" /> {property.parking}
                </span>
              )}
            </div>

            {!isOwner && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(property.contactPref === 'CALL' || property.contactPref === 'BOTH') && (
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={!property.contactPhone}
                    onClick={() => {
                      if (!user) return openAuthModal('login')
                      if (property.contactPhone) {
                        window.location.href = `tel:${property.contactPhone}`
                      }
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" /> Call
                  </Button>
                )}
                {(property.contactPref === 'CHAT' || property.contactPref === 'BOTH') && (
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                    onClick={startChat}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" /> Chat
                  </Button>
                )}
              </div>
            )}

            {isOwner && (
              <div className="space-y-2 mb-3">
                <div className="bg-muted/50 rounded-md p-3 text-sm text-center text-muted-foreground">
                  This is your listing. Manage it from My Listings.
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate({ name: 'edit', propertyId: property.id })}
                >
                  <Edit3 className="h-4 w-4 mr-2" /> Edit Listing
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={toggleFavorite} disabled={isOwner}>
                <Heart className={`h-4 w-4 mr-1 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                {favorited ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" onClick={shareListing}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} disabled={isOwner}>
                <Flag className="h-4 w-4 mr-1" /> Report
              </Button>
            </div>

            {!isOwner && (
              <Button
                variant="outline"
                className="w-full mt-2 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => setContactOpen(true)}
              >
                <Phone className="h-4 w-4 mr-2" /> Request a Call Back
              </Button>
            )}

            {!isOwner && (
              <Button
                className="w-full mt-2"
                onClick={() => setMortgageOpen(true)}
              >
                <Building className="h-4 w-4 mr-2" /> Apply for Home Loan
              </Button>
            )}
          </Card>

          {/* Price Trends Chart */}
          <PriceTrendsChart propertyId={property.id} />

          {/* EMI Calculator */}
          <EmiCalculator price={property.price} />

          {/* Seller card */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Posted By</h3>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={property.owner.avatarUrl || undefined} alt={property.owner.name} />
                <AvatarFallback className="bg-primary/15 text-primary">
                  {property.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">{property.owner.name}</span>
                  {property.owner.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Member since {new Date(property.owner.joinedDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
              <span>{property._count?.favorites || 0} saves</span>
              <span>{property.viewCount} views</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>
              Help us keep EstateBazaar safe. Our moderation team will review your report within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                placeholder="Provide any extra context that helps us investigate..."
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReport} disabled={reporting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {reporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact / Call-back request modal */}
      <ContactUsModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* Mortgage pre-approval modal */}
      <MortgageModal
        open={mortgageOpen}
        onClose={() => setMortgageOpen(false)}
        propertyId={property.id}
        propertyPrice={property.price}
        propertyTitle={property.title}
      />

      {/* Virtual Tour viewer modal */}
      <VirtualTourViewer
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        images={tourImages}
        title={property.title}
      />
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
