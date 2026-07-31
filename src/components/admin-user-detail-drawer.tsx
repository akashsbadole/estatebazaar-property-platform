'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Ban,
  ShieldCheck,
  Shield,
  UserCog,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Flag,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  Crown,
  Building2,
  IndianRupee,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { apiGet, apiPatch, apiPost } from '@/lib/api-client'
import { formatPrice, timeAgo } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  userId: string | null
  open: boolean
  onClose: () => void
  onUserUpdated?: () => void
}

interface UserDetail {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    isVerified: boolean
    isBanned: boolean
    avatarUrl: string | null
    subscriptionTier: string
    brokeragePaid: boolean
    emailNotifications: boolean
    joinedDate: string
    createdAt: string
  }
  counts: {
    listings: number
    favorites: number
    chatsAsBuyer: number
    chatsAsSeller: number
    messages: number
    reportsFiled: number
    reportsOnListings: number
    payments: number
    contactRequests: number
    mortgageApplications: number
  }
  recentListings: Array<{
    id: string
    title: string
    price: number
    city: string
    status: string
    viewCount: number
    isVerifiedListing: boolean
    createdAt: string
    images: Array<{ url: string; isPrimary: boolean }>
    _count: { favorites: number; chats: number; reports: number }
  }>
  recentChats: Array<{
    id: string
    createdAt: string
    updatedAt: string
    property: { id: string; title: string; price: number }
    otherUser: { id: string; name: string }
    _count: { messages: number }
  }>
  recentPayments: Array<{
    id: string
    type: string
    method: string
    amount: number
    status: string
    providerPaymentId: string | null
    upiRef: string | null
    createdAt: string
    amountRupees: number
  }>
  recentAuditLogs: Array<{
    id: string
    action: string
    target: string | null
    ip: string | null
    createdAt: string
    meta: any
  }>
}

export function AdminUserDetailDrawer({ userId, open, onClose, onUserUpdated }: Props) {
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!userId || !open) {
      setData(null)
      return
    }
    setLoading(true)
    apiGet<UserDetail>(`/api/admin/users/${userId}/detail`)
      .then(setData)
      .catch(err => toast.error(err.message || 'Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId, open])

  const updateUser = async (updates: any, message: string) => {
    if (!userId) return
    setActing(true)
    try {
      await apiPatch(`/api/admin/users/${userId}`, updates)
      toast.success(message)
      // Reload detail
      const fresh = await apiGet<UserDetail>(`/api/admin/users/${userId}/detail`)
      setData(fresh)
      onUserUpdated?.()
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setActing(false)
    }
  }

  const impersonate = async () => {
    if (!userId) return
    setActing(true)
    try {
      const res = await apiPost<{ message: string; user: any }>(`/api/admin/users/${userId}/impersonate`)
      toast.success(res.message)
      // Reload the page to apply the new session
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err.message || 'Impersonation failed')
    } finally {
      setActing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            User Management
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-6 py-4">
            {/* Profile header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={data.user.avatarUrl || undefined} alt={data.user.name} />
                <AvatarFallback className="bg-primary/15 text-primary text-xl">
                  {data.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{data.user.name}</h3>
                  {data.user.isVerified && (
                    <Badge className="bg-emerald-500/90 hover:bg-emerald-500 border-0 gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                  {data.user.isBanned && (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="h-3 w-3" /> Banned
                    </Badge>
                  )}
                  {data.user.role === 'ADMIN' && (
                    <Badge className="bg-amber-500/90 hover:bg-amber-500 border-0 gap-1">
                      <Shield className="h-3 w-3" /> Admin
                    </Badge>
                  )}
                  {data.user.subscriptionTier !== 'FREE' && (
                    <Badge className="bg-purple-600 hover:bg-purple-600 border-0 gap-1">
                      <Crown className="h-3 w-3" /> {data.user.subscriptionTier}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {data.user.email}
                </div>
                {data.user.phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3.5 w-3.5" /> {data.user.phone}
                  </div>
                )}
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" /> Joined {timeAgo(data.user.joinedDate)}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {data.user.role !== 'ADMIN' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={data.user.isBanned ? 'outline' : 'destructive'}
                  disabled={acting}
                  onClick={() => updateUser({ isBanned: !data.user.isBanned }, data.user.isBanned ? 'User unbanned' : 'User banned')}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  {data.user.isBanned ? 'Unban' : 'Ban'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => updateUser({ isVerified: !data.user.isVerified }, data.user.isVerified ? 'User unverified' : 'User verified')}
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  {data.user.isVerified ? 'Unverify' : 'Verify'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => updateUser({ role: 'ADMIN' }, 'User promoted to admin')}
                >
                  <Shield className="h-4 w-4 mr-1" /> Make Admin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-primary hover:text-primary"
                  disabled={acting}
                  onClick={impersonate}
                >
                  <Eye className="h-4 w-4 mr-1" /> Impersonate
                </Button>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={Building2} label="Listings" value={data.counts.listings} color="text-blue-600" />
              <StatCard icon={Heart} label="Favorites" value={data.counts.favorites} color="text-red-500" />
              <StatCard icon={MessageCircle} label="Messages" value={data.counts.messages} color="text-primary" />
              <StatCard icon={Eye} label="As Buyer" value={data.counts.chatsAsBuyer} color="text-cyan-600" />
              <StatCard icon={Eye} label="As Seller" value={data.counts.chatsAsSeller} color="text-teal-600" />
              <StatCard icon={Flag} label="Reports Filed" value={data.counts.reportsFiled} color="text-amber-600" />
              <StatCard icon={Flag} label="Reports Received" value={data.counts.reportsOnListings} color="text-red-600" />
              <StatCard icon={CreditCard} label="Payments" value={data.counts.payments} color="text-emerald-600" />
              <StatCard icon={Mail} label="Contact Reqs" value={data.counts.contactRequests} color="text-purple-600" />
            </div>

            <Separator />

            {/* Recent listings */}
            {data.recentListings.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recent Listings ({data.counts.listings})</h4>
                <div className="space-y-2">
                  {data.recentListings.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-2 rounded-md border text-sm">
                      <div className="relative h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                        {l.images[0] && (
                          <Image src={l.images[0].url} alt="" fill sizes="56px" className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium line-clamp-1">{l.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(l.price)} · {l.city} · {l.viewCount} views
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{l.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent payments */}
            {data.recentPayments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Payment History ({data.counts.payments})</h4>
                <div className="space-y-1.5">
                  {data.recentPayments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                      <div>
                        <div className="font-medium">{p.type} · {p.method}</div>
                        <div className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{p.amountRupees.toLocaleString('en-IN')}</div>
                        <Badge
                          variant="outline"
                          className={
                            p.status === 'PAID' ? 'border-emerald-500 text-emerald-700 text-xs' :
                            p.status === 'FAILED' ? 'border-red-500 text-red-700 text-xs' :
                            'text-xs'
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity (audit log) */}
            {data.recentAuditLogs.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recent Activity (last 20 actions)</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                  {data.recentAuditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-muted/40">
                      <div className="font-mono text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</div>
                      <div className="flex-1">
                        <span className="font-medium">{log.action}</span>
                        {log.target && <span className="text-muted-foreground"> → {log.target.slice(0, 12)}</span>}
                        {log.ip && <span className="text-muted-foreground"> · {log.ip}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load user details.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-md border text-center">
      <Icon className={`h-4 w-4 ${color} mx-auto mb-1`} />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
