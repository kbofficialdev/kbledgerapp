/**
 * AUTHENTICATION & AUTHORIZATION DOMAIN MODULE: TYPE DEFINITIONS
 */

export type AuthRole = "ADMIN" | "CUSTOMER";

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

export interface TokenVerificationResult<T extends SessionPayload = SessionPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
  code?: string;
}

export interface AuthGuardResult {
  authorized: boolean;
  role?: AuthRole;
  identifier?: string;
  error?: string;
  statusCode?: number;
}

