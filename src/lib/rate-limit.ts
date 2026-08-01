// ponytail: in-memory default, swap to RedisStore when multi-instance
// Set REDIS_URL in production to enable Redis-backed rate limiting.

type RateLimitEntry = { count: number; resetAt: number }

interface Store {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, value: RateLimitEntry, ttlMs: number): Promise<void>
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
}

class MemoryStore implements Store {
  private readonly map = new Map<string, RateLimitEntry>()

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.map.get(key)
    if (!entry) return null
    if (entry.resetAt < Date.now()) {
      this.map.delete(key)
      return null
    }
    return entry
  }

  async set(key: string, value: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.map.set(key, value)
  }

  async incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now()
    const existing = await this.get(key)
    if (!existing) {
      const entry = { count: 1, resetAt: now + windowMs }
      await this.set(key, entry, windowMs)
      return entry
    }
    existing.count++
    await this.set(key, existing, windowMs)
    return existing
  }
}

// RedisStore — only imported/used when REDIS_URL is set.
// Requires: npm install ioredis (optional dependency)
// @ts-ignore — ioredis may not be installed
class RedisStore implements Store {
  constructor(private readonly redis: any) {}

  async get(key: string): Promise<RateLimitEntry | null> {
    const raw = await this.redis.hgetall(`rl:${key}`)
    if (!raw || Object.keys(raw).length === 0) return null
    const resetAt = parseInt(raw.resetAt, 10)
    if (resetAt < Date.now()) {
      await this.redis.del(`rl:${key}`)
      return null
    }
    return { count: parseInt(raw.count, 10), resetAt }
  }

  async set(key: string, value: RateLimitEntry, ttlMs: number): Promise<void> {
    await this.redis.hset(`rl:${key}`, {
      count: String(value.count),
      resetAt: String(value.resetAt),
    })
    await this.redis.expire(`rl:${key}`, Math.ceil(ttlMs / 1000))
  }

  async incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const count = await this.redis.hincrby(`rl:${key}`, 'count', 1)
    const raw = await this.redis.hgetall(`rl:${key}`)
    if (!raw.resetAt) {
      const resetAt = Date.now() + windowMs
      await this.redis.hset(`rl:${key}`, { resetAt: String(resetAt) })
      await this.redis.expire(`rl:${key}`, Math.ceil(windowMs / 1000))
      return { count, resetAt }
    }
    return { count, resetAt: parseInt(raw.resetAt, 10) }
  }
}

export function createRateLimiter(store: Store) {
  return async function rateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
    return runRateLimit(store, key, maxRequests, windowMs)
  }
}

async function runRateLimit(
  store: Store,
  key: string,
  maxRequests: number,
  windowMs: number,
) {
  const now = Date.now()
  const entry = await store.get(key)
  if (!entry || entry.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowMs }
    await store.set(key, fresh, windowMs)
    return { ok: true, remaining: maxRequests - 1, resetAt: fresh.resetAt }
  }
  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  await store.set(key, entry, windowMs)
  return { ok: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

const memoryStore = new MemoryStore()
let redisStoreInstance: Store | null = null

async function getStore(): Promise<Store> {
  if (redisStoreInstance) return redisStoreInstance
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return memoryStore
  // ponytail: ioredis is an optional dependency — only needed when REDIS_URL is set.
  try {
    // @ts-ignore — ioredis may not be installed
    const { default: Redis } = await import('ioredis')
    const redis = new Redis(redisUrl) as any
    redisStoreInstance = new RedisStore(redis)
    return redisStoreInstance
  } catch {
    console.warn('[rate-limit] ioredis not installed, falling back to MemoryStore. Install ioredis to enable Redis rate limiting.')
    return memoryStore
  }
}

export const limiter = createRateLimiter(memoryStore)

export async function rateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const store = await getStore()
  return runRateLimit(store, key, maxRequests, windowMs)
}
