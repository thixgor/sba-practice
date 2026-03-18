/**
 * Rate Limiting Module for SBA Practice System
 *
 * In-memory rate limiter for development. Designed as a drop-in replacement
 * target for Vercel KV (Redis) in production. The store interface and async
 * signatures make the swap trivial.
 *
 * Production swap: replace the Map-based store with @vercel/kv calls using
 * the same key structure. No consumer code changes needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxAttempts: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining attempts in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
  /** Total attempts consumed in the current window. */
  consumed: number;
}

// ---------------------------------------------------------------------------
// Pre-configured limits (from CLAUDE.md spec)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Login: 20 attempts per 5 minutes per IP */
  login: { maxAttempts: 20, windowMs: 5 * 60 * 1000 } satisfies RateLimitConfig,

  /** Authenticated API: 200 requests per minute per user */
  api: { maxAttempts: 200, windowMs: 60 * 1000 } satisfies RateLimitConfig,

  /** Public API: 60 requests per minute per IP */
  publicApi: { maxAttempts: 60, windowMs: 60 * 1000 } satisfies RateLimitConfig,

  /** Account creation: 10 attempts per hour per IP */
  register: { maxAttempts: 10, windowMs: 60 * 60 * 1000 } satisfies RateLimitConfig,
} as const;

// ---------------------------------------------------------------------------
// In-memory store (development only)
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>();

/** Periodically purge expired entries to prevent memory leaks in long-running dev. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is active.
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// Core rate-limit check
// ---------------------------------------------------------------------------

/**
 * Check whether a request identified by `key` is allowed under `config`.
 *
 * @param key    Unique identifier (e.g. `login:${ip}`, `api:${userId}`).
 * @param config Rate limit configuration to apply.
 * @returns      Promise resolving to the rate limit result.
 *
 * @example
 * ```ts
 * const ip = getClientIP(request);
 * const result = await checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Too many requests', retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
 *     { status: 429 }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(key);

  // Window expired or first request — start a fresh window.
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
      consumed: 1,
    };
  }

  // Increment within the current window.
  entry.count += 1;

  if (entry.count > config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      consumed: entry.count,
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
    consumed: entry.count,
  };
}

// ---------------------------------------------------------------------------
// Reset helper (useful for tests and admin actions)
// ---------------------------------------------------------------------------

/**
 * Reset the rate limit counter for a specific key.
 * Useful when an admin unlocks a user or in test teardown.
 */
export async function resetRateLimit(key: string): Promise<void> {
  store.delete(key);
}

/**
 * Check how many consecutive failed login attempts exist.
 * Used to decide whether to trigger CAPTCHA (>= 10 failures).
 */
export async function getConsecutiveFailures(key: string): Promise<number> {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetAt) return 0;
  return entry.count;
}

// ---------------------------------------------------------------------------
// IP extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract the client IP address from a `Request` object.
 *
 * Checks common proxy headers used by Vercel, Cloudflare, and nginx.
 * Falls back to `'unknown'` when the IP cannot be determined.
 */
export function getClientIP(request: Request): string {
  // Vercel-specific header (most reliable when deployed on Vercel)
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) return vercelIP.split(',')[0]!.trim();

  // Standard proxy header
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();

  // Nginx / some reverse proxies
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP.trim();

  return 'unknown';
}

/**
 * Build a namespaced rate-limit key.
 *
 * @example
 * ```ts
 * const key = rateLimitKey('login', getClientIP(request));
 * // → "rl:login:203.0.113.42"
 * ```
 */
export function rateLimitKey(
  namespace: keyof typeof RATE_LIMITS | string,
  identifier: string,
): string {
  return `rl:${namespace}:${identifier}`;
}
