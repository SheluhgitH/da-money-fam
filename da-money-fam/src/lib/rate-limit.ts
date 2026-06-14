const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count += 1
  return { allowed: true, remaining: limit - entry.count }
}
