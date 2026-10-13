import { NextRequest, NextResponse } from "next/server";
import {
  adminAuth,
  customerAuth,
  authGuard,
  UserPrincipal,
} from "@/lib/auth";

export interface AdminSessionPayload {
  role: "ADMIN";
  username: string;
  ipAddress?: string;
  sessionId?: string;
  issuedAt: number;
  expiresAt: number;
}

export interface CustomerSessionPayload {
  role: "CUSTOMER";
  customerId: string;
  ipAddress?: string;
  sessionId?: string;
  issuedAt: number;
  expiresAt: number;
}

export type SessionPayload = AdminSessionPayload | CustomerSessionPayload;

/**
 * Creates a signed token string: base64url(payload).signature
 * Delegates to OOP BaseAuthService
 */
export async function signToken<T extends SessionPayload>(payload: T): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const encodedPayload = adminAuth.base64UrlEncode(jsonStr);
  const signature = await adminAuth.signHmac(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and parses a signed token string
 */
export async function verifyToken<T extends SessionPayload>(
  token: string | null | undefined
): Promise<{ valid: boolean; payload?: T; error?: string }> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing token" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed token format" };
  }

  const [encodedPayload, signature] = parts;
  try {
    const expectedSig = await adminAuth.signHmac(encodedPayload);
    if (!adminAuth.timingSafeEqual(signature, expectedSig)) {
      return { valid: false, error: "Invalid cryptographic signature" };
    }

    const jsonStr = adminAuth.base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr) as T;

    if (!payload || typeof payload !== "object") {
      return { valid: false, error: "Invalid token payload structure" };
    }

    const now = Math.floor(Date.now() / 1000);
    const expirySec =
      typeof payload.expiresAt === "number" && payload.expiresAt > 10000000000
        ? Math.floor(payload.expiresAt / 1000)
        : payload.expiresAt;

    if (expirySec && expirySec < now) {
      return { valid: false, error: "Session token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Failed to decode payload" };
  }
}

/**
 * Signs an Admin Session Token (24 hours default)
 * Delegates to AdminAuthService OOP singleton
 */
export async function createAdminToken(
  username = "kbadmin",
  ttlSeconds = 24 * 3600,
  ipAddress?: string,
  sessionId?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const principal = UserPrincipal.createAdmin(
    username,
    now,
    now + ttlSeconds,
    ipAddress,
    sessionId
  );
  return adminAuth.createToken(principal);
}

function isLoopbackAddress(ip?: string | null): boolean {
  if (!ip) return true;
  const trimmed = ip.trim().toLowerCase();
  return (
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed === "::ffff:127.0.0.1" ||
    trimmed === "localhost"
  );
}

/**
 * Verifies an Admin Session Token with optional IP binding enforcement
 * Delegates to AdminAuthService OOP singleton
 */
export async function verifyAdminToken(
  token: string | null | undefined,
  clientIp?: string
): Promise<{ valid: boolean; payload?: AdminSessionPayload }> {
  if (!token) return { valid: false };
  const res = await adminAuth.validateToken(token);
  if (!res.valid || !res.principal.isAdmin()) {
    return { valid: false };
  }

  // One IP binding verification: if token has IP and clientIp is provided, ensure match
  if (
    clientIp &&
    res.principal.ipAddress &&
    !isLoopbackAddress(clientIp) &&
    !isLoopbackAddress(res.principal.ipAddress) &&
    clientIp !== res.principal.ipAddress
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    payload: {
      role: "ADMIN",
      username: res.principal.username || "kbadmin",
      ipAddress: res.principal.ipAddress,
      sessionId: res.principal.sessionId,
      issuedAt: res.principal.issuedAt,
      expiresAt: res.principal.expiresAt,
    },
  };
}

/**
 * Signs a Customer Session Token (7 days default)
 * Delegates to CustomerAuthService OOP singleton
 */
export async function createCustomerToken(
  customerId: string,
  ttlSeconds = 7 * 24 * 3600,
  ipAddress?: string,
  sessionId?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const principal = UserPrincipal.createCustomer(
    customerId,
    now,
    now + ttlSeconds,
    ipAddress,
    sessionId
  );
  return customerAuth.createToken(principal);
}

/**
 * Verifies a Customer Session Token with optional IP binding enforcement
 * Delegates to CustomerAuthService OOP singleton
 */
export async function verifyCustomerToken(
  token: string | null | undefined,
  clientIp?: string
): Promise<{ valid: boolean; payload?: CustomerSessionPayload }> {
  if (!token) return { valid: false };
  const res = await customerAuth.validateToken(token);
  if (!res.valid || !res.principal.isCustomer() || !res.principal.customerId) {
    return { valid: false };
  }

  // One IP binding verification: if token has IP and clientIp is provided, ensure match
  if (
    clientIp &&
    res.principal.ipAddress &&
    !isLoopbackAddress(clientIp) &&
    !isLoopbackAddress(res.principal.ipAddress) &&
    clientIp !== res.principal.ipAddress
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    payload: {
      role: "CUSTOMER",
      customerId: res.principal.customerId,
      ipAddress: res.principal.ipAddress,
      sessionId: res.principal.sessionId,
      issuedAt: res.principal.issuedAt,
      expiresAt: res.principal.expiresAt,
    },
  };
}

/**
 * Extracts and verifies Admin Session from NextRequest (Cookies or Authorization header)
 * Delegates to AuthorizationGuard OOP singleton
 */
export async function getAdminSession(req: NextRequest): Promise<AdminSessionPayload | null> {
  const principal = await authGuard.resolvePrincipal(req);
  if (principal.isAdmin()) {
    return {
      role: "ADMIN",
      username: principal.username || "kbadmin",
      issuedAt: principal.issuedAt,
      expiresAt: principal.expiresAt,
    };
  }
  return null;
}

/**
 * Extracts and verifies Customer Session from NextRequest (Cookies or Authorization header)
 */
export async function getCustomerSession(req: NextRequest): Promise<CustomerSessionPayload | null> {
  const cookie = req.cookies.get("kb_customer_session")?.value;
  if (cookie) {
    const res = await verifyCustomerToken(cookie);
    if (res.valid && res.payload) return res.payload;
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const res = await verifyCustomerToken(token);
    if (res.valid && res.payload) return res.payload;
  }
  return null;
}

/**
 * Enforces Admin Session for API route handlers
 * Delegates to AuthorizationGuard
 */
export async function requireAdminSession(
  req: NextRequest
): Promise<{ authorized: boolean; payload?: AdminSessionPayload; response?: NextResponse }> {
  const check = await authGuard.requireAdmin(req);
  if (check.errorResponse) {
    return { authorized: false, response: check.errorResponse };
  }
  return {
    authorized: true,
    payload: {
      role: "ADMIN",
      username: check.principal.username || "kbadmin",
      issuedAt: check.principal.issuedAt,
      expiresAt: check.principal.expiresAt,
    },
  };
}

/**
 * Enforces Customer Session for API route handlers.
 * If targetCustomerId is provided, the authenticated customer MUST match it,
 * unless an authorized ADMIN session is present (admin override).
 * Delegates to AuthorizationGuard
 */
export async function requireCustomerSession(
  req: NextRequest,
  targetCustomerId?: string
): Promise<{
  authorized: boolean;
  role?: "ADMIN" | "CUSTOMER";
  payload?: SessionPayload;
  response?: NextResponse;
}> {
  // Check admin override first
  const adminSession = await getAdminSession(req);
  if (adminSession) {
    return { authorized: true, role: "ADMIN", payload: adminSession };
  }

  const check = await authGuard.requireCustomer(req, targetCustomerId);
  if (check.errorResponse) {
    return { authorized: false, response: check.errorResponse };
  }

  const customerSession = await getCustomerSession(req);
  return {
    authorized: true,
    role: "CUSTOMER",
    payload: customerSession || {
      role: "CUSTOMER",
      customerId: check.principal.customerId || "",
      issuedAt: check.principal.issuedAt,
      expiresAt: check.principal.expiresAt,
    },
  };
}

/**
 * Sets secure signed admin session cookie
 */
const isSecureCookie =
  process.env.COOKIE_SECURE === "true" ||
  (process.env.NODE_ENV === "production" && process.env.ENABLE_HTTPS === "true");

export function setAdminCookie(response: NextResponse, token: string): void {
  // Strict Role Isolation: clear any active customer session cookie on admin login
  clearCustomerCookie(response);
  response.cookies.set("kb_admin_session", token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });
}

/**
 * Clears admin session cookie
 */
export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set("kb_admin_session", "", {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}

/**
 * Sets secure signed customer session cookie
 */
export function setCustomerCookie(response: NextResponse, token: string): void {
  // Strict Role Isolation: clear any active admin session cookie on customer login
  clearAdminCookie(response);
  response.cookies.set("kb_customer_session", token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/**
 * Clears customer session cookie
 */
export function clearCustomerCookie(response: NextResponse): void {
  response.cookies.set("kb_customer_session", "", {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}
