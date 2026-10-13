import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, verifyCustomerToken } from "@/lib/auth-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract client IP address for "One IP, One Session" verification
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : (request.headers.get("x-real-ip") || "127.0.0.1");

  const adminCookie = request.cookies.get("kb_admin_session")?.value;
  const customerCookie = request.cookies.get("kb_customer_session")?.value;

  // 0. Auto-redirect root path (/)
  if (pathname === "/") {
    const [adminAuth, customerAuth] = await Promise.all([
      verifyAdminToken(adminCookie, clientIp),
      verifyCustomerToken(customerCookie, clientIp),
    ]);

    if (adminAuth.valid) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (customerAuth.valid) {
      return NextResponse.redirect(new URL("/customer", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 1. Common public login route (/login)
  if (pathname === "/login") {
    const requestedTab = request.nextUrl.searchParams.get("tab");
    if (!requestedTab) {
      const [adminAuth, customerAuth] = await Promise.all([
        verifyAdminToken(adminCookie, clientIp),
        verifyCustomerToken(customerCookie, clientIp),
      ]);

      if (adminAuth.valid) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (customerAuth.valid) {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Admin login & register routes (/admin/login, /admin/register)
  if (pathname === "/admin/login" || pathname === "/admin/register") {
    const isCustomerTab = request.nextUrl.searchParams.get("tab") === "customer";
    if (!isCustomerTab) {
      const adminAuth = await verifyAdminToken(adminCookie, clientIp);
      if (adminAuth.valid) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Customer login routes (/customer/login, /portal/login)
  if (pathname === "/customer/login" || pathname === "/portal/login") {
    const isAdminTab = request.nextUrl.searchParams.get("tab") === "admin";
    if (!isAdminTab) {
      const customerAuth = await verifyCustomerToken(customerCookie, clientIp);
      if (customerAuth.valid) {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
    }
    return NextResponse.next();
  }

  // 4. AI Service is EXCLUSIVELY for authenticated Admin (/assistant, /chat, /admin/ai)
  const isAiServiceRoute =
    pathname === "/assistant" ||
    pathname.startsWith("/assistant/") ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/admin/ai" ||
    pathname.startsWith("/admin/ai/");

  if (isAiServiceRoute) {
    const adminAuth = await verifyAdminToken(adminCookie, clientIp);
    const customerAuth = await verifyCustomerToken(customerCookie, clientIp);

    if (!adminAuth.valid) {
      // If customer attempts to access AI service, deny and redirect to customer home
      if (customerAuth.valid) {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      return redirectResponse;
    }
  }

  // 5. Customer Portal protected routes (/customer, /customer/*, /portal, /portal/*)
  const isCustomerPortalRoute =
    ((pathname === "/customer" || pathname.startsWith("/customer/")) && pathname !== "/customer/login") ||
    ((pathname === "/portal" || pathname.startsWith("/portal/")) && pathname !== "/portal/login");

  if (isCustomerPortalRoute) {
    const [customerAuth, adminAuth] = await Promise.all([
      verifyCustomerToken(customerCookie, clientIp),
      verifyAdminToken(adminCookie, clientIp),
    ]);

    // If neither customer nor admin is authenticated, redirect to customer login
    if (!customerAuth.valid && !adminAuth.valid) {
      const loginUrl = new URL("/customer/login", request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      return redirectResponse;
    }

    // Redirect legacy /portal routes to /customer
    if (pathname.startsWith("/portal")) {
      const newPath = pathname.replace(/^\/portal/, "/customer");
      return NextResponse.redirect(new URL(newPath, request.url));
    }

    // Cross-customer data separation: If authenticated as customer, prevent accessing another customer's ID URL
    if (customerAuth.valid && !adminAuth.valid) {
      const pathSegments = pathname.split("/").filter(Boolean);
      if (pathSegments.length >= 2 && pathSegments[0] === "customer") {
        const subRoute = pathSegments[1];
        // Allow valid customer sections:
        const allowedSections = ["khata", "orders", "tickets", "pay", "assistant"];
        if (!allowedSections.includes(subRoute) && subRoute !== customerAuth.payload?.customerId) {
          return NextResponse.redirect(new URL("/customer", request.url));
        }
      }
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // 6. Admin and Shop Management Protected Routes
  const isProtectedShopRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/villages" ||
    pathname.startsWith("/villages/") ||
    pathname === "/customers" ||
    pathname.startsWith("/customers/") ||
    pathname === "/ledger" ||
    pathname.startsWith("/ledger/") ||
    pathname === "/payments" ||
    pathname.startsWith("/payments/") ||
    pathname === "/reports" ||
    (pathname.startsWith("/reports/") && !pathname.includes("."));

  if (isProtectedShopRoute) {
    const [adminAuth, customerAuth] = await Promise.all([
      verifyAdminToken(adminCookie, clientIp),
      verifyCustomerToken(customerCookie, clientIp),
    ]);

    if (!adminAuth.valid) {
      // If customer attempts to access Admin/Shop management, redirect them to customer home
      if (customerAuth.valid) {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/admin") {
        loginUrl.searchParams.set("from", pathname);
      }
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
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

  // Security and policy headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "payment=*, encrypted-media=*");

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin",
    "/admin/:path*",
    "/customer",
    "/customer/:path*",
    "/portal",
    "/portal/:path*",
    "/assistant",
    "/assistant/:path*",
    "/chat",
    "/chat/:path*",
    "/orders",
    "/orders/:path*",
    "/villages",
    "/villages/:path*",
    "/customers",
    "/customers/:path*",
    "/ledger",
    "/ledger/:path*",
    "/payments",
    "/payments/:path*",
    "/reports",
    "/reports/:path*",
  ],
};
