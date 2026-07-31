'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Image from 'next/image'
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Circle,
  Loader2,
  Phone,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import { formatPrice, timeAgo } from '@/lib/constants'
import { toast } from 'sonner'

interface ChatListItem {
  id: string
  property: {
    id: string
    title: string
    price: number
    city: string
    images: Array<{ url: string; isPrimary: boolean }>
  }
  buyer: { id: string; name: string; avatarUrl: string | null; isVerified: boolean }
  seller: { id: string; name: string; avatarUrl: string | null; isVerified: boolean }
  otherUser: { id: string; name: string; avatarUrl: string | null; isVerified: boolean }
  messages: Array<{ id: string; content: string; senderId: string; createdAt: string }>
  unreadCount: number
  updatedAt: string
}

interface ChatDetail {
  chat: ChatListItem & {
    property: ChatListItem['property'] & { status: string }
    otherUser: ChatListItem['otherUser'] & { joinedDate: string }
  }
  messages: Array<{
    id: string
    chatId: string
    senderId: string
    content: string
    isRead: boolean
    createdAt: string
  }>
}

interface Props {
  initialChatId?: string
}

const WS_PORT = 3003

export function ChatView({ initialChatId }: Props) {
  const { user, openAuthModal, navigate, view } = useApp()
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [activeChat, setActiveChat] = useState<string | undefined>(initialChatId)
  const [detail, setDetail] = useState<ChatDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [otherTyping, setOtherTyping] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load chat list
  const loadChats = useCallback(async () => {
    if (!user) {
      setLoadingList(false)
      return
    }
    setLoadingList(true)
    try {
      const res = await apiGet<{ items: ChatListItem[] }>('/api/chats')
      setChats(res.items)
      // If no active chat selected, pick first one
      if (!activeChat && res.items.length > 0 && view.name === 'chats' && (view as any).chatId) {
        setActiveChat((view as any).chatId)
      } else if (!activeChat && res.items.length > 0) {
        setActiveChat(res.items[0].id)
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false)
    }
  }, [user, activeChat, view])

  useEffect(() => {
    loadChats()
  }, [loadChats])

// Setup WebSocket
  useEffect(() => {
    if (!user) return

    let mounted = true

    const setupSocket = async () => {
      // Fetch short-lived WS token
      let wsToken: string | null = null
      try {
        const res = await apiGet<{ token: string }>('/api/auth/ws-token')
        wsToken = res.token
      } catch {
        toast.error('Failed to authenticate WebSocket')
        return
      }
      if (!mounted) return

      const s = io('/?XTransformPort=' + WS_PORT, {
        path: '/',
        transports: ['websocket', 'polling'],
        auth: { token: wsToken },
      })

      s.on('connect', () => {
        console.log('[chat] connected', s.id)
      })
      s.on('connect_error', (err: any) => {
        console.warn('[chat] connect error', err.message)
      })

      s.on('chat:message', (msg: any) => {
        if (msg.chatId !== activeChat) return
        setDetail(prev => {
          if (!prev) return prev
          if (prev.messages.some(m => m.id === msg.id)) return prev
          return { ...prev, messages: [...prev.messages, { ...msg, isRead: false }] }
        })
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })

      s.on('chat:typing', (payload: { chatId: string; userId: string }) => {
        if (payload.chatId === activeChat && payload.userId !== user.id) {
          setOtherTyping(true)
        }
      })
      s.on('chat:stop-typing', (payload: { chatId: string; userId: string }) => {
        if (payload.chatId === activeChat && payload.userId !== user.id) {
          setOtherTyping(false)
        }
      })

      setSocket(s)
    }

    setupSocket()
    return () => {
      mounted = false
      socket?.disconnect()
    }
  }, [user, activeChat])

  // Load chat detail
  useEffect(() => {
    if (!activeChat || !user) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    setOtherTyping(false)
    apiGet<ChatDetail>(`/api/chats/${activeChat}`)
      .then(d => {
        setDetail(d)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .catch(err => toast.error(err.message || 'Failed to load chat'))
      .finally(() => setLoadingDetail(false))

    // Join the socket room for this chat
    if (socket?.connected) {
      socket.emit('chat:join', activeChat)
    }
  }, [activeChat, user, socket])

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !activeChat || !detail || !user) return
    const content = message.trim()
    setMessage('')

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      chatId: activeChat,
      senderId: user.id,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setDetail(prev => prev ? { ...prev, messages: [...prev.messages, optimistic as any] } : prev)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const res = await apiPost<{ message: any }>(`/api/chats/${activeChat}/messages`, { content })
      // Replace optimistic with real message
      setDetail(prev => {
        if (!prev) return prev
        return { ...prev, messages: prev.messages.map(m => m.id === tempId ? res.message : m) }
      })
      // Broadcast via WS
      socket?.emit('chat:message', {
        chatId: activeChat,
        content,
        recipientId: detail.chat.otherUser.id,
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl || null },
      })
      socket?.emit('chat:stop-typing', { chatId: activeChat, recipientId: detail.chat.otherUser.id })
      // Refresh chat list to bump updated time
      loadChats()
    } catch (err: any) {
      // Remove optimistic on failure
      setDetail(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== tempId) } : prev)
      setMessage(content)
      toast.error(err.message || 'Failed to send message')
    }
  }

  // Typing indicator
  const typingTimeout = useRef<any>(null)
  const onMessageChange = (v: string) => {
    setMessage(v)
    if (!socket || !detail) return
    socket.emit('chat:typing', { chatId: activeChat, recipientId: detail.chat.otherUser.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { chatId: activeChat, recipientId: detail.chat.otherUser.id })
    }, 1500)
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to use chats</h2>
        <p className="text-muted-foreground mb-4">You need an account to chat with sellers.</p>
        <Button onClick={() => openAuthModal('login')}>Sign In</Button>
      </div>
    )
  }

  const filteredChats = chats.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.property.title.toLowerCase().includes(q) ||
      c.otherUser.name.toLowerCase().includes(q)
    )
  })

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-6 animate-fade-in">
      <div className="md:hidden p-4 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Chats
        </h1>
      </div>

      <Card className="md:rounded-xl overflow-hidden border-0 md:border grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-4rem)] md:h-[calc(100vh-7rem)]">
        {/* Chat list */}
        <div className={`border-r border-border/60 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingList ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No chats yet. Start a conversation from any property listing.
              </div>
            ) : (
              filteredChats.map(c => {
                const isActive = c.id === activeChat
                const lastMsg = c.messages[0]
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChat(c.id)}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-muted/50 transition-colors border-b border-border/40 ${
                      isActive ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={c.otherUser.avatarUrl || undefined} alt={c.otherUser.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-sm">
                        {c.otherUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-sm truncate">{c.otherUser.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {c.updatedAt ? timeAgo(c.updatedAt) : ''}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.property.title}
                      </div>
                      {lastMsg ? (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {lastMsg.senderId === user.id ? 'You: ' : ''}{lastMsg.content}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No messages yet</div>
                      )}
                    </div>
                    {c.unreadCount > 0 && (
                      <Badge className="self-center bg-primary text-primary-foreground">
                        {c.unreadCount}
                      </Badge>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat thread */}
        <div className={`flex flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
          {!activeChat || !detail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              {loadingDetail ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">Select a chat to start messaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Your conversations with sellers will appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={() => setActiveChat(undefined)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={detail.chat.otherUser.avatarUrl || undefined} alt={detail.chat.otherUser.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {detail.chat.otherUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{detail.chat.otherUser.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {otherTyping ? (
                      <span className="text-primary">typing...</span>
                    ) : (
                      <span>Member since {new Date(detail.chat.otherUser.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ name: 'detail', propertyId: detail.chat.property.id })}
                >
                  View Property
                </Button>
              </div>

              {/* Property context strip */}
              <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-3">
                <div className="relative h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                  {detail.chat.property.images[0] && (
                    <Image
                      src={detail.chat.property.images[0].url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{detail.chat.property.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {detail.chat.property.city}
                  </div>
                </div>
                <div className="font-bold text-primary text-sm">
                  {formatPrice(detail.chat.property.price)}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2 bg-muted/10"
              >
                {detail.messages.map(m => {
                  const isMine = m.senderId === user.id
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card border rounded-bl-md'
                        } ${(m as any).pending ? 'opacity-70' : ''}`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {isMine && m.isRead && ' · Read'}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {otherTyping && (
                  <div className="flex justify-start">
                    <div className="bg-card border px-3 py-2 rounded-2xl rounded-bl-md flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t">
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={e => onMessageChange(e.target.value)}
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Button type="submit" size="icon" disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
