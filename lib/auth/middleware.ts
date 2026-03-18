import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type TokenPayload } from './jwt';
import { getAccessToken } from './cookies';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Extended request that carries the authenticated user's token payload.
 * Route handlers wrapped with `withAuth` or `withAdmin` can safely access
 * `req.user`.
 */
export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload;
}

/** Context object passed by Next.js App Router to dynamic route handlers. */
export interface RouteContext {
  params?: Promise<Record<string, string | string[] | undefined>>;
}

/** Signature of a Next.js App Router route handler. */
type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext,
) => Promise<NextResponse | Response> | NextResponse | Response;

/** Signature of an authenticated route handler (has `req.user`). */
type AuthenticatedRouteHandler = (
  req: AuthenticatedRequest,
  ctx: RouteContext,
) => Promise<NextResponse | Response> | NextResponse | Response;

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      error: 'UNAUTHORIZED',
      message,
    },
    { status: 401 },
  );
}

function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json(
    {
      error: 'FORBIDDEN',
      message,
    },
    { status: 403 },
  );
}

function tokenExpiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'TOKEN_EXPIRED',
      message: 'Access token has expired. Please refresh your session.',
    },
    { status: 401 },
  );
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the access token from:
 * 1. The HTTP-only `auth-token` cookie (primary, used by browser clients)
 * 2. The `Authorization: Bearer <token>` header (fallback, useful for API
 *    consumers and testing)
 */
async function extractToken(req: NextRequest): Promise<string | undefined> {
  // 1. Try cookie first (most secure path for browser clients)
  const cookieToken = await getAccessToken();
  if (cookieToken) return cookieToken;

  // 2. Fallback to Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Middleware HOFs
// ---------------------------------------------------------------------------

/**
 * Higher-order function that wraps a route handler with authentication.
 *
 * - Extracts the access token from cookies or Authorization header
 * - Verifies the token signature and expiration
 * - Injects `req.user` with the decoded `TokenPayload`
 * - Returns 401 if the token is missing, invalid, or expired
 *
 * Usage:
 * ```ts
 * // app/api/cursos/route.ts
 * import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
 *
 * export const GET = withAuth(async (req, ctx) => {
 *   const { userId, role } = req.user;
 *   // ... handler logic
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    const token = await extractToken(req);

    if (!token) {
      return unauthorizedResponse('No authentication token provided');
    }

    try {
      const payload = await verifyAccessToken(token);

      // Attach the decoded user payload to the request object
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = payload;

      return handler(authenticatedReq, ctx);
    } catch (error: unknown) {
      // jose throws JWSSignatureVerificationFailed, JWTExpired, JWTClaimValidationFailed, etc.
      const errorName = error instanceof Error ? error.name : '';
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

      if (errorName === 'JWTExpired' || errorMessage.includes('exp')) {
        return tokenExpiredResponse();
      }

      return unauthorizedResponse('Invalid authentication token');
    }
  };
}

/**
 * Higher-order function that wraps a route handler with admin-only access.
 *
 * Performs all the checks from `withAuth` and additionally verifies that
 * the user's role is `'admin'`. Returns 403 if the role check fails.
 *
 * Usage:
 * ```ts
 * // app/api/admin/stats/route.ts
 * import { withAdmin, type AuthenticatedRequest } from '@/lib/auth/middleware';
 *
 * export const GET = withAdmin(async (req, ctx) => {
 *   // Only admins reach here
 * });
 * ```
 */
export function withAdmin(handler: AuthenticatedRouteHandler): RouteHandler {
  return withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
    if (req.user.role !== 'admin') {
      return forbiddenResponse('Admin access required');
    }

    return handler(req, ctx);
  });
}

/**
 * Higher-order function that wraps a route handler with role-based access.
 *
 * Accepts an array of allowed roles. Performs authentication and then checks
 * that the user's role is in the allowed list.
 *
 * Usage:
 * ```ts
 * export const GET = withRole(['admin', 'user'])(async (req, ctx) => {
 *   // Both admins and regular users can access this
 * });
 * ```
 */
export function withRole(allowedRoles: Array<'admin' | 'user'>) {
  return (handler: AuthenticatedRouteHandler): RouteHandler => {
    return withAuth(async (req: AuthenticatedRequest, ctx: RouteContext) => {
      if (!allowedRoles.includes(req.user.role)) {
        return forbiddenResponse(
          `This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
        );
      }

      return handler(req, ctx);
    });
  };
}

// ---------------------------------------------------------------------------
// Utility: get current user from cookies (for Server Components / Actions)
// ---------------------------------------------------------------------------

/**
 * Reads and verifies the access token from cookies, returning the user
 * payload or `null` if not authenticated.
 *
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 * Does NOT throw -- returns null on any auth failure.
 *
 * Usage in a Server Component:
 * ```tsx
 * import { getCurrentUser } from '@/lib/auth/middleware';
 *
 * export default async function DashboardPage() {
 *   const user = await getCurrentUser();
 *   if (!user) redirect('/login');
 *   return <h1>Bem-vindo, {user.email}</h1>;
 * }
 * ```
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Same as `getCurrentUser` but throws if the user is not authenticated.
 * Useful in Server Actions where you want to fail fast.
 */
export async function requireCurrentUser(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Same as `requireCurrentUser` but also asserts admin role.
 */
export async function requireAdmin(): Promise<TokenPayload> {
  const user = await requireCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}
