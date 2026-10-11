import crypto from "crypto";
import QRCode from "qrcode";
import { PaymentSecurityPolicyEngine } from "./payment-policies";

export interface GPayConfig {
  merchantVpa: string;
  merchantName: string;
  merchantCode: string; // MCC
  webhookSecret: string;
  appUrl: string;
  env: string;
}

export function getGPayConfig(): GPayConfig {
  return {
    merchantVpa: process.env.GPAY_MERCHANT_VPA || "kbfashions.eazypay@icici",
    merchantName: process.env.GPAY_MERCHANT_NAME || "KB Khata Store",
    merchantCode: process.env.GPAY_MERCHANT_CODE || "5411", // Retail / Grocery MCC
    webhookSecret: process.env.GPAY_WEBHOOK_SECRET || "kb_gpay_webhook_secret_2026",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    env: process.env.GPAY_ENV || "TEST",
  };
}

export interface GPayIntentPayload {
  amount: number;
  note: string;
  customerName?: string;
  customerMobile?: string;
  orderNumber?: string;
  customTxnId?: string;
}

export interface GPayIntentResult {
  merchantTxnId: string;
  upiRefId: string; // tr
  amount: number;
  upiUri: string;
  tezUri: string;
  webPayUrl: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  merchantVpa: string;
  merchantName: string;
}

/**
 * Creates Google Pay Business India UPI Intent and Dynamic QR payload
 */
export async function createGPayPaymentIntent({
  amount,
  note,
  customerName,
  customerMobile,
  orderNumber,
  customTxnId,
}: GPayIntentPayload): Promise<GPayIntentResult> {
  const config = getGPayConfig();

  // Validate amount with security policy
  const amountCheck = PaymentSecurityPolicyEngine.validateAmount(amount);
  if (!amountCheck.valid) {
    throw new Error(amountCheck.message);
  }
  const cleanAmount = amountCheck.sanitizedValue;

  // Generate unique transaction reference (tr) conforming to policy
  const merchantTxnId = customTxnId || `GPAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const upiRefId = `TR_${merchantTxnId.replace(/[^A-Za-z0-9]/g, "").slice(-28)}`;

  const refCheck = PaymentSecurityPolicyEngine.validateTransactionRef(upiRefId);
  if (!refCheck.valid) {
    throw new Error(refCheck.message);
  }

  // Construct NPCI Standard UPI query parameters
  const params = new URLSearchParams();
  params.set("pa", config.merchantVpa);
  params.set("pn", config.merchantName);
  params.set("mc", config.merchantCode);
  params.set("tr", upiRefId);
  params.set("tn", note || `Payment for ${orderNumber || "Bill"}`);
  params.set("am", cleanAmount.toFixed(2));
  params.set("cu", "INR");

  const queryString = params.toString();
  const upiUri = `upi://pay?${queryString}`;
  const tezUri = `tez://upi/pay?${queryString}`;
  const webPayUrl = `https://tez.google.com/pay?${queryString}`;

  // Generate Dynamic QR Code image
  const qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
    width: 320,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min TTL

  return {
    merchantTxnId,
    upiRefId,
    amount: cleanAmount,
    upiUri,
    tezUri,
    webPayUrl,
    qrCodeDataUrl,
    expiresAt,
    merchantVpa: config.merchantVpa,
    merchantName: config.merchantName,
  };
}

/**
 * Validates Google Pay Webhook HMAC-SHA256 signature
 */
export function verifyGPayWebhookSignature(payloadString: string, signature: string, secret?: string): boolean {
  const webhookSecret = secret || getGPayConfig().webhookSecret;
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadString)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

