import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { executeAcidPaymentSettlement } from "@/lib/acid-ledger";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    // In sandbox test, verify signature if present
    if (signature && timestamp) {
      const isValid = cashfreeGateway.verifyWebhookSignature(rawBody, timestamp, signature);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature." },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event;
    const orderData = payload.data?.order || payload.order;
    const paymentData = payload.data?.payment || payload.payment;

    const cfOrderId = orderData?.order_id || payload.order_id;

    if (!cfOrderId) {
      return NextResponse.json({ status: "IGNORED", reason: "Missing order_id" }, { status: 200 });
    }

    // Process PAYMENT_SUCCESS_WEBHOOK or success event via ACID Ledger Engine
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentData?.payment_status === "SUCCESS") {
      const existingPayment = await prisma.payment.findUnique({
        where: { cashfreeOrderId: cfOrderId },
      });

      if (existingPayment && existingPayment.status !== "SUCCESS") {
        await executeAcidPaymentSettlement({
          customerId: existingPayment.customerId,
          orderId: existingPayment.orderId || null,
          amount: Number(existingPayment.amount),
          method: "CASHFREE_ELEMENTS",
          cashfreeOrderId: cfOrderId,
          cashfreePaymentId: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
          bankRrn: paymentData?.bank_reference || undefined,
          rawGatewayResponse: payload,
          notes: `Cashfree Webhook Confirmation (${cfOrderId})`,
        });
      }
    }

    return NextResponse.json({ status: "OK", received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Cashfree Webhook Error]:", error);
    return NextResponse.json(
      { status: "ERROR", error: sanitizeApiError(error, "Failed to process webhook event.") },
      { status: 500 }
    );
  }
}

