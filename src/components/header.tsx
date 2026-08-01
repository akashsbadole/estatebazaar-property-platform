'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Building2,
  Search,
  Plus,
  Heart,
  MessageCircle,
  User as UserIcon,
  LogOut,
  Shield,
  LayoutGrid,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  Mail,
  Crown,
  LayoutDashboard,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/lib/store'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { useState } from 'react'
import { ContactUsModal } from '@/components/contact-us-modal'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ChatBadge } from '@/components/chat-badge'
import { SearchSuggestions } from '@/components/search-suggestions'

export function Header() {
  const { user, openAuthModal, navigate, view, setUser } = useApp()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({ name: 'listings', query: search ? { q: search } : undefined })
  }

  const onPostProperty = () => {
    if (!user) {
      openAuthModal('signup')
      return
    }
    navigate({ name: 'post' })
  }

  const logout = async () => {
    try {
      await apiPost('/api/auth/logout')
      setUser(null)
      toast.success('Logged out')
      navigate({ name: 'home' })
    } catch {
      toast.error('Logout failed')
    }
  }

  const isActive = (name: string) => view.name === name

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-3 md:gap-6">
          {/* Logo */}
          <button
            onClick={() => navigate({ name: 'home' })}
            className="flex items-center gap-2 shrink-0"
            aria-label="EstateBazaar home"
          >
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:block text-xl font-bold tracking-tight">
              Estate<span className="text-primary">Bazaar</span>
            </span>
          </button>

          {/* Search (desktop) */}
          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-2xl gap-2">
            <div className="flex-1">
              <SearchSuggestions
                value={search}
                onChange={setSearch}
                onSelect={(q) => navigate({ name: 'listings', query: { q } })}
              />
            </div>
            <Button type="submit" size="sm" className="h-10 shrink-0">
              Search
            </Button>
          </form>

          {/* Nav links (desktop) */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <Button
              variant={isActive('pricing') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate({ name: 'pricing' })}
              className="gap-1.5"
            >
              <CreditCard className="h-4 w-4" /> Pricing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setContactOpen(true)}
              className="gap-1.5"
            >
              <Mail className="h-4 w-4" /> Contact
            </Button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            <LanguageSwitcher compact />

            <Button
              onClick={onPostProperty}
              className="hidden sm:flex bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Post Property
            </Button>

            {user && (
              <>
                <ChatBadge />
                <Button
                  variant={isActive('favorites') ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => navigate({ name: 'favorites' })}
                  aria-label="Favorites"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 pl-1 pr-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.subscriptionTier && user.subscriptionTier !== 'FREE' && (
                      <Badge className="hidden md:flex bg-amber-500/90 hover:bg-amber-500 border-0 gap-1 px-1.5">
                        <Crown className="h-3 w-3" /> {user.subscriptionTier}
                      </Badge>
                    )}
                    <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {user.subscriptionTier && user.subscriptionTier !== 'FREE' && (
                          <Badge className="bg-amber-500/90 hover:bg-amber-500 border-0 gap-1">
                            <Crown className="h-3 w-3" /> {user.subscriptionTier}
                          </Badge>
                        )}
                        {user.role === 'ADMIN' && (
                          <Badge className="bg-slate-700 hover:bg-slate-700 border-0">Admin</Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ name: 'dashboard' })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ name: 'profile' })}>
                    <UserIcon className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ name: 'my-listings' })}>
                    <LayoutGrid className="mr-2 h-4 w-4" /> My Listings
                  </DropdownMenuItem>
                  {user.role === 'VENDOR' && (
                    <DropdownMenuItem onClick={() => navigate({ name: 'vendor' })}>
                      <Store className="mr-2 h-4 w-4" /> Vendor Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ name: 'favorites' })}>
                    <Heart className="mr-2 h-4 w-4" /> Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ name: 'chats' })}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Chats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ name: 'pricing' })}>
                    <CreditCard className="mr-2 h-4 w-4" /> Upgrade Plan
                  </DropdownMenuItem>
                  {user.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ name: 'admin' })}>
                        <Shield className="mr-2 h-4 w-4" /> Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openAuthModal('login')}>
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => openAuthModal('signup')}
                  className="sm:hidden bg-primary hover:bg-primary/90"
                >
                  Sign Up
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search row */}
        {mobileOpen && (
          <div className="md:hidden pb-3 pt-1 space-y-2">
            <form onSubmit={onSearch}>
              <SearchSuggestions
                value={search}
                onChange={setSearch}
                onSelect={(q) => { navigate({ name: 'listings', query: { q } }); setMobileOpen(false) }}
                inputClassName="h-10"
              />
            </form>
            <div className="flex gap-2">
              <Button
                onClick={() => { navigate({ name: 'pricing' }); setMobileOpen(false) }}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <CreditCard className="h-4 w-4 mr-1" /> Pricing
              </Button>
              <Button
                onClick={() => { setContactOpen(true); setMobileOpen(false) }}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Mail className="h-4 w-4 mr-1" /> Contact
              </Button>
            </div>
            <Button onClick={onPostProperty} className="w-full bg-primary hover:bg-primary/90" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Post Property
            </Button>
          </div>
        )}
      </div>

      <ContactUsModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </header>
  )
}
