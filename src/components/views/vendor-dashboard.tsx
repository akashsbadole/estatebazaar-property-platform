'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApp } from '@/lib/store'
import { apiGet, apiPatch, apiDelete } from '@/lib/api-client'
import { formatPrice, timeAgo, PROPERTY_STATUS, type PropertyWithRelations } from '@/lib/constants'
import { toast } from 'sonner'
import { SellerAnalytics } from '@/components/seller-analytics'

interface VendorOverview {
  totalListings: number
  totalViews: number
  totalFavorites: number
  totalChats: number
  activeListings: number
  pendingListings: number
  soldListings: number
}

interface Enquiry {
  id: string
  propertyId: string
  propertyTitle: string
  buyerName: string
  buyerEmail?: string
  type: 'CHAT' | 'CONTACT_REQUEST'
  status: string
  createdAt: string
  message?: string
}

type Tab = 'overview' | 'listings' | 'enquiries' | 'analytics'

export function VendorDashboard() {
  const { user, navigate, openAuthModal } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<VendorOverview | null>(null)
  const [listings, setListings] = useState<PropertyWithRelations[]>([])
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [overviewRes, listingsRes, enquiriesRes] = await Promise.all([
        apiGet<VendorOverview>('/api/vendor/overview'),
        apiGet<{ items: PropertyWithRelations[] }>('/api/properties/my?pageSize=50'),
        apiGet<{ items: Enquiry[] }>('/api/vendor/enquiries').catch(() => ({ items: [] })),
      ])
      setOverview(overviewRes)
      setListings(listingsRes.items)
      setEnquiries(enquiriesRes.items)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadAll() }, [loadAll])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await apiDelete(`/api/properties/${deleteId}`)
      setListings(prev => prev.filter(p => p.id !== deleteId))
      setOverview(prev => prev ? { ...prev, totalListings: prev.totalListings - 1 } : prev)
      toast.success('Property deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to access your vendor dashboard</h2>
        <Button onClick={() => openAuthModal('login')} className="mt-3">Sign In</Button>
      </div>
    )
  }

  const stats = overview ? [
    { label: 'Total Views', value: overview.totalViews.toLocaleString('en-IN'), icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Enquiries', value: overview.totalChats.toLocaleString('en-IN'), icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Favorites', value: overview.totalFavorites.toLocaleString('en-IN'), icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Active Listings', value: overview.activeListings.toString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ] : []

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Vendor Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${overview?.totalListings || 0} total listings`}
          </p>
        </div>
        <Button onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> Post Property
        </Button>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5"><Building2 className="h-4 w-4" /> Listings</TabsTrigger>
          <TabsTrigger value="enquiries" className="gap-1.5"><MessageCircle className="h-4 w-4" /> Enquiries</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(s => (
                  <Card key={s.label} className={`p-4 ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </Card>
                ))}
              </div>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xl font-bold text-primary">{overview.totalListings}</div>
                    <div className="text-xs text-muted-foreground">Total Listings</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xl font-bold text-emerald-600">{overview.activeListings}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xl font-bold text-amber-600">{overview.pendingListings}</div>
                    <div className="text-xs text-muted-foreground">Pending Approval</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xl font-bold text-primary">{overview.soldListings}</div>
                    <div className="text-xs text-muted-foreground">Sold</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent Listings</h3>
                  <Button variant="ghost" size="sm" onClick={() => setTab('listings')}>
                    View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
                {listings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No listings yet. Post your first property!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.slice(0, 3).map(p => {
                      const primary = p.images.find(i => i.isPrimary) || p.images[0]
                      const statusInfo = PROPERTY_STATUS.find(s => s.value === p.status) || PROPERTY_STATUS[0]
                      return (
                        <Card key={p.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate({ name: 'detail', propertyId: p.id })}>
                          <div className="relative aspect-[4/3] bg-muted">
                            {primary && (
                              <Image src={primary.url} alt={p.title} fill sizes="300px" className="object-cover" unoptimized />
                            )}
                            <div className="absolute top-2 left-2">
                              <Badge className={`bg-${statusInfo.color}-500/90 text-white border-0`}>{statusInfo.label}</Badge>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="font-semibold text-sm line-clamp-1">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.city}, {p.state}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {p.viewCount}</span>
                              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {p._count?.favorites || 0}</span>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{listings.length} listing{listings.length === 1 ? '' : 's'}</p>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          {listings.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No listings yet</h3>
              <p className="text-muted-foreground mb-4">Post your first property to start receiving enquiries.</p>
              <Button onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" /> Post Property
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(p => {
                const primary = p.images.find(i => i.isPrimary) || p.images[0]
                const statusInfo = PROPERTY_STATUS.find(s => s.value === p.status) || PROPERTY_STATUS[0]
                return (
                  <Card key={p.id} className="overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] bg-muted cursor-pointer" onClick={() => navigate({ name: 'detail', propertyId: p.id })}>
                      {primary && <Image src={primary.url} alt={p.title} fill sizes="300px" className="object-cover" unoptimized />}
                      <div className="absolute top-2 left-2">
                        <Badge className={`bg-${statusInfo.color}-500/90 text-white border-0`}>{statusInfo.label}</Badge>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div className="text-lg font-bold text-primary">{formatPrice(p.price)}</div>
                      <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                      <div className="text-xs text-muted-foreground">{p.city}, {p.state}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.viewCount}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {p._count?.favorites || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {p._count?.reports || 0}</span>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate({ name: 'edit', propertyId: p.id })}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enquiries" className="space-y-3">
          {enquiries.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No enquiries yet</h3>
              <p className="text-muted-foreground">Enquiries from buyers will appear here when they contact you.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {enquiries.map(enq => (
                <Card key={enq.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{enq.buyerName}</span>
                      <Badge variant="outline" className="text-xs">{enq.type === 'CHAT' ? 'Chat' : 'Contact Request'}</Badge>
                      {enq.status === 'NEW' && <Badge className="bg-blue-500 text-white text-xs">New</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Re: {enq.propertyTitle}
                    </div>
                    {enq.message && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">&quot;{enq.message}&quot;</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(enq.createdAt)}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate({ name: 'chats' })}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Reply
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <SellerAnalytics />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete this listing?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The listing, its images, favorites, and chats will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
