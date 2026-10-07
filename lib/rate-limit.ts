import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  /** Stable server-derived key, such as `login:<ip>` or `reset:<emailHash>`. */
  key: string;
  /** Maximum accepted attempts during the fixed window. */
  limit: number;
  /** Fixed window duration in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
};

// WHY: A global map survives Next.js development hot reloads and prevents every
// module evaluation from resetting limits. It remains process-local by design.
// Better Auth separately applies database-backed limits to authentication
// endpoints in lib/auth/auth.ts; that shared limiter is the production guard.
// This helper is only an additional per-process throttle and must never be the
// sole abuse control for an endpoint deployed across multiple application nodes.
const globalForRateLimit = globalThis as unknown as {
  scriptureMemoRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets =
  globalForRateLimit.scriptureMemoRateLimitBuckets ??
  new Map<string, RateLimitBucket>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.scriptureMemoRateLimitBuckets = buckets;
}

/**
 * Applies a process-local fixed-window limit for supplementary throttling.
 *
 * This implementation is intentionally dependency-free and provides a real,
 * testable per-process throttle. Separate instances do not share memory, so any
 * security-critical route still needs a shared limiter at its authoritative
 * provider boundary, as the Better Auth endpoint configuration currently does.
 */
export function rateLimit(options: RateLimitOptions): RateLimitResult {
  if (!options.key.trim()) {
    throw new RangeError("A non-empty rate-limit key is required.");
  }

  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new RangeError("Rate-limit capacity must be a positive integer.");
  }

  if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
    throw new RangeError("Rate-limit window must be a positive duration.");
  }

  const now = Date.now();
  const existing = buckets.get(options.key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;

  const success = bucket.count < options.limit;

  if (success) {
    bucket.count += 1;
  }

  buckets.set(options.key, bucket);

  return {
    success,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: new Date(bucket.resetAt),
  };
}
