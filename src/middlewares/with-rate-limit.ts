import type { NextRequest } from "next/server";

import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";

interface RateLimitBucket {
  windowMs: number;
  max: number;
}

/** Rate-limits a request by client IP (and, when available, user id). */
export function enforceRateLimit(
  request: NextRequest,
  bucketName: string,
  bucket: RateLimitBucket,
  userId?: string,
) {
  const ip = extractClientIp(request.headers);
  const key = `${bucketName}:${userId ?? ip}`;
  checkRateLimit({ key, windowMs: bucket.windowMs, max: bucket.max });
}
