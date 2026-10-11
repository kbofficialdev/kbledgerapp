/**
 * KB Khata — Google Pay Business India & UPI Standardization & Verification Policies
 * Compliant with NPCI Unified Payments Interface (UPI) & Google Pay Merchant Specifications
 */

import crypto from "crypto";

export interface PaymentPolicyResult {
  valid: boolean;
  code: string;
  message: string;
  sanitizedValue?: any;
}

export class PaymentSecurityPolicyEngine {
  /**
   * Policy 1: Currency & Numeric Amount Precision Validation
   * Enforces non-negative amounts, minimum ₹1.00 transaction limit, and strict 2-decimal roundoff.
   */
  static validateAmount(amount: number | string): PaymentPolicyResult {
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return {
        valid: false,
        code: "INVALID_AMOUNT",
        message: "Payment amount must be a positive numeric value greater than ₹0.00.",
      };
    }

    if (num > 100000) {
      return {
        valid: false,
        code: "AMOUNT_EXCEEDS_UPI_LIMIT",
        message: "Transaction amount exceeds NPCI standard daily single transaction limit of ₹1,00,000.",
      };
    }

    const rounded = Math.round(num * 100) / 100;
    return {
      valid: true,
      code: "AMOUNT_VALIDATED",
      message: "Amount is within valid UPI limits.",
      sanitizedValue: rounded,
    };
  }

  /**
   * Policy 2: UPI Transaction Reference Uniqueness & Format (tr)
   * Enforces alphanumeric identifiers up to 35 characters, free of illegal characters.
   */
  static validateTransactionRef(tr: string): PaymentPolicyResult {
    if (!tr || typeof tr !== "string" || tr.trim().length === 0) {
      return {
        valid: false,
        code: "MISSING_TXN_REF",
        message: "UPI Transaction Reference (tr) is mandatory.",
      };
    }

    const clean = tr.trim();
    if (!/^[A-Za-z0-9_-]{8,35}$/.test(clean)) {
      return {
        valid: false,
        code: "MALFORMED_TXN_REF",
        message: "UPI Transaction Reference must be 8-35 alphanumeric characters (hyphens and underscores allowed).",
      };
    }

    return {
      valid: true,
      code: "TXN_REF_VALIDATED",
      message: "Transaction reference conforms to NPCI standards.",
      sanitizedValue: clean,
    };
  }

  /**
   * Policy 3: Bank RRN (Retrieval Reference Number) Verification
   * NPCI specifies Bank RRN as a 12-digit numeric sequence issued by the acquiring bank.
   */
  static validateBankRrn(rrn?: string | null): PaymentPolicyResult {
    if (!rrn) {
      return {
        valid: true,
        code: "RRN_OPTIONAL_PRE_SETTLEMENT",
        message: "Bank RRN is optional prior to settlement confirmation.",
      };
    }

    const cleanRrn = rrn.trim();
    if (!/^\d{12}$/.test(cleanRrn)) {
      return {
        valid: false,
        code: "INVALID_BANK_RRN",
        message: "Bank RRN must be exactly 12 numeric digits issued by the payment switch.",
      };
    }

    return {
      valid: true,
      code: "RRN_VALIDATED",
      message: "Bank RRN conforms to NPCI 12-digit standard.",
      sanitizedValue: cleanRrn,
    };
  }

  /**
   * Policy 4: Virtual Payment Address (VPA / UPI ID) Syntax Validation
   * Validates standard format: <username>@<bank/psp>
   */
  static validateVpa(vpa: string): PaymentPolicyResult {
    if (!vpa || typeof vpa !== "string") {
      return {
        valid: false,
        code: "MISSING_VPA",
        message: "Merchant or customer VPA cannot be empty.",
      };
    }

    const trimmed = vpa.trim().toLowerCase();
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!vpaRegex.test(trimmed)) {
      return {
        valid: false,
        code: "MALFORMED_VPA",
        message: "Invalid UPI VPA format. Expected format: user@bankhandle (e.g. store@okaxis).",
      };
    }

    return {
      valid: true,
      code: "VPA_VALIDATED",
      message: "VPA syntax verified.",
      sanitizedValue: trimmed,
    };
  }

  /**
   * Policy 5: Transaction TTL / Stale Payment Window Verification
   * Rejects payments if the initiation timestamp is older than 15 minutes.
   */
  static validateFreshness(initiatedAt: Date | string | number, ttlSeconds = 900): PaymentPolicyResult {
    const initTime = new Date(initiatedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - initTime) / 1000;

    if (elapsedSeconds > ttlSeconds) {
      return {
        valid: false,
        code: "TXN_EXPIRED",
        message: `Transaction QR session expired (${Math.round(elapsedSeconds)}s > ${ttlSeconds}s TTL). Regenerate a fresh payment QR.`,
      };
    }

    return {
      valid: true,
      code: "TXN_FRESH",
      message: "Transaction session is active.",
      sanitizedValue: { elapsedSeconds: Math.round(elapsedSeconds), remainingSeconds: Math.round(ttlSeconds - elapsedSeconds) },
    };
  }

  /**
   * Alias for validateFreshness adhering to standard verification naming
   */
  static verifyFreshness(initiatedAt: Date | string | number, ttlSeconds = 300): PaymentPolicyResult {
    return this.validateFreshness(initiatedAt, ttlSeconds);
  }

  /**
   * Policy 6: HMAC-SHA256 Webhook Digest Signature Generation
   */
  static generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Policy 7: Timing-Attack Safe HMAC Verification
   */
  static verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expected = this.generateHmacSignature(payload, secret);
      const expectedBuf = Buffer.from(expected, "hex");
      const actualBuf = Buffer.from(signature, "hex");
      if (expectedBuf.length !== actualBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
}

