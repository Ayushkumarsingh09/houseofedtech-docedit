import { RateLimitError } from "@/lib/errors";

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Fixed-window in-memory rate limiter.
 *
 * This is intentionally dependency-free (no Redis) so the assignment runs
 * standalone without extra paid infrastructure. It is scoped per serverless
 * instance, which is a documented, deliberate trade-off — see
 * `docs/ARCHITECTURE.md#security` for how this would be swapped for a
 * distributed limiter (Upstash Redis / Vercel Firewall) in a multi-instance
 * production deployment.
 */
const buckets = new Map<string, Bucket>();

const MAX_TRACKED_KEYS = 50_000;

export interface RateLimitOptions {
  /** Unique key: typically `${routeName}:${ip-or-userId}`. */
  key: string;
  windowMs: number;
  max: number;
}

export function checkRateLimit({ key, windowMs, max }: RateLimitOptions): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      evictOldest();
    }
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= max) {
    const retryAfterMs = windowMs - (now - existing.windowStart);
    throw new RateLimitError(retryAfterMs);
  }

  existing.count += 1;
}

function evictOldest() {
  let oldestKey: string | null = null;
  let oldestStart = Infinity;
  for (const [key, bucket] of buckets) {
    if (bucket.windowStart < oldestStart) {
      oldestStart = bucket.windowStart;
      oldestKey = key;
    }
  }
  if (oldestKey) buckets.delete(oldestKey);
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
