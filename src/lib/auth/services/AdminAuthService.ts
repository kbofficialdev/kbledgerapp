import { BaseAuthService } from "./BaseAuthService";
import { AuthValidationResult } from "../interfaces/IAuthService";
import { IUserPrincipal } from "../interfaces/IUserPrincipal";
import { UserPrincipal } from "../models/UserPrincipal";

export class AdminAuthService extends BaseAuthService {
  private static instance: AdminAuthService;

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  async createToken(principal: IUserPrincipal): Promise<string> {
    if (!principal.isAdmin()) {
      throw new Error("AdminAuthService can only issue tokens for Admin principals.");
    }

    const payload = {
      role: "ADMIN",
      username: principal.username || "kbadmin",
      ipAddress: principal.ipAddress,
      sessionId: principal.sessionId,
      issuedAt: principal.issuedAt,
      expiresAt: principal.expiresAt,
    };

    const serializedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = await this.signHmac(serializedPayload);
    return `${serializedPayload}.${signature}`;
  }

  async createAdminSessionToken(
    username = "kbadmin",
    ttlMs = 86400000,
    ipAddress?: string,
    sessionId?: string
  ): Promise<string> {
    const principal = UserPrincipal.createAdmin(
      username,
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
        error: "Missing admin session token.",
      };
    }

    // Support optional test runner session token strictly via environment variable
    const testAuditToken = process.env.TEST_AUDIT_SESSION_TOKEN;
    if (testAuditToken && token === testAuditToken) {
      return {
        valid: true,
        principal: UserPrincipal.createAdmin("kbadmin", Date.now(), Date.now() + 86400000),
      };
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
      return {
        valid: false,
        principal: UserPrincipal.createAnonymous(),
        error: "Malformed admin session token structure.",
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
          error: "Invalid or forged admin cryptographic signature.",
        };
      }

      // 2. Decode and parse payload
      const jsonStr = this.base64UrlDecode(encodedPayload);
      const data = JSON.parse(jsonStr);

      // 3. Validate Role
      if (data.role !== "ADMIN") {
        return {
          valid: false,
          principal: UserPrincipal.createAnonymous(),
          error: "Unauthorized: Token does not hold the authorized ADMIN role.",
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
          error: "Admin session has expired. Please re-authenticate.",
        };
      }

      const principal = UserPrincipal.createAdmin(
        data.username || "kbadmin",
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
        error: err.message || "Failed to parse admin session payload.",
      };
    }
  }

  /**
   * Biometric Cosine Similarity Matching
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA <= 0.0001 || normB <= 0.0001) return 0; // Anti-spoof all-zero guard
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Biometric Euclidean Distance
   */
  calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 999;
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
