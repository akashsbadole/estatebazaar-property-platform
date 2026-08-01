'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Users,
  Flag,
  Shield,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Trash2,
  Ban,
  RefreshCw,
  Loader2,
  Eye,
  AlertTriangle,
  CircleDot,
  Mail,
  BadgeCheck,
  Phone,
  Download,
  Settings,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api-client'
import { formatPrice, timeAgo, PROPERTY_STATUS, REPORT_REASONS, REPORT_STATUS } from '@/lib/constants'
import { toast } from 'sonner'
import { AdminUserDetailDrawer } from '@/components/admin-user-detail-drawer'

type Tab = 'dashboard' | 'listings' | 'users' | 'reports' | 'contacts' | 'audit-log' | 'settings'

export function AdminView() {
  const { user, navigate } = useApp()
  const [tab, setTab] = useState<Tab>('dashboard')

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Admin access required</h2>
        <p className="text-muted-foreground mb-4">You don&apos;t have permission to view this page.</p>
        <Button onClick={() => navigate({ name: 'home' })}>Go Home</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Badge className="bg-amber-500/90 hover:bg-amber-500">Admin Only</Badge>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 max-w-4xl mb-6">
          <TabsTrigger value="dashboard" className="gap-1">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1">
            <Building2 className="h-4 w-4" /> Listings
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1">
            <Flag className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Mail className="h-4 w-4" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="audit-log" className="gap-1">
            <Shield className="h-4 w-4" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="listings"><ListingsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="audit-log"><AuditLogTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ---------- Dashboard ----------
function DashboardTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<any>('/api/admin/stats')
      setStats(res)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  if (!stats) {
    return <Card className="p-8 text-center text-muted-foreground">Failed to load stats.</Card>
  }

  const cards = [
    { label: 'Total Users', value: stats.totals.users, icon: Users, color: 'text-blue-600' },
    { label: 'Total Listings', value: stats.totals.properties, icon: Building2, color: 'text-purple-600' },
    { label: 'Pending Review', value: stats.totals.pendingProperties, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Approved', value: stats.totals.approvedProperties, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Total Chats', value: stats.totals.chats, icon: TrendingUp, color: 'text-cyan-600' },
    { label: 'Total Messages', value: stats.totals.messages, icon: TrendingUp, color: 'text-cyan-700' },
    { label: 'Open Reports', value: stats.totals.openReports, icon: Flag, color: 'text-red-600' },
    { label: 'Banned Users', value: stats.totals.bannedUsers, icon: Ban, color: 'text-rose-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform Analytics</h2>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Listings — Last 7 Days</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {stats.charts.listingsTrend.map((d: any) => {
              const max = Math.max(...stats.charts.listingsTrend.map((x: any) => x.count), 1)
              const h = (d.count / max) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t"
                    style={{ height: `${Math.max(h, 4)}%` }}
                    title={`${d.count} listings`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Top Cities</h3>
          <div className="space-y-2">
            {stats.charts.cityDistribution.map((c: any) => {
              const max = Math.max(...stats.charts.cityDistribution.map((x: any) => x.count))
              const pct = (c.count / max) * 100
              return (
                <div key={c.city} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.city}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/80" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Property Type Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.charts.typeDistribution.map((t: any) => (
            <div key={t.type} className="text-center p-3 rounded-lg bg-muted/40">
              <div className="text-xl font-bold text-primary">{t.count}</div>
              <div className="text-xs text-muted-foreground">{t.type}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ---------- Listings moderation ----------
function ListingsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[]; total: number }>(
        `/api/admin/listings${statusFilter === 'ALL' ? '' : `?status=${statusFilter}`}&pageSize=24`,
      )
      setItems(res.items)
      setTotal(res.total)
      setSelected(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(prev => {
      if (prev.size === items.length) return new Set()
      return new Set(items.map(i => i.id))
    })
  }

  const bulkUpdate = async (status: string) => {
    if (selected.size === 0) return
    setBulkAction(true)
    try {
      let ok = 0
      for (const id of selected) {
        try {
          await apiPatch(`/api/admin/listings/${id}`, { status })
          ok++
        } catch (err) {
          // continue
        }
      }
      toast.success(`${ok} listing${ok === 1 ? '' : 's'} ${status.toLowerCase()}`)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed')
    } finally {
      setBulkAction(false)
    }
  }

  const exportCsv = () => {
    window.open('/api/admin/export?type=listings', '_blank')
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/api/admin/listings/${id}`, { status })
      toast.success(`Listing ${status.toLowerCase()}`)
      setItems(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const toggleVerifyListing = async (id: string, verified: boolean) => {
    try {
      await apiPost(`/api/admin/listings/${id}/verify`, { verified })
      toast.success(verified ? 'Listing marked as Verified' : 'Verified badge removed')
      setItems(prev => prev.map(p => p.id === id ? { ...p, isVerifiedListing: verified } : p))
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {PROPERTY_STATUS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">({total})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Bulk action bar (shown when items selected) */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-primary text-primary-foreground">{selected.size} selected</Badge>
            <span className="text-muted-foreground hidden sm:inline">Apply bulk action:</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => bulkUpdate('APPROVED')}
              disabled={bulkAction}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => bulkUpdate('REJECTED')}
              disabled={bulkAction}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={bulkAction}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-medium">No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}listings.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select all row */}
          <div className="flex items-center gap-2 px-1 py-1 text-sm text-muted-foreground">
            <Checkbox
              checked={items.length > 0 && selected.size === items.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-listings"
            />
            <label htmlFor="select-all-listings" className="cursor-pointer">
              {selected.size === items.length && items.length > 0
                ? `All ${items.length} selected`
                : `Select all ${items.length} listing${items.length === 1 ? '' : 's'}`}
            </label>
          </div>

          {items.map(item => (
            <Card
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row gap-4 transition-colors ${
                selected.has(item.id) ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  className="mt-1 shrink-0"
                />
                <div className="relative w-full sm:w-40 h-32 sm:h-28 rounded-lg overflow-hidden bg-muted shrink-0">
                  {item.images[0] && (
                    <Image src={item.images[0].url} alt="" fill sizes="160px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <div className="text-sm text-primary font-bold mb-1">{formatPrice(item.price)}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {item.location}, {item.city} · Posted {timeAgo(item.createdAt)}
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Owner: <span className="font-medium text-foreground">{item.owner.name}</span> ({item.owner.email})
                  {item._count.reports > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      <Flag className="h-3 w-3 mr-1" /> {item._count.reports} report{item._count.reports > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(`/api/properties/${item.id}`, '_blank')}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                  </Button>
                  {item.status === 'PENDING' && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(item.id, 'APPROVED')}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(item.id, 'REJECTED')}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {item.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'SOLD')}>
                      Mark Sold
                    </Button>
                  )}
                  {item.status === 'REJECTED' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'APPROVED')}>
                      Re-approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={item.isVerifiedListing ? 'outline' : 'default'}
                    className={item.isVerifiedListing ? '' : 'bg-blue-600 hover:bg-blue-700'}
                    onClick={() => toggleVerifyListing(item.id, !item.isVerifiedListing)}
                  >
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    {item.isVerifiedListing ? 'Unverify' : 'Verify Listing'}
                  </Button>
                </div>
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Users ----------
function UsersTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/users?pageSize=48${search ? `&q=${search}` : ''}`)
      setItems(res.items)
      setSelected(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const toggleBan = async (user: any) => {
    try {
      await apiPatch(`/api/admin/users/${user.id}`, { isBanned: !user.isBanned })
      setItems(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u))
      toast.success(user.isBanned ? 'User unbanned' : 'User banned')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const toggleVerify = async (user: any) => {
    try {
      await apiPatch(`/api/admin/users/${user.id}`, { isVerified: !user.isVerified })
      setItems(prev => prev.map(u => u.id === user.id ? { ...u, isVerified: !u.isVerified } : u))
      toast.success('Updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(prev => {
      if (prev.size === items.length) return new Set()
      return new Set(items.map(i => i.id))
    })
  }

  const bulkUpdate = async (action: string) => {
    if (selected.size === 0) return
    setBulkAction(true)
    try {
      const res = await apiPost<{ success: number; failed: number; message: string }>('/api/admin/users/bulk', {
        ids: Array.from(selected),
        action,
      })
      toast.success(res.message)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed')
    } finally {
      setBulkAction(false)
    }
  }

  const openDetail = (userId: string) => {
    setDetailUserId(userId)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-9 px-3 rounded-md border bg-background"
        />
        <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/export?type=users', '_blank')}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-primary text-primary-foreground">{selected.size} selected</Badge>
            <span className="text-muted-foreground hidden sm:inline">Apply bulk action:</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => bulkUpdate('verify')} disabled={bulkAction}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verify All
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate('unverify')} disabled={bulkAction}>
              Unverify All
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulkUpdate('ban')} disabled={bulkAction}>
              <Ban className="h-3.5 w-3.5 mr-1" /> Ban All
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate('unban')} disabled={bulkAction}>
              Unban All
            </Button>
            <Button size="sm" variant="destructive" onClick={() => {
              if (confirm(`Delete ${selected.size} user(s)? This cannot be undone.`)) {
                bulkUpdate('delete')
              }
            }} disabled={bulkAction}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete All
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={bulkAction}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No users found.</Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Select all row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <Checkbox
              checked={items.length > 0 && selected.size === items.length}
              onCheckedChange={toggleSelectAll}
              id="select-all-users"
            />
            <label htmlFor="select-all-users" className="cursor-pointer text-sm text-muted-foreground">
              {selected.size === items.length && items.length > 0
                ? `All ${items.length} selected`
                : `Select all ${items.length} user${items.length === 1 ? '' : 's'}`}
            </label>
          </div>
          <div className="divide-y">
            {items.map(u => (
              <div
                key={u.id}
                className={`p-4 flex items-center gap-3 flex-wrap transition-colors ${
                  selected.has(u.id) ? 'bg-primary/5' : ''
                }`}
              >
                <Checkbox
                  checked={selected.has(u.id)}
                  onCheckedChange={() => toggleSelect(u.id)}
                  className="shrink-0"
                />
                <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openDetail(u.id)}>
                  <AvatarImage src={u.avatarUrl || undefined} alt={u.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(u.id)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate hover:text-primary">{u.name}</span>
                    {u.role === 'ADMIN' && <Badge className="bg-amber-500/90 hover:bg-amber-500">Admin</Badge>}
                    {u.role === 'VENDOR' && <Badge className="bg-teal-600 hover:bg-teal-600 border-0">Vendor</Badge>}
                    {u.isBanned && <Badge variant="destructive">Banned</Badge>}
                    {u.isVerified && <Badge variant="outline" className="text-emerald-600">Verified</Badge>}
                    {u.subscriptionTier && u.subscriptionTier !== 'FREE' && (
                      <Badge className="bg-purple-600 hover:bg-purple-600 border-0">{u.subscriptionTier}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.email} · {u.phone || 'no phone'} · {u._count.properties} listing{u._count.properties === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => openDetail(u.id)}>
                    Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleVerify(u)}>
                    {u.isVerified ? 'Unverify' : 'Verify'}
                  </Button>
                  {u.role !== 'ADMIN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const newRole = u.role === 'VENDOR' ? 'USER' : 'VENDOR'
                        try {
                          await apiPatch(`/api/admin/users/${u.id}`, { role: newRole })
                          setItems(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
                          toast.success(`Role updated to ${newRole}`)
                        } catch (err: any) {
                          toast.error(err.message || 'Failed')
                        }
                      }}
                    >
                      <Store className="h-3.5 w-3.5 mr-1" />
                      {u.role === 'VENDOR' ? 'Demote' : 'Make Vendor'}
                    </Button>
                  )}
                  {u.role !== 'ADMIN' && (
                    <Button
                      size="sm"
                      variant={u.isBanned ? 'outline' : 'destructive'}
                      onClick={() => toggleBan(u)}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User detail drawer */}
      <AdminUserDetailDrawer
        userId={detailUserId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUserUpdated={load}
      />
    </div>
  )
}

// ---------- Reports ----------
function ReportsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('OPEN')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/reports?status=${statusFilter}&pageSize=48`)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/api/admin/reports/${id}`, { status })
      setItems(prev => prev.filter(r => r.id !== id))
      toast.success(`Report ${status.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_STATUS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/export?type=reports', '_blank')}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-medium">No {statusFilter.toLowerCase()} reports.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="destructive">
                  {REPORT_REASONS.find(x => x.value === r.reason)?.label || r.reason}
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </div>
              {r.description && (
                <p className="text-sm text-muted-foreground mb-3 italic">&quot;{r.description}&quot;</p>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="relative h-12 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {r.property.images[0] && (
                    <Image src={r.property.images[0].url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-1">{r.property.title}</div>
                  <div className="text-xs text-muted-foreground">{r.property.city} · {formatPrice(r.property.price)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Reported by: <span className="text-foreground">{r.reporter.name}</span> ({r.reporter.email})
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'REVIEWING')}>
                  <CircleDot className="h-3.5 w-3.5 mr-1" /> Mark Reviewing
                </Button>
                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus(r.id, 'RESOLVED')}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'DISMISSED')}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Contacts ----------
function ContactsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('NEW')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '48' })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      const res = await apiGet<{ items: any[] }>(`/api/admin/contact?${params.toString()}`)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contact requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/api/admin/contact/${id}`, { status })
      setItems(prev => prev.filter(r => r.id !== id))
      toast.success(`Marked as ${status.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Type:</span>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ENQUIRY">Enquiries</SelectItem>
            <SelectItem value="SUPPORT">Support</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/export?type=contacts', '_blank')}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No {statusFilter.toLowerCase()} contact requests.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant={c.type === 'ENQUIRY' ? 'default' : 'secondary'}>
                    {c.type === 'ENQUIRY' ? 'Property Enquiry' : 'Support'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      c.status === 'NEW' ? 'border-blue-500 text-blue-700' :
                      c.status === 'CONTACTED' ? 'border-amber-500 text-amber-700' :
                      c.status === 'RESOLVED' ? 'border-emerald-500 text-emerald-700' : ''
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>{' '}
                  <span className="font-medium">{c.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                </div>
                {c.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
                  </div>
                )}
                {c.property && (
                  <div>
                    <span className="text-muted-foreground">Property:</span>{' '}
                    <span className="font-medium">{c.property.title}</span>
                    <span className="text-xs text-muted-foreground"> ({c.property.city})</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/40 rounded-md p-3 text-sm mb-3 italic">
                &quot;{c.message}&quot;
              </div>

              <div className="flex flex-wrap gap-2">
                {c.status === 'NEW' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'CONTACTED')}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Mark Contacted
                  </Button>
                )}
                {(c.status === 'NEW' || c.status === 'CONTACTED') && (
                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus(c.id, 'RESOLVED')}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'ARCHIVED')}>
                  Archive
                </Button>
                <a
                  href={`mailto:${c.email}?subject=Re: Your enquiry on EstateBazaar&body=Hi ${c.name},%0D%0A%0D%0AThanks for reaching out about ${c.property?.title || 'your enquiry'}.%0D%0A%0D%0A`}
                  className="inline-flex items-center h-8 px-3 text-xs rounded-md border bg-background hover:bg-accent"
                >
                  <Mail className="h-3.5 w-3.5 mr-1" /> Email Reply
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Audit Log ----------
function AuditLogTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '100' })
      if (actionFilter && actionFilter !== 'ALL') params.set('action', actionFilter)
      const res = await apiGet<{ items: any[]; total: number }>(`/api/admin/audit-log?${params.toString()}`)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [actionFilter])

  useEffect(() => { load() }, [load])

  // Distinct action types for the filter dropdown
  const actionTypes = [
    'USER_SIGNUP', 'USER_LOGIN', 'USER_LOGOUT', 'USER_UPDATE', 'USER_MODERATE', 'USER_BULK_ACTION', 'USER_IMPERSONATE',
    'PROPERTY_CREATE', 'PROPERTY_UPDATE', 'PROPERTY_DELETE',
    'LISTING_MODERATE', 'LISTING_VERIFY_TOGGLE',
    'FAVORITE_ADD', 'FAVORITE_REMOVE',
    'CHAT_CREATE', 'MESSAGE_SEND',
    'REPORT_CREATE', 'REPORT_MODERATE',
    'SUBSCRIPTION_INITIATED', 'SUBSCRIPTION_ACTIVATED',
    'CONTACT_REQUEST_CREATE', 'CONTACT_REQUEST_UPDATE',
    'MORTGAGE_APPLY', 'MORTGAGE_UPDATE',
    'PASSWORD_CHANGE', 'PASSWORD_RESET_OTP_SENT', 'PASSWORD_RESET_COMPLETE',
    'ACCOUNT_DELETE', 'ACCOUNT_EXPORT',
    'SAVED_SEARCH_CREATE', 'SAVED_SEARCH_UPDATE', 'SAVED_SEARCH_DELETE',
    'SETTINGS_UPDATE', 'UPLOAD_IMAGE',
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Action:</span>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-72 h-9"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="ALL">All actions</SelectItem>
            {actionTypes.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No audit log entries.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {items.map(log => (
              <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                    {log.actor && (
                      <span className="text-sm font-medium">{log.actor.name}</span>
                    )}
                    {log.target && (
                      <span className="text-xs text-muted-foreground">→ {log.target.slice(0, 16)}</span>
                    )}
                  </div>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {JSON.stringify(log.meta).slice(0, 200)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</div>
                  {log.ip && <div className="text-[10px] text-muted-foreground font-mono">{log.ip}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ---------- Settings ----------
function SettingsTab() {
  const [settings, setSettings] = useState<Array<{
    key: string
    value: string
    category: string
    isSecret: boolean
    updatedBy: string | null
    updatedAt: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newIsSecret, setNewIsSecret] = useState(false)

  const categories = ['general', 'features', 'payments', 'limits', 'email', 'integrations']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ settings: any[] }>('/api/admin/settings')
      setSettings(res.settings)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const upsert = async () => {
    if (!newKey.trim()) return toast.error('Key is required')
    try {
      await apiPost('/api/admin/settings', {
        key: newKey.trim(),
        value: newValue,
        category: newCategory,
        isSecret: newIsSecret,
      })
      toast.success('Setting saved')
      setNewKey('')
      setNewValue('')
      setNewCategory('general')
      setNewIsSecret(false)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save setting')
    }
  }

  const deleteSetting = async (key: string) => {
    try {
      await apiDelete(`/api/admin/settings?key=${encodeURIComponent(key)}`)
      toast.success('Setting deleted')
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const groupedSettings = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, typeof settings>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Site Settings</h2>
        <Badge variant="secondary">Key-value store for site configuration</Badge>
      </div>

      {/* Add new setting */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Add / Update Setting</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Key</Label>
            <Input
              placeholder="e.g. maintenance_mode, max_upload_size_mb"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              placeholder="e.g. true, 10, https://..."
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Secret?</Label>
            <Switch checked={newIsSecret} onCheckedChange={setNewIsSecret} />
            <p className="text-xs text-muted-foreground">Hide from public API</p>
          </div>
          <div className="flex items-end">
            <Button onClick={upsert} className="w-full">Save</Button>
          </div>
        </div>
      </Card>

      {/* Settings list grouped by category */}
      {loading ? (
        <Card className="p-8 text-center">Loading...</Card>
      ) : settings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No settings configured yet.</Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, items]) => (
            <Card key={category} className="overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b font-medium text-sm uppercase tracking-wider">
                {category}
              </div>
              <div className="divide-y">
                {items.map(setting => (
                  <div key={setting.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{setting.key}</code>
                        {setting.isSecret && (
                          <Badge variant="destructive" className="text-xs">Secret</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 font-mono truncate max-w-xs sm:max-w-md">
                        {setting.isSecret ? '••••••••' : setting.value}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Updated by {setting.updatedBy || '—'} at {new Date(setting.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newVal = prompt(`New value for ${setting.key}:`, setting.isSecret ? '' : setting.value)
                          if (newVal !== null) {
                            apiPost('/api/admin/settings', { key: setting.key, value: newVal, category: setting.category, isSecret: setting.isSecret })
                              .then(() => { toast.success('Updated'); load() })
                              .catch((e: any) => toast.error(e.message || 'Failed'))
                          }
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delete setting "${setting.key}"?`)) deleteSetting(setting.key)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
