import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAMES } from "@/constants";
import { verifyAccessToken } from "@/lib/jwt";

const PROTECTED_PREFIXES = ["/dashboard", "/documents", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Network-boundary gatekeeper (Next.js 16 `proxy.ts`, formerly
 * `middleware.ts`). This is a fast, coarse check (valid-looking JWT
 * present) — every route handler still independently verifies the token
 * and re-checks document-level authorization server-side, so this proxy is
 * a UX optimization (instant redirects) rather than the sole security
 * boundary (defense in depth).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await verifyAccessToken(token);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PAGES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
