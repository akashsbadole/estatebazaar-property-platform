import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'olx-property-platform-secret-2026-very-long'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Map userId -> Set<socketId> (a user may have multiple tabs)
const userSockets = new Map<string, Set<string>>()

function joinUser(userId: string, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set())
  userSockets.get(userId)!.add(socketId)
}

function leaveUser(userId: string, socketId: string) {
  const set = userSockets.get(userId)
  if (!set) return
  set.delete(socketId)
  if (set.size === 0) userSockets.delete(userId)
}

function emitToUser(userId: string, event: string, payload: unknown) {
  const set = userSockets.get(userId)
  if (!set) return
  for (const sid of set) {
    io.to(sid).emit(event, payload)
  }
}

interface AuthPayload {
  sub: string
  email: string
  role: 'USER' | 'ADMIN'
  name: string
}

interface ClientMessage {
  chatId: string
  content: string
  recipientId: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

io.use((socket: Socket, next) => {
  // Handshake auth via `auth.token` (JWT)
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) {
    return next(new Error('Missing auth token'))
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    ;(socket as any).user = payload
    next()
  } catch {
    next(new Error('Invalid auth token'))
  }
})

io.on('connection', (socket: Socket) => {
  const user = (socket as any).user as AuthPayload
  if (!user) {
    socket.disconnect()
    return
  }
  joinUser(user.sub, socket.id)
  console.log(`[chat] ${user.name} connected (${socket.id})`)

  // Join a chat room (so multiple participants can receive events)
  socket.on('chat:join', (chatId: string) => {
    socket.join(`chat:${chatId}`)
    emitToUser(user.sub, 'chat:online', { chatId, online: true })
  })

  socket.on('chat:leave', (chatId: string) => {
    socket.leave(`chat:${chatId}`)
  })

  socket.on('chat:typing', (payload: { chatId: string; recipientId: string }) => {
    emitToUser(payload.recipientId, 'chat:typing', {
      chatId: payload.chatId,
      userId: user.sub,
      name: user.name,
    })
  })

  socket.on('chat:stop-typing', (payload: { chatId: string; recipientId: string }) => {
    emitToUser(payload.recipientId, 'chat:stop-typing', {
      chatId: payload.chatId,
      userId: user.sub,
    })
  })

  socket.on('chat:message', (msg: ClientMessage) => {
    // Broadcast to the chat room (both participants)
    io.to(`chat:${msg.chatId}`).emit('chat:message', {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId: msg.chatId,
      senderId: user.sub,
      sender: msg.sender,
      content: msg.content,
      createdAt: new Date().toISOString(),
      pending: false,
    })
    // Also push to recipient's other open tabs
    emitToUser(msg.recipientId, 'chat:unread', {
      chatId: msg.chatId,
      from: user.sub,
      fromName: user.name,
      preview: msg.content.slice(0, 80),
    })
  })

  socket.on('chat:read', (payload: { chatId: string; recipientId: string }) => {
    emitToUser(payload.recipientId, 'chat:read', { chatId: payload.chatId, readerId: user.sub })
  })

  socket.on('disconnect', () => {
    leaveUser(user.sub, socket.id)
    console.log(`[chat] ${user.name} disconnected (${socket.id})`)
  })

  socket.on('error', (err: unknown) => {
    console.error(`[chat] socket error (${socket.id}):`, err)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[chat-service] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
