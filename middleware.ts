import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/admin/seed",
];

const publicPrefixes = ["/verificar", "/_next", "/favicon", "/images", "/convite", "/api/invites", "/api/serial-keys/scan"];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }
    // Pages redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "fallback-secret-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);

    // Check admin routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (payload.role !== "admin") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { message: "Acesso negado" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", payload.role as string);
    return response;
  } catch {
    // Token invalid/expired - try to clear and redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { message: "Token inválido ou expirado" },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
