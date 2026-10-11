import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to login and registration pages
  if (pathname === "/admin/login" || pathname === "/admin/register") {
    // If admin is already authenticated, redirect away from login page to dashboard
    const sessionCookie = request.cookies.get("kb_admin_session")?.value;
    if (sessionCookie && sessionCookie.startsWith("kb_adm_")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect all shop management routes
  const isProtectedShopRoute =
    pathname === "/" ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/villages") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/admin");

  if (isProtectedShopRoute) {
    const sessionCookie = request.cookies.get("kb_admin_session")?.value;

    if (!sessionCookie || !sessionCookie.startsWith("kb_adm_")) {
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("from", pathname);
      }
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      return redirectResponse;
    }
  }

  const response = NextResponse.next();
  if (isProtectedShopRoute) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/orders/:path*",
    "/villages/:path*",
    "/customers/:path*",
    "/ledger/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/admin/:path*",
  ],
};

