import { PaymentSecurityPolicyEngine } from "../../src/lib/payment-policies";
import { CashfreeGatewayService } from "../../src/lib/cashfree";
import { TestResult, TestSuiteResult } from "../types";

export async function runPaymentPolicyTests(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  // Test 1: Amount Validation - Positive Valid Amount
  (() => {
    const start = performance.now();
    try {
      const res = PaymentSecurityPolicyEngine.validateAmount(500);
      if (!res.valid || res.sanitizedValue !== 500) {
        throw new Error(`Expected valid amount 500, got ${JSON.stringify(res)}`);
      }
      tests.push({
        name: "Validate positive amount (₹500.00)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Passed strict positive float check and normalized to 2 decimals.",
      });
    } catch (e: any) {
      tests.push({
        name: "Validate positive amount (₹500.00)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 2: Amount Validation - Rejection of Zero or Negative Amount
  (() => {
    const start = performance.now();
    try {
      const resZero = PaymentSecurityPolicyEngine.validateAmount(0);
      const resNeg = PaymentSecurityPolicyEngine.validateAmount(-50);
      if (resZero.valid || resNeg.valid) {
        throw new Error("Security policy failed: Allowed zero or negative payment amount!");
      }
      tests.push({
        name: "Reject zero and negative payment amounts",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Blocked non-positive amounts with policy error codes.",
      });
    } catch (e: any) {
      tests.push({
        name: "Reject zero and negative payment amounts",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 3: Amount Validation - Maximum NPCI UPI Retail Limit (₹1,00,000)
  (() => {
    const start = performance.now();
    try {
      const resOver = PaymentSecurityPolicyEngine.validateAmount(100001);
      if (resOver.valid) {
        throw new Error("Security policy failed: Allowed amount exceeding NPCI transaction ceiling!");
      }
      tests.push({
        name: "Enforce NPCI UPI retail ceiling (₹1,00,000)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Blocked ₹1,00,001 transaction exceeding statutory NPCI limit.",
      });
    } catch (e: any) {
      tests.push({
        name: "Enforce NPCI UPI retail ceiling (₹1,00,000)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 4: Bank RRN Format Validation - Strict 12-digit numeric
  (() => {
    const start = performance.now();
    try {
      const validRrn = PaymentSecurityPolicyEngine.validateBankRrn("101023231212");
      const shortRrn = PaymentSecurityPolicyEngine.validateBankRrn("12345");
      const alphaRrn = PaymentSecurityPolicyEngine.validateBankRrn("1010232312AB");
      if (!validRrn.valid || shortRrn.valid || alphaRrn.valid) {
        throw new Error("Bank RRN regex validation failed to enforce exact 12 numeric digits");
      }
      tests.push({
        name: "Enforce strict 12-digit numeric Bank RRN regex",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Regex ^\\d{12}$ successfully blocked alphabetic and truncated inputs.",
      });
    } catch (e: any) {
      tests.push({
        name: "Enforce strict 12-digit numeric Bank RRN regex",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 5: Freshness TTL Verification (300 seconds)
  (() => {
    const start = performance.now();
    try {
      const recentTimestamp = new Date(Date.now() - 30 * 1000).toISOString();
      const expiredTimestamp = new Date(Date.now() - 400 * 1000).toISOString();
      const freshRes = PaymentSecurityPolicyEngine.verifyFreshness(recentTimestamp, 300);
      const staleRes = PaymentSecurityPolicyEngine.verifyFreshness(expiredTimestamp, 300);
      if (!freshRes.valid || staleRes.valid) {
        throw new Error("Freshness TTL policy failed to invalidate stale transaction request");
      }
      tests.push({
        name: "Verify transaction freshness TTL (300s window)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Enforced anti-replay window: 30s accepted, 400s rejected.",
      });
    } catch (e: any) {
      tests.push({
        name: "Verify transaction freshness TTL (300s window)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 6: HMAC-SHA256 Signature Generation & Timing-Safe Verification
  (() => {
    const start = performance.now();
    try {
      const secret = "test_gpay_secret_key_2026";
      const payload = JSON.stringify({ txnId: "TXN_123", amount: 1000, status: "SUCCESS" });
      const sig = PaymentSecurityPolicyEngine.generateHmacSignature(payload, secret);
      const isValid = PaymentSecurityPolicyEngine.verifyHmacSignature(payload, sig, secret);
      const isTampered = PaymentSecurityPolicyEngine.verifyHmacSignature(payload + "tampered", sig, secret);
      if (!isValid || isTampered) {
        throw new Error("HMAC-SHA256 signature verification failed or accepted tampered payload");
      }
      tests.push({
        name: "HMAC-SHA256 timing-safe webhook signature verification",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "crypto.timingSafeEqual verified genuine digest and repelled byte tampering.",
      });
    } catch (e: any) {
      tests.push({
        name: "HMAC-SHA256 timing-safe webhook signature verification",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 7: Cashfree Gateway Configuration Integrity
  (() => {
    const start = performance.now();
    try {
      const cf = CashfreeGatewayService.getInstance();
      if (!cf.getAppId() || cf.getAppId() !== "2321580e485b8ada058705b82c851232") {
        throw new Error(`Expected Cashfree App ID 2321580e485b8ada058705b82c851232, got ${cf.getAppId()}`);
      }
      tests.push({
        name: "Verify official Cashfree Gateway Client ID (2321580e...1232)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Verified Cashfree sandbox gateway service instance and credentials.",
      });
    } catch (e: any) {
      tests.push({
        name: "Verify official Cashfree Gateway Client ID (2321580e...1232)",
        suite: "Payment Security Policies",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  const passed = tests.filter((t) => t.passed).length;
  return {
    suite: "Payment Security Policies",
    category: "UNIT",
    tests,
    passed,
    failed: tests.length - passed,
    totalDurationMs: performance.now() - suiteStart,
  };
}
