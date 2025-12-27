import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Middleware to protect admin routes
 * Uses NextAuth.js for authentication
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect admin routes (except login page)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await auth();

    if (!session?.user) {
      // Redirect to login with callback URL
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Optional: Check if user has admin role
    const userRole = (session.user as Record<string, unknown>)?.role;
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  matcher: ["/admin/:path*"],
};
