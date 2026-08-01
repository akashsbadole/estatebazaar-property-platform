// ponytail: in-memory rate limiter. No Redis — ioredis isn't installed.
// Add multi-instance backing when scaling beyond single process.

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export async function rateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }
  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  return { ok: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}
