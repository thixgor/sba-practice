/**
 * CSRF Token Module for SBA Practice System
 *
 * Generates and verifies CSRF tokens using Node.js crypto. This is an
 * additional defense layer on top of SameSite=Strict cookies, as specified
 * in the project security requirements.
 *
 * Token format: `<random_hex>.<timestamp_hex>.<hmac_hex>`
 *
 * The HMAC binds the token to the server secret, preventing forgery.
 * The timestamp allows optional expiration checks.
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** CSRF tokens expire after 1 hour by default. */
const DEFAULT_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * The secret used to sign CSRF tokens. Falls back to JWT_SECRET in dev,
 * but should ideally be a separate secret in production.
 */
function getSecret(): string {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'CSRF_SECRET or JWT_SECRET environment variable must be set. ' +
      'CSRF tokens cannot be generated without a signing secret.',
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure CSRF token.
 *
 * The token is an HMAC-signed payload containing:
 * - 32 random bytes (hex-encoded)
 * - Current timestamp (hex-encoded)
 *
 * @returns A signed CSRF token string.
 *
 * @example
 * ```ts
 * // In a Server Action or API route that renders a form:
 * const csrfToken = generateCSRFToken();
 * // Pass to client as a hidden field or meta tag
 * ```
 */
export function generateCSRFToken(): string {
  const secret = getSecret();

  // 32 bytes = 256 bits of randomness
  const randomPart = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(16);

  const payload = `${randomPart}.${timestamp}`;

  const hmac = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `${payload}.${hmac}`;
}

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

/**
 * Verify a CSRF token against an expected token or just validate its
 * signature and expiration.
 *
 * @param token       The token received from the client.
 * @param storedToken Optional stored/expected token for direct comparison.
 *                    If not provided, only signature + expiration are checked.
 * @param options     Optional configuration.
 * @returns `true` if the token is valid.
 *
 * @example
 * ```ts
 * // Direct comparison (double-submit cookie pattern)
 * const isValid = verifyCSRFToken(clientToken, cookieToken);
 *
 * // Signature-only verification (signed token pattern)
 * const isValid = verifyCSRFToken(clientToken);
 * ```
 */
export function verifyCSRFToken(
  token: string,
  storedToken?: string,
  options?: { maxAgeMs?: number },
): boolean {
  // If a stored token is provided, do a timing-safe comparison first.
  if (storedToken !== undefined) {
    return safeCompare(token, storedToken);
  }

  // Otherwise, verify the token's own signature and expiration.
  return verifyTokenSignature(token, options?.maxAgeMs ?? DEFAULT_TOKEN_EXPIRY_MS);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  // Strings must be the same length for timingSafeEqual
  if (a.length !== b.length) return false;

  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify the HMAC signature embedded in a CSRF token and check expiration.
 */
function verifyTokenSignature(token: string, maxAgeMs: number): boolean {
  if (typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [randomPart, timestampHex, providedHmac] = parts as [string, string, string];

  // Validate parts are non-empty
  if (!randomPart || !timestampHex || !providedHmac) return false;

  // Verify the HMAC signature
  const secret = getSecret();
  const payload = `${randomPart}.${timestampHex}`;

  const expectedHmac = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (!safeCompare(providedHmac, expectedHmac)) {
    return false;
  }

  // Verify timestamp / expiration
  const timestamp = parseInt(timestampHex, 16);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  const age = now - timestamp;

  // Token from the future (clock skew tolerance: 60s)
  if (age < -60_000) return false;

  // Token expired
  if (age > maxAgeMs) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Middleware helper
// ---------------------------------------------------------------------------

/**
 * Extract CSRF token from a Request object. Checks both the
 * `x-csrf-token` header and the `_csrf` body field.
 */
export function extractCSRFToken(request: Request, body?: Record<string, unknown>): string | null {
  // Check header first (preferred for AJAX)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;

  // Check body field (form submissions)
  if (body && typeof body._csrf === 'string') {
    return body._csrf;
  }

  return null;
}

/**
 * Validate a CSRF token from a request. Combines extraction and verification.
 *
 * @param request The incoming Request object.
 * @param storedToken Optional token to compare against (from session/cookie).
 * @param body Optional parsed request body.
 * @returns `true` if a valid CSRF token is present.
 */
export function validateCSRFRequest(
  request: Request,
  storedToken?: string,
  body?: Record<string, unknown>,
): boolean {
  const token = extractCSRFToken(request, body);
  if (!token) return false;
  return verifyCSRFToken(token, storedToken);
}
