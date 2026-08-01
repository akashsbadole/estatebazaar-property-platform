'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Search,
  MapPin,
  Building2,
  Home as HomeIcon,
  Castle,
  Map as MapIcon,
  Building,
  Store,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Users,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PropertyCard } from '@/components/property-card'
import { SearchSuggestions } from '@/components/search-suggestions'
import { useApp } from '@/lib/store'
import { useI18n } from '@/lib/i18n-context'
import { apiGet } from '@/lib/api-client'
import { formatPrice, type PropertyWithRelations } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'

interface FeaturedResponse {
  latest: PropertyWithRelations[]
  popular: PropertyWithRelations[]
  cities: Array<{ city: string; state: string }>
}
interface CategoriesResponse {
  items: Array<{ id: string; name: string; slug: string; icon: string | null; _count: { properties: number } }>
}
interface RecentResponse {
  items: PropertyWithRelations[]
}
interface RecommendedResponse {
  items: PropertyWithRelations[]
  reason: 'personalized' | 'trending'
  profile?: {
    topCity: string
    topType: string
    topCategory: string
    avgPrice: number
    referenceCount: number
  }
}

const CATEGORY_ICONS: Record<string, any> = {
  Building2,
  Home: HomeIcon,
  Castle,
  Map: MapIcon,
  Building,
  Store,
}

export function HomeView() {
  const { navigate, user } = useApp()
  const { t } = useI18n()
  const [featured, setFeatured] = useState<FeaturedResponse | null>(null)
  const [categories, setCategories] = useState<CategoriesResponse['items']>([])
  const [recent, setRecent] = useState<PropertyWithRelations[]>([])
  const [recommended, setRecommended] = useState<RecommendedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')
  const [nearbyCount, setNearbyCount] = useState(0)

  useEffect(() => {
    const promises: Promise<any>[] = [
      apiGet<FeaturedResponse>('/api/properties/featured'),
      apiGet<CategoriesResponse>('/api/categories'),
      apiGet<RecommendedResponse>('/api/properties/recommended').catch(() => null),
    ]
    if (user) {
      promises.push(
        apiGet<RecentResponse>('/api/recently-viewed').then(r => r.items).catch(() => []),
      )
    }
    Promise.all(promises)
      .then((results) => {
        const [f, c, rec, recentItems] = results
        setFeatured(f)
        setCategories(c.items)
        if (rec) setRecommended(rec)
        if (recentItems && Array.isArray(recentItems)) setRecent(recentItems)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await apiGet<{ total: number }>(`/api/properties?lat=${latitude}&lng=${longitude}&radius=5000&pageSize=1`)
          setNearbyCount(res.total)
          sessionStorage.setItem('eb_user_location', JSON.stringify({ lat: latitude, lng: longitude }))
          setLocationStatus('granted')
        } catch {
          setLocationStatus('denied')
        }
      },
      () => setLocationStatus('denied'),
      { timeout: 8000, maximumAge: 600000 },
    )
  }, [])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query: Record<string, string> = {}
    if (search) query.q = search
    if (city) query.city = city
    navigate({ name: 'listings', query })
  }

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">
              {t('home.badge')}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              {t('home.heroTitle')}{' '}
              <span className="text-primary">{t('home.heroTitleHighlight')}</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto">
              {t('home.heroSubtitle')}
            </p>

            <form onSubmit={onSearch} className="bg-card border rounded-xl shadow-lg p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <SearchSuggestions
                  value={search}
                  onChange={setSearch}
                  onSelect={(q) => navigate({ name: 'listings', query: city ? { q, city } : { q } })}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 md:w-auto w-full">
                <Search className="h-5 w-5 mr-2" /> Search
              </Button>
            </form>

            <div className="grid grid-cols-3 gap-4 mt-10 max-w-xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {featured ? (featured.latest?.length || 0) + (featured.popular?.length || 0) : '12K+'}
                </div>
                <div className="text-xs text-muted-foreground">{t('home.statListings')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">8+</div>
                <div className="text-xs text-muted-foreground">{t('home.statCities')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
                <div className="text-xs text-muted-foreground">{t('home.statBrokerFree')}</div>
              </div>
            </div>

            {locationStatus === 'granted' && nearbyCount > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const loc = sessionStorage.getItem('eb_user_location')
                    if (loc) {
                      const { lat, lng } = JSON.parse(loc)
                      navigate({ name: 'listings', query: { lat, lng, radius: 5000 } })
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  {nearbyCount} propert{nearbyCount === 1 ? 'y' : 'ies'} near you
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('home.browseByCategory')}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'listings' })}>
            {t('common.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat.icon || 'Building2'] || Building2
                return (
                  <Card
                    key={cat.id}
                    className="p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary hover:shadow-md transition-all text-center"
                    onClick={() => navigate({ name: 'listings', query: { categoryId: cat.id } })}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="font-semibold text-sm leading-tight">{cat.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cat._count.properties} listing{cat._count.properties === 1 ? '' : 's'}
                    </div>
                  </Card>
                )
              })}
        </div>
      </section>

      {/* Recommended for you (or trending for guests) */}
      {recommended && recommended.items && recommended.items.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">
                {recommended.reason === 'personalized' ? t('home.recommendedForYou') : t('home.trendingNow')}
              </h2>
            </div>
            {recommended.reason === 'personalized' && recommended.profile && (
              <Badge variant="outline" className="text-xs">
                Based on {recommended.profile.referenceCount} properties you&apos;ve viewed
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.items.slice(0, 4).map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">{t('home.latestProperties')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'listings' })}>
            {t('common.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (featured?.latest || []).slice(0, 4).map(p => <PropertyCard key={p.id} property={p} />)}
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">{t('home.trendingNow')}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (featured?.popular || []).slice(0, 4).map(p => <PropertyCard key={p.id} property={p} />)}
        </div>
      </section>

      {/* Recently viewed (only for logged-in users) */}
      {user && recent.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">{t('home.recentlyViewed')}</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.slice(0, 4).map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-muted/30 mt-8">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-10">{t('home.whyChooseUs')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Verified Listings</h3>
              <p className="text-sm text-muted-foreground">
                Every listing is manually reviewed by our moderation team. Report fraud with one tap
                and our team investigates within 24 hours.
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Chat Directly</h3>
              <p className="text-sm text-muted-foreground">
                No middlemen. Use our in-app chat to negotiate, ask questions, and finalize deals
                directly with property owners in real time.
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Free to Post</h3>
              <p className="text-sm text-muted-foreground">
                List unlimited properties for free. Reach thousands of serious buyers and tenants
                without paying any brokerage or commission.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Ready to sell or rent your property?
              </h2>
              <p className="opacity-90">Post your listing in under 2 minutes. No brokerage, no hidden fees.</p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate({ name: 'post' })}
            >
              <Building2 className="h-5 w-5 mr-2" /> Post Free Ad
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
}
