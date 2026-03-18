import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_COOKIE = 'auth-token';
const REFRESH_TOKEN_COOKIE = 'refresh-token';

/** Access token lifetime in seconds (15 minutes). */
const ACCESS_TOKEN_MAX_AGE = 15 * 60;

/** Refresh token lifetime in seconds (7 days). */
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the current request is served over HTTPS.
 * In production (Vercel) this is always true. In local dev it depends on
 * whether you run `next dev --experimental-https`.
 */
function isSecureContext(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sets both auth cookies (access + refresh) as HTTP-only, Secure,
 * SameSite=Strict cookies.
 *
 * Must be called from a Server Action or Route Handler (where cookies are
 * mutable).
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();
  const secure = isSecureContext();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/**
 * Clears both auth cookies by setting them to empty values with immediate
 * expiration.
 *
 * Must be called from a Server Action or Route Handler.
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Reads both auth tokens from the incoming request cookies.
 *
 * Can be called from Server Components, Server Actions, Route Handlers,
 * and Middleware.
 */
export async function getAuthCookies(): Promise<{
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  const cookieStore = await cookies();

  const access = cookieStore.get(ACCESS_TOKEN_COOKIE);
  const refresh = cookieStore.get(REFRESH_TOKEN_COOKIE);

  return {
    accessToken: access?.value || undefined,
    refreshToken: refresh?.value || undefined,
  };
}

/**
 * Reads only the access token. Convenience wrapper used by the auth
 * middleware.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || undefined;
}

/**
 * Reads only the refresh token. Used during token rotation.
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || undefined;
}

// ---------------------------------------------------------------------------
// Exports (cookie name constants for use in Edge Middleware)
// ---------------------------------------------------------------------------

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
};
