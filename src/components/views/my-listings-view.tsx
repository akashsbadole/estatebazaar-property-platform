'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus,
  Building2,
  Eye,
  Heart,
  Flag,
  Trash2,
  Edit3,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { apiGet, apiDelete } from '@/lib/api-client'
import { formatPrice, timeAgo, PROPERTY_STATUS, type PropertyWithRelations } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  endpoint: string
  title: string
  emptyTitle: string
  emptyDescription: string
  emptyIcon?: 'listings' | 'favorites'
}

export function MyListingsView({ endpoint, title, emptyTitle, emptyDescription, emptyIcon = 'listings' }: Props) {
  const { user, openAuthModal, navigate } = useApp()
  const [items, setItems] = useState<PropertyWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiGet<{ items: PropertyWithRelations[] }>(endpoint)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [user, endpoint])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await apiDelete(`/api/properties/${deleteId}`)
      setItems(prev => prev.filter(p => p.id !== deleteId))
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
        <h2 className="text-xl font-semibold mb-2">Sign in to continue</h2>
        <Button onClick={() => openAuthModal('login')} className="mt-3">Sign In</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {emptyIcon === 'listings' && (
            <Button size="sm" onClick={() => navigate({ name: 'post' })} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Post Property
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          {emptyIcon === 'favorites' ? (
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          ) : (
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          )}
          <h3 className="font-semibold text-lg mb-1">{emptyTitle}</h3>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{emptyDescription}</p>
          <Button onClick={() => navigate(emptyIcon === 'favorites' ? { name: 'listings' } : { name: 'post' })}>
            {emptyIcon === 'favorites' ? 'Browse Properties' : 'Post Your First Property'}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => {
            const primary = p.images.find(i => i.isPrimary) || p.images[0]
            const statusInfo = PROPERTY_STATUS.find(s => s.value === p.status) || PROPERTY_STATUS[0]
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                <div
                  className="relative aspect-[4/3] bg-muted cursor-pointer"
                  onClick={() => navigate({ name: 'detail', propertyId: p.id })}
                >
                  {primary && (
                    <Image
                      src={primary.url}
                      alt={p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge
                      className={`bg-${statusInfo.color}-500/90 hover:bg-${statusInfo.color}-500 text-white border-0`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="text-lg font-bold text-primary">{formatPrice(p.price)}</div>
                  <h3 className="font-semibold line-clamp-1 cursor-pointer hover:text-primary" onClick={() => navigate({ name: 'detail', propertyId: p.id })}>
                    {p.title}
                  </h3>
                  <div className="text-xs text-muted-foreground">{p.city}, {p.state}</div>
                  <div className="text-xs text-muted-foreground">Posted {timeAgo(p.createdAt)}</div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {p.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {p._count?.favorites || 0}
                    </span>
                    {p._count?.reports ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <Flag className="h-3.5 w-3.5" /> {p._count.reports}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate({ name: 'detail', propertyId: p.id })}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    {emptyIcon === 'listings' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-primary hover:text-primary"
                        onClick={() => navigate({ name: 'edit', propertyId: p.id })}
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete this listing?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The listing, its images, favorites, and chats will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
