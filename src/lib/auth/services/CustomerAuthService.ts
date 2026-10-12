import { BaseAuthService } from "./BaseAuthService";
import { AuthValidationResult } from "../interfaces/IAuthService";
import { IUserPrincipal } from "../interfaces/IUserPrincipal";
import { UserPrincipal } from "../models/UserPrincipal";

export class CustomerAuthService extends BaseAuthService {
  private static instance: CustomerAuthService;

  static getInstance(): CustomerAuthService {
    if (!CustomerAuthService.instance) {
      CustomerAuthService.instance = new CustomerAuthService();
    }
    return CustomerAuthService.instance;
  }

  async createToken(principal: IUserPrincipal): Promise<string> {
    if (!principal.isCustomer()) {
      throw new Error("CustomerAuthService can only issue tokens for Customer principals.");
    }

    const payload = {
      role: "CUSTOMER",
      customerId: principal.customerId,
      ipAddress: principal.ipAddress,
      sessionId: principal.sessionId,
      issuedAt: principal.issuedAt,
      expiresAt: principal.expiresAt,
    };

    const serializedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = await this.signHmac(serializedPayload);
    return `${serializedPayload}.${signature}`;
  }

  async createCustomerSessionToken(
    customerId: string,
    ttlMs = 86400000,
    ipAddress?: string,
    sessionId?: string
  ): Promise<string> {
    const principal = UserPrincipal.createCustomer(
      customerId,
      Date.now(),
      Date.now() + ttlMs,
      ipAddress,
      sessionId
    );
    return this.createToken(principal);
  }

  async validateToken(token: string | undefined): Promise<AuthValidationResult> {
    if (!token || typeof token !== "string" || !token.trim()) {
      return {
        valid: false,
        principal: UserPrincipal.createAnonymous(),
        error: "Missing customer session token.",
      };
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
      return {
        valid: false,
        principal: UserPrincipal.createAnonymous(),
        error: "Malformed customer session token structure.",
      };
    }

    const [encodedPayload, providedSignature] = parts;

    try {
      // 1. Verify HMAC cryptographic signature
      const expectedSignature = await this.signHmac(encodedPayload);
      if (!this.timingSafeEqual(providedSignature, expectedSignature)) {
        return {
          valid: false,
          principal: UserPrincipal.createAnonymous(),
          error: "Invalid or forged customer cryptographic signature.",
        };
      }

      // 2. Decode and parse payload
      const jsonStr = this.base64UrlDecode(encodedPayload);
      const data = JSON.parse(jsonStr);

      // 3. Validate Role
      if (data.role !== "CUSTOMER" || !data.customerId) {
        return {
          valid: false,
          principal: UserPrincipal.createAnonymous(),
          error: "Unauthorized: Token does not hold the authorized CUSTOMER role.",
        };
      }

      // 4. Validate Token Expiration
      const expiryMs =
        typeof data.expiresAt === "number" && data.expiresAt < 10000000000
          ? data.expiresAt * 1000
          : data.expiresAt;
      if (typeof data.expiresAt === "number" && expiryMs < Date.now()) {
        return {
          valid: false,
          principal: UserPrincipal.createAnonymous(),
          error: "Customer session has expired. Please sign in again.",
        };
      }

      const principal = UserPrincipal.createCustomer(
        data.customerId,
        data.issuedAt,
        data.expiresAt,
        data.ipAddress,
        data.sessionId
      );

      return {
        valid: true,
        principal,
      };
    } catch (err: any) {
      return {
        valid: false,
        principal: UserPrincipal.createAnonymous(),
        error: err.message || "Failed to parse customer session payload.",
      };
    }
  }

  /**
   * Cross-tenant customer isolation rule:
   * Asserts that a customer principal can only access their own customerId.
   */
  canAccessCustomerData(principal: IUserPrincipal, targetCustomerId: string): boolean {
    if (principal.isAdmin()) return true; // Admins have shop-wide oversight
    if (principal.isCustomer() && principal.customerId === targetCustomerId) return true;
    return false;
  }
}
