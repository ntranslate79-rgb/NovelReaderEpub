import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight middleware to protect admin routes.
 * Avoids importing NextAuth (keeps Edge Function small).
 * This only checks for a NextAuth session cookie and redirects
 * to the login page if missing. Full role checks should run
 * on the server-side handlers where the full auth library is available.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookieHeader = request.headers.get("cookie") || "";

    // Check for common NextAuth cookie names (secure and non-secure)
    const hasSessionCookie =
      cookieHeader.includes("next-auth.session-token") ||
      cookieHeader.includes("__Secure-next-auth.session-token") ||
      cookieHeader.includes("next-auth.callback-url");

    if (!hasSessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Note: Role/authorization checks should be enforced in server handlers
    // (API routes / server components) where the full auth/session can be loaded.
  }

  return NextResponse.next();
}

// Apply to admin routes
export const config = {
  matcher: ["/admin/:path*"],
};
