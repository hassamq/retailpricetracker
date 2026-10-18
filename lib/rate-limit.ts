type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterMs: 0,
  };
}

/** Manual refresh: once per product per 10 minutes. */
export function canRefreshPrices(productId: string): boolean {
  const result = rateLimit(`refresh:${productId}`, 1, 10 * 60 * 1000);
  return result.ok;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
