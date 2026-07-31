'use client'

import { useEffect, useState } from 'react'
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Edit3,
  Save,
  X,
  Heart,
  Building2,
  Shield,
  BadgeCheck,
  BookmarkPlus,
  Bell,
  Trash2,
  Lock,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/lib/store'
import { apiGet, apiPatch, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { SellerAnalytics } from '@/components/seller-analytics'
import { AccountManagement } from '@/components/account-management'

interface MeResponse {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    isVerified: boolean
    avatarUrl: string | null
    joinedDate: string
    _count: { properties: number; favorites: number }
    emailNotifications: boolean
  }
}

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, any>
  alertEnabled: boolean
  newMatchCount: number
  createdAt: string
}

export function ProfileView() {
  const { user, openAuthModal, navigate, setUser } = useApp()
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  // Change password state
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    apiGet<MeResponse>('/api/users/me')
      .then(r => {
        setMe(r.user)
        setName(r.user.name)
        setPhone(r.user.phone || '')
        setEmailNotifications(r.user.emailNotifications ?? true)
      })
      .finally(() => setLoading(false))
    apiGet<{ items: SavedSearch[] }>('/api/saved-searches')
      .then(r => setSavedSearches(r.items))
      .catch(() => {})
  }, [user])

  const deleteSavedSearch = async (id: string) => {
    try {
      await apiDelete(`/api/saved-searches/${id}`)
      setSavedSearches(prev => prev.filter(s => s.id !== id))
      toast.success('Saved search deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const toggleAlert = async (s: SavedSearch) => {
    try {
      const res = await apiPatch<{ savedSearch: SavedSearch }>(`/api/saved-searches/${s.id}`, {
        alertEnabled: !s.alertEnabled,
      })
      setSavedSearches(prev => prev.map(x => x.id === s.id ? res.savedSearch : x))
      toast.success(res.savedSearch.alertEnabled ? 'Alerts enabled' : 'Alerts disabled')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const changePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error('All fields are required')
      return
    }
    if (newPw.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('New password and confirmation do not match')
      return
    }
    setChangingPw(true)
    try {
      const res = await apiPatch<{ message: string }>('/api/auth/change-password', {
        currentPassword: currentPw,
        newPassword: newPw,
      })
      toast.success(res.message || 'Password changed successfully')
      setShowPwForm(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view your profile</h2>
        <Button onClick={() => openAuthModal('login')} className="mt-3">Sign In</Button>
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await apiPatch<{ user: any; message: string }>('/api/users/me', {
        name,
        phone: phone || null,
      })
      setMe(res.user)
      setUser(res.user)
      setEditing(false)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      {loading ? (
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted" />
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </Card>
      ) : me ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Avatar card */}
          <Card className="p-6 text-center">
            <Avatar className="h-24 w-24 mx-auto mb-3">
              <AvatarImage src={me.avatarUrl || undefined} alt={me.name} />
              <AvatarFallback className="bg-primary/15 text-primary text-2xl">
                {me.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center justify-center gap-1 mb-1">
              <h2 className="font-bold text-lg">{me.name}</h2>
              {me.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{me.email}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {me.role === 'ADMIN' && (
                <Badge className="bg-amber-500/90 hover:bg-amber-500 gap-1">
                  <Shield className="h-3 w-3" /> Admin
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                Joined {new Date(me.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => navigate({ name: 'my-listings' })}
                className="text-center p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="text-xl font-bold text-primary">{me._count.properties}</div>
                <div className="text-xs text-muted-foreground">Listings</div>
              </button>
              <button
                onClick={() => navigate({ name: 'favorites' })}
                className="text-center p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="text-xl font-bold text-primary">{me._count.favorites}</div>
                <div className="text-xs text-muted-foreground">Favorites</div>
              </button>
            </div>
          </Card>

          {/* Right: Editable fields */}
          <Card className="p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Account Information</h3>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName(me.name); setPhone(me.phone || '') }}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                {editing ? (
                  <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{me.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{me.email}</span>
                  <Badge variant="outline" className="ml-auto text-xs">Read only</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                {editing ? (
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Add a phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{me.phone || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => navigate({ name: 'my-listings' })}>
                <Building2 className="h-4 w-4 mr-1" /> My Listings
              </Button>
              <Button variant="outline" onClick={() => navigate({ name: 'favorites' })}>
                <Heart className="h-4 w-4 mr-1" /> My Favorites
              </Button>
            </div>
          </Card>

          {/* Security card */}
          <Card className="p-6 md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" /> Security
              </h3>
              {!showPwForm && (
                <Button variant="outline" size="sm" onClick={() => setShowPwForm(true)}>
                  <KeyRound className="h-4 w-4 mr-1" /> Change Password
                </Button>
              )}
            </div>

            {showPwForm ? (
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-pw">Current Password</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New Password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirm New Password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPwForm(false)
                      setCurrentPw('')
                      setNewPw('')
                      setConfirmPw('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={changePassword} disabled={changingPw}>
                    {changingPw ? 'Changing...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/40">
                  <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Two-Factor Auth</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      OTP verification on every login (enabled by default)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/40">
                  <Lock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Bcrypt Hashing</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Passwords stored with 10-round bcrypt hash
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-muted/40">
                  <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Account Verified</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {me?.isVerified ? 'Email verified' : 'Pending verification'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email notifications toggle */}
              <div className="flex items-center justify-between p-3 rounded-md border mt-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Email Notifications</div>
                    <div className="text-xs text-muted-foreground">
                      Receive emails for new chat messages and saved-search alerts
                    </div>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(v) => {
                    setEmailNotifications(v)
                    apiPatch('/api/users/me', { emailNotifications: v })
                      .then(() => toast.success(v ? 'Email notifications enabled' : 'Email notifications disabled'))
                      .catch((err: any) => {
                        toast.error(err.message || 'Failed')
                        setEmailNotifications(!v)
                      })
                  }}
                />
              </div>
            </>
            )}
          </Card>

          {/* Seller Analytics */}
          <SellerAnalytics />

          {/* Saved Searches card */}
          <Card className="p-6 md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-primary" /> Saved Searches
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate({ name: 'listings' })}>
                <BookmarkPlus className="h-4 w-4 mr-1" /> New Search
              </Button>
            </div>

            {savedSearches.length === 0 ? (
              <div className="text-center py-8">
                <BookmarkPlus className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved searches yet. Apply filters on the listings page and click &quot;Save Search&quot; to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedSearches.map(s => (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="font-medium text-sm hover:text-primary text-left flex-1"
                        onClick={() => navigate({ name: 'listings', query: s.filters as any })}
                      >
                        {s.name}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSavedSearch(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Filters preview */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(s.filters).slice(0, 4).map(([key, val]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {String(val)}
                        </Badge>
                      ))}
                      {Object.keys(s.filters).length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.keys(s.filters).length - 4} more
                        </Badge>
                      )}
                    </div>

                    {/* Alert toggle */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Bell className={`h-3.5 w-3.5 ${s.alertEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={s.alertEnabled ? 'text-foreground' : 'text-muted-foreground'}>
                          {s.alertEnabled ? 'Alerts on' : 'Alerts off'}
                        </span>
                        {s.newMatchCount > 0 && (
                          <Badge className="ml-1 bg-primary text-primary-foreground text-xs">
                            {s.newMatchCount} new
                          </Badge>
                        )}
                      </div>
                      <Switch checked={s.alertEnabled} onCheckedChange={() => toggleAlert(s)} />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => navigate({ name: 'listings', query: s.filters as any })}
                    >
                      Run Search
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Account Management (delete + export) */}
          <AccountManagement />
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load profile.</p>
        </Card>
      )}
    </div>
  )
}
