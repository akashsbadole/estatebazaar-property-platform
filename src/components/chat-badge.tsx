'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'

// Fetches unread chat count every 30 seconds and shows a badge
// on the chat icon in the header.
export function ChatBadge() {
  const { user, view, navigate } = useApp()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) {
      // Defer to avoid synchronous setState in effect
      const t = setTimeout(() => setUnreadCount(0), 0)
      return () => clearTimeout(t)
    }

    const fetchUnread = async () => {
      try {
        const res = await apiGet<{ items: Array<{ unreadCount: number }> }>('/api/chats')
        const total = res.items.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
        setUnreadCount(total)
      } catch {
        // ignore
      }
    }

    fetchUnread()

    // Poll every 30 seconds for new unread messages
    const interval = setInterval(fetchUnread, 30000)

    // Also refetch when the user returns to the page
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchUnread()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user])

  if (!user) return null

  return (
    <Button
      variant={view.name === 'chats' ? 'secondary' : 'ghost'}
      size="icon"
      onClick={() => navigate({ name: 'chats' })}
      aria-label="Chats"
      className="relative"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-red-500 text-white border-2 border-background text-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
