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
// Better Auth applies database-backed limits to public HTTP authentication
// endpoints. Internal `auth.api.*` calls from Server Actions bypass that HTTP
// middleware, so security-sensitive actions must use the repository-owned
// shared database limiter instead of relying on this process-local helper.
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
 * This implementation is intentionally dependency-free and provides a
 * supplementary per-process throttle. Separate instances do not share memory;
 * never use it as the only abuse control for a security-sensitive operation.
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
