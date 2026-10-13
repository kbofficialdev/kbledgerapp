/**
 * AUTHENTICATION & AUTHORIZATION DOMAIN MODULE: SERVICE IMPLEMENTATION
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signToken,
  verifyToken,
  createAdminToken,
  createCustomerToken,
  getAdminSession,
  getCustomerSession,
  requireAdminSession,
  requireCustomerSession,
} from "@/lib/auth-session";
import {
  validateActiveSessionInDb,
  invalidateSessionInDb,
  extractClientIp,
} from "@/lib/session-db";
import {
  AuthRole,
  AdminSessionPayload,
  CustomerSessionPayload,
  SessionPayload,
  TokenVerificationResult,
  AuthGuardResult,
} from "./types";

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generates a signed admin session token
   */
  async generateAdminToken(
    username: string = "admin",
    ttlSeconds: number = 7 * 24 * 3600,
    ipAddress?: string,
    sessionId?: string
  ): Promise<string> {
    return createAdminToken(username, ttlSeconds, ipAddress, sessionId);
  }

  /**
   * Generates a signed customer session token after checking active status
   */
  async generateCustomerToken(
    customerId: string,
    ttlSeconds: number = 7 * 24 * 3600,
    ipAddress?: string,
    sessionId?: string
  ): Promise<string> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true },
    });

    if (!customer) {
      throw new Error("Customer record not found.");
    }

    if (!customer.isActive) {
      throw new Error(
        "This customer account is deactivated/blacklisted. Session creation blocked."
      );
    }

    return createCustomerToken(customerId, ttlSeconds, ipAddress, sessionId);
  }

  /**
   * Cryptographically verifies and validates session token against database blacklist
   */
  async verifySessionToken<T extends SessionPayload>(
    token: string
  ): Promise<TokenVerificationResult<T>> {
    const verification = await verifyToken<T>(token);
    if (!verification.valid || !verification.payload) {
      return {
        valid: false,
        error: verification.error || "Invalid session token",
        code: "ERR_TOKEN_INVALID",
      };
    }

    const payload = verification.payload;

    // Check if session has been revoked in DB
    const dbValidation = await validateActiveSessionInDb(token);
    if (!dbValidation.valid) {
      return {
        valid: false,
        error: dbValidation.error || "Session has been revoked or expired.",
        code: "ERR_SESSION_REVOKED",
      };
    }

    // If customer, verify customer is not disabled
    if (payload.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { id: (payload as unknown as CustomerSessionPayload).customerId },
        select: { isActive: true },
      });

      if (!customer || !customer.isActive) {
        return {
          valid: false,
          error: "Account has been blacklisted or deactivated.",
          code: "ERR_ACCOUNT_DISABLED",
        };
      }
    }

    return {
      valid: true,
      payload,
    };
  }

  /**
   * Enforces Admin session guard
   */
  async requireAdmin(req: NextRequest) {
    return requireAdminSession(req);
  }

  /**
   * Enforces Customer session guard
   */
  async requireCustomer(req: NextRequest, targetCustomerId?: string) {
    return requireCustomerSession(req, targetCustomerId);
  }

  /**
   * Revokes a session token
   */
  async revokeSession(token: string): Promise<boolean> {
    await invalidateSessionInDb(token);
    return true;
  }

  /**
   * Helper to inspect client IP
   */
  getClientIp(req: NextRequest): string {
    return extractClientIp(req);
  }
}

