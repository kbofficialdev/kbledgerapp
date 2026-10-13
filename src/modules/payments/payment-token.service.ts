import crypto from "crypto";
import { CheckoutTokenPayload } from "./types";

export class SecurityValidationError extends Error {
  constructor(message: string, public readonly code: string = "ERR_SECURITY_VIOLATION") {
    super(message);
    this.name = "SecurityValidationError";
  }
}

export class PaymentTokenService {
  private static getSecret(): string {
    const secret =
      process.env.PAYMENT_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      process.env.CASHFREE_SECRET_KEY ||
      "kb_khata_secure_payment_salt_2026_production_key";
    return secret;
  }

  /**
   * Signs a CheckoutTokenPayload into a tamper-proof URL-safe token.
   * Default validity: 20 minutes from issuance.
   */
  static signCheckoutToken(
    payload: Omit<CheckoutTokenPayload, "issuedAt" | "expiresAt"> & {
      ttlSeconds?: number;
    }
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const ttl = payload.ttlSeconds || 1200; // 20 minutes

    const fullPayload: CheckoutTokenPayload = {
      orderId: payload.orderId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      amount: Math.round(payload.amount * 100) / 100,
      currency: payload.currency || "INR",
      orderType: payload.orderType || "ORDER",
      paymentSessionId: payload.paymentSessionId,
      gateway: payload.gateway || "CASHFREE",
      environment: payload.environment || "sandbox",
      returnUrl: payload.returnUrl,
      cancelUrl: payload.cancelUrl,
      notes: payload.notes,
      issuedAt: now,
      expiresAt: now + ttl,
    };

    const dataString = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.getSecret())
      .update(dataString)
      .digest("base64url");

    return `${dataString}.${signature}`;
  }

  /**
   * Verifies and decodes a checkout token.
   * Throws SecurityValidationError if invalid, tampered, or expired.
   */
  static verifyCheckoutToken(token: string): CheckoutTokenPayload {
    if (!token || typeof token !== "string") {
      throw new SecurityValidationError("Missing checkout security token.", "ERR_TOKEN_MISSING");
    }

    const parts = token.trim().split(".");
    if (parts.length !== 2) {
      throw new SecurityValidationError(
        "Malformed checkout security token structure.",
        "ERR_MALFORMED_TOKEN"
      );
    }

    const [dataString, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", this.getSecret())
      .update(dataString)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new SecurityValidationError(
        "Invalid checkout token signature. Unofficial or tampered request blocked.",
        "ERR_TOKEN_TAMPERED"
      );
    }

    let payload: CheckoutTokenPayload;
    try {
      const jsonStr = Buffer.from(dataString, "base64url").toString("utf8");
      payload = JSON.parse(jsonStr);
    } catch {
      throw new SecurityValidationError(
        "Failed to parse checkout token payload.",
        "ERR_PAYLOAD_PARSE"
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt && now > payload.expiresAt) {
      throw new SecurityValidationError(
        "Checkout session has expired. Please initiate a new payment.",
        "ERR_TOKEN_EXPIRED"
      );
    }

    if (!payload.orderId || !payload.amount || payload.amount <= 0) {
      throw new SecurityValidationError(
        "Invalid token parameters: orderId and positive amount are required.",
        "ERR_INVALID_PARAMETERS"
      );
    }

    return payload;
  }
}
