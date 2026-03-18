import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  protocolId: string;
}

/** The subset of TokenPayload that callers supply when signing a new token. */
export type TokenInput = Pick<TokenPayload, 'userId' | 'email' | 'role' | 'protocolId'>;

// ---------------------------------------------------------------------------
// Secrets (lazily encoded once per cold start)
// ---------------------------------------------------------------------------

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 256 bits (32 characters)');
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 256 bits (32 characters)');
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Issuer & audience constants (hardened against token confusion attacks)
// ---------------------------------------------------------------------------

const ISSUER = 'sba-practice';
const AUDIENCE = 'sba-practice-api';

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

/**
 * Signs an access token (short-lived, 15 min).
 * Used in HTTP-only cookie `auth-token`.
 */
export async function signAccessToken(payload: TokenInput): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .sign(getAccessSecret());
}

/**
 * Signs a refresh token (long-lived, 7 days).
 * Used in HTTP-only cookie `refresh-token`.
 * Each refresh token is rotated on use; the previous one is blacklisted.
 */
export async function signRefreshToken(payload: TokenInput): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .sign(getRefreshSecret());
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

/**
 * Verifies an access token and returns the decoded payload.
 * Throws on invalid / expired tokens (callers should catch and return 401).
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as unknown as TokenPayload;
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws on invalid / expired tokens.
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as unknown as TokenPayload;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the token payload WITHOUT verifying the signature.
 * Useful only for reading the `exp` claim to compute remaining TTL
 * when blacklisting tokens in Redis.
 *
 * NEVER use this for authorization decisions.
 */
export function decodeTokenUnsafe(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1];
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Returns the number of seconds until the token expires.
 * Returns 0 if the token is already expired or unparseable.
 */
export function getTokenTTL(token: string): number {
  const payload = decodeTokenUnsafe(token);
  if (!payload?.exp) return 0;
  const remaining = payload.exp - Math.floor(Date.now() / 1000);
  return Math.max(0, remaining);
}
