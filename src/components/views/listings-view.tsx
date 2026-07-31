'use client'

import { useEffect, useState, useCallback } from 'react'
import { Filter, Grid3x3, List, SlidersHorizontal, X, MapPin, Loader2, Search, BookmarkPlus, Bell } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyCard } from '@/components/property-card'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import { PROPERTY_TYPES, FURNISHING_TYPES, formatPriceFull, type PropertyWithRelations } from '@/lib/constants'
import { toast } from 'sonner'

// Leaflet must be loaded client-side only (uses window)
const MapView = dynamic(() => import('@/components/map-view').then(m => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[500px] flex items-center justify-center bg-muted/40 rounded-lg">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface Props {
  initialQuery?: Record<string, string | number | undefined>
}

interface ListingResponse {
  items: PropertyWithRelations[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface CategoriesResponse {
  items: Array<{ id: string; name: string; slug: string; icon: string | null }>
}

const PRICE_RANGES = [
  { label: 'Any', min: undefined, max: undefined },
  { label: 'Under ₹50 L', min: undefined, max: 5000000 },
  { label: '₹50 L – ₹1 Cr', min: 5000000, max: 10000000 },
  { label: '₹1 Cr – ₹2 Cr', min: 10000000, max: 20000000 },
  { label: '₹2 Cr – ₹5 Cr', min: 20000000, max: 50000000 },
  { label: '₹5 Cr+', min: 50000000, max: undefined },
]

export function ListingsView({ initialQuery }: Props) {
  const { navigate, user, openAuthModal } = useApp()
  const [items, setItems] = useState<PropertyWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<CategoriesResponse['items']>([])

  // filters
  const [q, setQ] = useState((initialQuery?.q as string) || '')
  const [type, setType] = useState<string>((initialQuery?.type as string) || 'ALL')
  const [city, setCity] = useState((initialQuery?.city as string) || '')
  const [categoryId, setCategoryId] = useState<string>((initialQuery?.categoryId as string) || 'ALL')
  const [furnishing, setFurnishing] = useState<string>('ALL')
  const [bedrooms, setBedrooms] = useState<number>(0)
  const [priceRange, setPriceRange] = useState<number>(0) // index into PRICE_RANGES
  const [sort, setSort] = useState<string>('latest')
  const [layout, setLayout] = useState<'grid' | 'list' | 'map'>('grid')
  const [saveSearchOpen, setSaveSearchOpen] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [savingSearch, setSavingSearch] = useState(false)

  useEffect(() => {
    apiGet<CategoriesResponse>('/api/categories').then(c => setCategories(c.items)).catch(() => {})
  }, [])

  // Apply initialQuery once
  useEffect(() => {
    if (initialQuery?.type) setType(initialQuery.type as string)
    if (initialQuery?.categoryId) setCategoryId(initialQuery.categoryId as string)
    if (initialQuery?.q) setQ(initialQuery.q as string)
    if (initialQuery?.city) setCity(initialQuery.city as string)
  }, [initialQuery])

  const buildQuery = useCallback(
    (page: number) => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '12')
      if (q) params.set('q', q)
      if (type !== 'ALL') params.set('type', type)
      if (city) params.set('city', city)
      if (categoryId !== 'ALL') params.set('categoryId', categoryId)
      if (furnishing !== 'ALL') params.set('furnishing', furnishing)
      if (bedrooms > 0) params.set('bedrooms', String(bedrooms))
      const range = PRICE_RANGES[priceRange]
      if (range?.min) params.set('minPrice', String(range.min))
      if (range?.max) params.set('maxPrice', String(range.max))
      if (sort) params.set('sort', sort)
      return params.toString()
    },
    [q, type, city, categoryId, furnishing, bedrooms, priceRange, sort],
  )

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const res = await apiGet<ListingResponse>(`/api/properties?${buildQuery(page)}`)
        setItems(prev => (append ? [...prev, ...res.items] : res.items))
        setTotal(res.total)
        setPage(res.page)
        setTotalPages(res.totalPages)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load listings')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [buildQuery],
  )

  // Refetch on filter change
  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  const hasActiveFilters = !!(q || type !== 'ALL' || city || categoryId !== 'ALL' || furnishing !== 'ALL' || bedrooms > 0 || priceRange > 0)

  const buildFiltersObject = useCallback(() => {
    const filters: Record<string, any> = {}
    if (q) filters.q = q
    if (type !== 'ALL') filters.type = type
    if (city) filters.city = city
    if (categoryId !== 'ALL') filters.categoryId = categoryId
    if (furnishing !== 'ALL') filters.furnishing = furnishing
    if (bedrooms > 0) filters.bedrooms = bedrooms
    const range = PRICE_RANGES[priceRange]
    if (range?.min) filters.minPrice = range.min
    if (range?.max) filters.maxPrice = range.max
    if (sort !== 'latest') filters.sort = sort
    return filters
  }, [q, type, city, categoryId, furnishing, bedrooms, priceRange, sort])

  const saveSearch = async () => {
    if (!user) {
      openAuthModal('login')
      return
    }
    if (!saveSearchName.trim()) {
      toast.error('Please give your saved search a name')
      return
    }
    setSavingSearch(true)
    try {
      await apiPost('/api/saved-searches', {
        name: saveSearchName.trim(),
        filters: buildFiltersObject(),
        alertEnabled,
      })
      toast.success('Search saved! Find it in your profile.')
      setSaveSearchOpen(false)
      setSaveSearchName('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save search')
    } finally {
      setSavingSearch(false)
    }
  }

  const Filters = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Keyword</Label>
        <Input placeholder="Search by name or locality" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Property Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {PROPERTY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>City</Label>
        <Input placeholder="e.g. Bangalore, Mumbai" value={city} onChange={e => setCity(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Price Range</Label>
        <Select value={String(priceRange)} onValueChange={v => setPriceRange(Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRICE_RANGES.map((r, i) => (
              <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Minimum Bedrooms</Label>
        <Select value={String(bedrooms)} onValueChange={v => setBedrooms(Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any</SelectItem>
            <SelectItem value="1">1+ BHK</SelectItem>
            <SelectItem value="2">2+ BHK</SelectItem>
            <SelectItem value="3">3+ BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Furnishing</Label>
        <Select value={furnishing} onValueChange={setFurnishing}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any</SelectItem>
            {FURNISHING_TYPES.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setQ('')
          setType('ALL')
          setCity('')
          setCategoryId('ALL')
          setFurnishing('ALL')
          setBedrooms(0)
          setPriceRange(0)
          setSort('latest')
        }}
      >
        Reset Filters
      </Button>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden md:block w-64 shrink-0">
          <Card className="p-4 sticky top-20">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <SlidersHorizontal className="h-4 w-4" />
              <h3 className="font-semibold">Filters</h3>
            </div>
            {Filters}
          </Card>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Browse Properties</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `${total} propert${total === 1 ? 'y' : 'ies'} found`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile filter sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    <Filter className="h-4 w-4 mr-1" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="p-4">{Filters}</div>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="relevance">Most Viewed</SelectItem>
                </SelectContent>
              </Select>

              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setSaveSearchOpen(true)}
                  disabled={!hasActiveFilters}
                  title={!hasActiveFilters ? 'Apply at least one filter to save this search' : 'Save this search'}
                >
                  <BookmarkPlus className="h-4 w-4" /> Save Search
                </Button>
              )}

              <div className="hidden sm:flex border rounded-md overflow-hidden">
                <Button
                  variant={layout === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-none h-9 w-9"
                  onClick={() => setLayout('grid')}
                  title="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-none h-9 w-9"
                  onClick={() => setLayout('list')}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'map' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-none h-9 w-9"
                  onClick={() => setLayout('map')}
                  title="Map view"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile: just a map toggle */}
              <Button
                variant={layout === 'map' ? 'secondary' : 'outline'}
                size="sm"
                className="sm:hidden"
                onClick={() => setLayout(layout === 'map' ? 'grid' : 'map')}
              >
                <MapPin className="h-4 w-4 mr-1" /> Map
              </Button>
            </div>
          </div>

          {/* Active filters */}
          {(q || type !== 'ALL' || city || categoryId !== 'ALL' || furnishing !== 'ALL' || bedrooms > 0 || priceRange > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {q && (
                <Badge variant="secondary" className="gap-1">
                  &quot;{q}&quot;
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setQ('')} />
                </Badge>
              )}
              {type !== 'ALL' && (
                <Badge variant="secondary" className="gap-1">
                  {PROPERTY_TYPES.find(t => t.value === type)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setType('ALL')} />
                </Badge>
              )}
              {city && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" /> {city}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCity('')} />
                </Badge>
              )}
              {categoryId !== 'ALL' && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === categoryId)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryId('ALL')} />
                </Badge>
              )}
              {furnishing !== 'ALL' && (
                <Badge variant="secondary" className="gap-1">
                  {FURNISHING_TYPES.find(f => f.value === furnishing)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFurnishing('ALL')} />
                </Badge>
              )}
              {bedrooms > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {bedrooms}+ BHK
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setBedrooms(0)} />
                </Badge>
              )}
              {priceRange > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {PRICE_RANGES[priceRange].label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange(0)} />
                </Badge>
              )}
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No properties found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search terms.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setQ('')
                  setType('ALL')
                  setCity('')
                  setCategoryId('ALL')
                  setFurnishing('ALL')
                  setBedrooms(0)
                  setPriceRange(0)
                }}
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            <>
              {layout === 'map' ? (
                <div className="space-y-4">
                  <div className="h-[calc(100vh-22rem)] min-h-[500px]">
                    <MapView
                      properties={items}
                      onSelect={(id) => navigate({ name: 'detail', propertyId: id })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Showing {items.length} properties on the map. Click a price marker for details.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    layout === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'flex flex-col gap-3'
                  }
                >
                  {items.map(p => (
                    <PropertyCard key={p.id} property={p} layout={layout} />
                  ))}
                </div>
              )}

              {layout !== 'map' && page < totalPages && (
                <div className="text-center mt-8">
                  <Button
                    onClick={() => fetchPage(page + 1, true)}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load more properties
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-primary" />
              Save this Search
            </DialogTitle>
            <DialogDescription>
              We&apos;ll save your current filters so you can quickly re-run this search later. Toggle
              alerts to be notified when new matching properties are listed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g. 3BHK Flats in Bangalore under ₹1 Cr"
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="bg-muted/40 rounded-md p-3 space-y-1.5 text-sm">
              <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Active Filters
              </div>
              {q && <div>· Keyword: <span className="font-medium">{q}</span></div>}
              {type !== 'ALL' && <div>· Type: <span className="font-medium">{PROPERTY_TYPES.find(t => t.value === type)?.label}</span></div>}
              {city && <div>· City: <span className="font-medium">{city}</span></div>}
              {categoryId !== 'ALL' && <div>· Category: <span className="font-medium">{categories.find(c => c.id === categoryId)?.name}</span></div>}
              {furnishing !== 'ALL' && <div>· Furnishing: <span className="font-medium">{FURNISHING_TYPES.find(f => f.value === furnishing)?.label}</span></div>}
              {bedrooms > 0 && <div>· Bedrooms: <span className="font-medium">{bedrooms}+ BHK</span></div>}
              {priceRange > 0 && <div>· Price: <span className="font-medium">{PRICE_RANGES[priceRange].label}</span></div>}
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-start gap-2">
                <Bell className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Email alerts for new matches</div>
                  <div className="text-xs text-muted-foreground">Get notified when new properties match these filters</div>
                </div>
              </div>
              <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveSearchOpen(false)}>Cancel</Button>
            <Button onClick={saveSearch} disabled={savingSearch || !saveSearchName.trim()}>
              {savingSearch ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
