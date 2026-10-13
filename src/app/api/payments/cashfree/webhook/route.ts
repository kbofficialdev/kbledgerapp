import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import {
  settleCashfreePaymentRecord,
  reconcilePendingCashfreePayments,
} from "@/lib/cashfree-reconcile";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/cashfree/webhook
 * Receives signed Cashfree Webhook events (PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK,
 * PAYMENT_USER_DROPPED_WEBHOOK) as well as client midway-drop recovery checks.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    // Verify cryptographic HMAC-SHA256 webhook signature when present
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
    const eventType = payload.type || payload.event || "WEBHOOK_EVENT";
    const orderData = payload.data?.order || payload.order;
    const paymentData = payload.data?.payment || payload.payment;
    const cfOrderId = orderData?.order_id || payload.order_id || payload.orderId;

    if (!cfOrderId) {
      return NextResponse.json({ status: "IGNORED", reason: "Missing order_id" }, { status: 200 });
    }

    // 1. Handle PAYMENT_SUCCESS_WEBHOOK
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentData?.payment_status === "SUCCESS") {
      const result = await settleCashfreePaymentRecord({
        cfOrderId,
        cfPaymentId: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
        bankRrn: paymentData?.bank_reference || undefined,
        gatewayPayload: payload,
        sourceNote: `Cashfree Webhook Confirmation (${cfOrderId})`,
      });

      return NextResponse.json(
        {
          status: "OK",
          received: true,
          eventType,
          reconciled: result.settled,
          order: result.order || null,
        },
        { status: 200 }
      );
    }

    // 2. Handle PAYMENT_USER_DROPPED_WEBHOOK or PAYMENT_FAILED_WEBHOOK
    if (
      eventType === "PAYMENT_USER_DROPPED_WEBHOOK" ||
      eventType === "PAYMENT_FAILED_WEBHOOK" ||
      paymentData?.payment_status === "USER_DROPPED" ||
      paymentData?.payment_status === "FAILED"
    ) {
      const existingPayment = await prisma.payment.findUnique({
        where: { cashfreeOrderId: cfOrderId },
      });

      if (existingPayment && existingPayment.status === "PENDING") {
        // Before marking failed on midway drop, verify directly with Cashfree in case another attempt succeeded
        const cfOrder = await cashfreeGateway.getOrder(cfOrderId).catch(() => null);
        if (cfOrder && cfOrder.order_status === "PAID") {
          const cfPayments = await cashfreeGateway.getOrderPayments(cfOrderId).catch(() => []);
          const winPay = cfPayments.find((p) => p.payment_status === "SUCCESS") || cfPayments[0];
          const rec = await settleCashfreePaymentRecord({
            cfOrderId,
            cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
            bankRrn: winPay?.bank_reference || undefined,
            gatewayPayload: payload,
            sourceNote: `Cashfree Webhook Recovery after Midway Drop (${cfOrderId})`,
          });
          return NextResponse.json(
            {
              status: "OK",
              received: true,
              recoveredPaidOrder: true,
              order: rec.order || null,
            },
            { status: 200 }
          );
        }

        const isDropped =
          eventType === "PAYMENT_USER_DROPPED_WEBHOOK" ||
          paymentData?.payment_status === "USER_DROPPED";

        const prevMeta =
          existingPayment.rawGatewayResponse &&
          typeof existingPayment.rawGatewayResponse === "object"
            ? (existingPayment.rawGatewayResponse as Record<string, any>)
            : {};

        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "FAILED",
            notes: isDropped
              ? `Customer exited checkout midway (${cfOrderId}) — Ledger unchanged`
              : `Payment attempt failed on gateway (${cfOrderId}) — Ledger unchanged`,
            rawGatewayResponse: {
              ...prevMeta,
              failedPayload: payload,
            },
          },
        });
      }

      return NextResponse.json({ status: "OK", received: true, eventType }, { status: 200 });
    }

    // 3. Handle Client Midway Drop / Network Reconnect Synchronization
    if (eventType === "CLIENT_MIDWAY_SYNC" || eventType === "VERIFY_WEBHOOK_STATE") {
      const cfOrder = await cashfreeGateway.getOrder(cfOrderId).catch(() => null);
      if (cfOrder && cfOrder.order_status === "PAID") {
        const cfPayments = await cashfreeGateway.getOrderPayments(cfOrderId).catch(() => []);
        const winPay = cfPayments.find((p) => p.payment_status === "SUCCESS") || cfPayments[0];
        const settled = await settleCashfreePaymentRecord({
          cfOrderId,
          cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
          bankRrn: winPay?.bank_reference || undefined,
          gatewayPayload: cfOrder,
          sourceNote: `Cashfree Webhook Auto-Sync (${cfOrderId})`,
        });
        return NextResponse.json({
          status: "OK",
          orderStatus: "PAID",
          verified: true,
          settled: settled.settled,
          order: settled.order || null,
        });
      }
      return NextResponse.json({
        status: "OK",
        orderStatus: cfOrder?.order_status || "ACTIVE",
        verified: false,
      });
    }

    return NextResponse.json({ status: "OK", received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { status: "ERROR", error: sanitizeApiError(error, "Failed to process webhook event.") },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/cashfree/webhook
 * 1) ?orderId=CF_... -> Checks live webhook & gateway settlement status for a specific order
 * 2) ?reconcilePending=true -> Automatically sweeps & reconciles any PENDING Cashfree payments
 *    that were interrupted by midway customer exit, browser close, or network failure.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || searchParams.get("order_id");
    const reconcilePending = searchParams.get("reconcilePending") === "true";

    if (orderId) {
      const localPayment = await prisma.payment.findUnique({
        where: { cashfreeOrderId: orderId },
        include: { order: { include: { items: true } } },
      });

      if (localPayment?.status === "SUCCESS") {
        return NextResponse.json({
          success: true,
          verified: true,
          orderStatus: "PAID",
          payment: localPayment,
          order: localPayment.order || null,
        });
      }

      const cfOrder = await cashfreeGateway.getOrder(orderId).catch(() => null);
      if (!cfOrder) {
        return NextResponse.json({
          success: true,
          verified: false,
          orderStatus: localPayment?.status || "ACTIVE",
        });
      }

      if (cfOrder.order_status === "PAID") {
        const cfPayments = await cashfreeGateway.getOrderPayments(orderId).catch(() => []);
        const winPay = cfPayments.find((p) => p.payment_status === "SUCCESS") || cfPayments[0];
        const res = await settleCashfreePaymentRecord({
          cfOrderId: orderId,
          cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
          bankRrn: winPay?.bank_reference || undefined,
          gatewayPayload: cfOrder,
          sourceNote: `Cashfree Webhook Sync (${orderId})`,
        });
        return NextResponse.json({
          success: true,
          verified: true,
          orderStatus: "PAID",
          payment: res.payment || localPayment,
          order: res.order || null,
          paymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
        });
      }

      if (cfOrder.order_status === "EXPIRED" || cfOrder.order_status === "TERMINATED") {
        if (localPayment && localPayment.status === "PENDING") {
          await prisma.payment.update({
            where: { id: localPayment.id },
            data: {
              status: "FAILED",
              notes: `Order ${cfOrder.order_status} without payment (${orderId})`,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        verified: false,
        orderStatus: cfOrder.order_status,
      });
    }

    if (reconcilePending) {
      const summary = await reconcilePendingCashfreePayments(true);
      return NextResponse.json({
        success: true,
        ...summary,
      });
    }

    return NextResponse.json({ success: true, status: "WEBHOOK_ACTIVE" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Webhook status check failed.") },
      { status: 500 }
    );
  }
}
