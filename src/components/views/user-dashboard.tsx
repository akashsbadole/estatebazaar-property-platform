'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Heart,
  MessageCircle,
  BookmarkPlus,
  Bell,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Clock,
  Shield,
  Crown,
  Star,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyCard } from '@/components/property-card'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatPrice, timeAgo, PROPERTY_STATUS, type PropertyWithRelations } from '@/lib/constants'
import { toast } from 'sonner'

interface DashboardStats {
  listingCount: number
  favCount: number
  unreadCount: number
  savedSearchCount: number
}

interface RecentListing {
  id: string
  title: string
  city: string
  price: number
  status: string
  viewCount: number
  createdAt: string
  image: string | null
}

interface ActivityItem {
  action: string
  meta: Record<string, any> | null
  createdAt: string
}

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, any>
  alertEnabled: boolean
  newMatchCount: number
}

interface DashboardResponse {
  stats: DashboardStats
  recentListings: RecentListing[]
  recentActivity: ActivityItem[]
  savedSearches: SavedSearch[]
}

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  USER_SIGNUP: { label: 'Created account', icon: '👋' },
  USER_LOGIN: { label: 'Logged in', icon: '🔑' },
  PROPERTY_CREATE: { label: 'Posted a property', icon: '🏠' },
  PROPERTY_UPDATE: { label: 'Updated a listing', icon: '✏️' },
  PROPERTY_DELETE: { label: 'Deleted a listing', icon: '🗑️' },
  FAVORITE_ADD: { label: 'Saved a property', icon: '❤️' },
  CHAT_CREATE: { label: 'Started a chat', icon: '💬' },
  MESSAGE_SEND: { label: 'Sent a message', icon: '📨' },
  REPORT_CREATE: { label: 'Reported a listing', icon: '🚩' },
  SUBSCRIPTION_ACTIVATED: { label: 'Upgraded plan', icon: '⭐' },
  CONTACT_REQUEST_CREATE: { label: 'Sent a contact request', icon: '📧' },
}

type Tab = 'overview' | 'listings' | 'saved' | 'activity'

export function UserDashboard() {
  const { user, navigate, setUser } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    apiGet<DashboardResponse>('/api/users/dashboard')
      .then(setData)
      .catch(err => toast.error(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view your dashboard</h2>
        <Button onClick={() => navigate({ name: 'home' })} className="mt-3">Go Home</Button>
      </div>
    )
  }

  const stats = data?.stats || { listingCount: 0, favCount: 0, unreadCount: 0, savedSearchCount: 0 }

  const statCards = [
    { label: 'My Listings', value: stats.listingCount, icon: Building2, color: 'text-primary', bg: 'bg-primary/10', view: 'my-listings' as const },
    { label: 'Favorites', value: stats.favCount, icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', view: 'favorites' as const },
    { label: 'Unread Messages', value: stats.unreadCount, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', view: 'chats' as const },
    { label: 'Saved Searches', value: stats.savedSearchCount, icon: BookmarkPlus, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', view: 'profile' as const },
  ]

  const getActionLabel = (action: string) => {
    const found = Object.entries(ACTION_LABELS).find(([k]) => action === k)
    if (found) return found[1]
    return { label: action.replace(/_/g, ' ').toLowerCase(), icon: '📋' }
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your account</p>
        </div>
        <div className="flex gap-2">
          {user.subscriptionTier && user.subscriptionTier !== 'FREE' && (
            <Badge className="bg-amber-500/90 hover:bg-amber-500 gap-1">
              <Crown className="h-3 w-3" /> {user.subscriptionTier}
            </Badge>
          )}
          <Button size="sm" onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1" /> Post Property
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5"><Building2 className="h-4 w-4" /> Listings</TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5"><BookmarkPlus className="h-4 w-4" /> Saved</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Clock className="h-4 w-4" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map(s => (
                  <Card
                    key={s.label}
                    className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${s.bg}`}
                    onClick={() => navigate({ name: s.view })}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Recent Listings
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setTab('listings')}>View all</Button>
                  </div>
                  {data?.recentListings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No listings yet. Post your first property!</p>
                  ) : (
                    <div className="space-y-3">
                      {data?.recentListings.slice(0, 4).map(l => {
                        const statusInfo = PROPERTY_STATUS.find(s => s.value === l.status) || PROPERTY_STATUS[0]
                        return (
                          <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ name: 'detail', propertyId: l.id })}>
                            <div className="relative h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                              {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" unoptimized />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm line-clamp-1">{l.title}</div>
                              <div className="text-xs text-muted-foreground">{l.city} · {formatPrice(l.price)}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={`text-xs ${
                                l.status === 'APPROVED' ? 'border-emerald-500 text-emerald-700' :
                                l.status === 'PENDING' ? 'border-amber-500 text-amber-700' :
                                l.status === 'REJECTED' ? 'border-red-500 text-red-700' : ''
                              }`}>{l.status}</Badge>
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {l.viewCount}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Saved Searches & Alerts
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setTab('saved')}>View all</Button>
                  </div>
                  {data?.savedSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No saved searches. Apply filters and save one!</p>
                  ) : (
                    <div className="space-y-2">
                      {data?.savedSearches.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Bell className={`h-3 w-3 ${s.alertEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                              {s.alertEnabled ? 'Alerts on' : 'Alerts off'}
                            </div>
                          </div>
                          {s.newMatchCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-xs">{s.newMatchCount} new</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{data?.recentListings.length || 0} listings</p>
            <Button size="sm" onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> New Listing
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : data?.recentListings.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No listings yet</h3>
              <p className="text-muted-foreground mb-4">Post your first property to start receiving enquiries.</p>
              <Button onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">Post Property</Button>
            </Card>
          ) : data && data.recentListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.recentListings.map(l => (
                <Card key={l.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate({ name: 'detail', propertyId: l.id })}>
                  <div className="relative aspect-[4/3] bg-muted">
                    {l.image && <Image src={l.image} alt={l.title} fill sizes="300px" className="object-cover" unoptimized />}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className={
                        l.status === 'APPROVED' ? 'bg-emerald-500/90 text-white border-0' :
                        l.status === 'PENDING' ? 'bg-amber-500/90 text-white border-0' :
                        l.status === 'REJECTED' ? 'bg-red-500/90 text-white border-0' : ''
                      }>{l.status}</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold">{formatPrice(l.price)}</div>
                    <div className="text-sm font-medium line-clamp-1">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.city}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3">
          {data?.savedSearches.length === 0 ? (
            <Card className="p-12 text-center">
              <BookmarkPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No saved searches</h3>
              <p className="text-muted-foreground">Apply filters on the listings page and click &quot;Save Search&quot; to get started.</p>
            </Card>
          ) : (
            data?.savedSearches.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(s.filters).slice(0, 4).map(([key, val]) => (
                        <Badge key={key} variant="outline" className="text-xs">{key}: {String(val)}</Badge>
                      ))}
                    </div>
                  </div>
                  {s.newMatchCount > 0 && <Badge className="bg-primary text-primary-foreground">{s.newMatchCount} new</Badge>}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate({ name: 'listings', query: s.filters as any })}>
                  Run Search
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-2">
          {data?.recentActivity.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity yet. Start exploring EstateBazaar!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {data?.recentActivity.map((a, i) => {
                const { label, icon } = getActionLabel(a.action)
                return (
                  <Card key={i} className="p-3 flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{label}</span>
                      {a.meta && Object.keys(a.meta).length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {Object.entries(a.meta).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
