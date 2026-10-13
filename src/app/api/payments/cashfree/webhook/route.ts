import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { executeAcidPaymentSettlement, executeAcidOrderCreation } from "@/lib/acid-ledger";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Helper to atomically reconcile a Cashfree order into the PostgreSQL ACID Ledger
 * Handles both Debt Clearance (FIFO order credit settlement) and Counter Billing Drafts
 * even if the customer closed the browser or lost network connectivity midway.
 */
async function settleWebhookPaymentRecord(params: {
  cfOrderId: string;
  cfPaymentId?: string;
  bankRrn?: string;
  gatewayPayload?: any;
  sourceNote?: string;
}) {
  const existingPayment = await prisma.payment.findUnique({
    where: { cashfreeOrderId: params.cfOrderId },
  });

  if (!existingPayment) {
    return { settled: false, reason: "No matching local payment record" };
  }

  if (existingPayment.status === "SUCCESS") {
    return { settled: true, alreadySettled: true, payment: existingPayment };
  }

  const meta =
    existingPayment.rawGatewayResponse && typeof existingPayment.rawGatewayResponse === "object"
      ? (existingPayment.rawGatewayResponse as Record<string, any>)
      : {};

  // Case A: Counter Billing Draft stored at create-order time, where customer/admin closed tab midway
  if (meta.billingDraft && !existingPayment.orderId && meta.billingDraft.items?.length > 0) {
    const draft = meta.billingDraft;
    const orderNumber = `KB-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const acidOrder = await executeAcidOrderCreation({
      villageId: draft.villageId,
      customerId: existingPayment.customerId,
      orderNumber,
      items: draft.items,
      paymentType: draft.paymentType || "DEBIT",
      paidAmount: Number(existingPayment.amount),
      paymentMethod: "CASHFREE_ELEMENTS",
      cashfreeOrderId: params.cfOrderId,
      cashfreePaymentId: params.cfPaymentId,
      notes: draft.notes || params.sourceNote || `Cashfree Webhook Order (${params.cfOrderId})`,
    });
    return { settled: true, orderCreated: acidOrder.order, newBalance: acidOrder.newBalance };
  }

  // Case B: Standard Debt / Order Settlement via Serializable ACID Savepoint Engine
  const acidResult = await executeAcidPaymentSettlement({
    customerId: existingPayment.customerId,
    orderId: existingPayment.orderId || null,
    amount: Number(existingPayment.amount),
    method: "CASHFREE_ELEMENTS",
    cashfreeOrderId: params.cfOrderId,
    cashfreePaymentId: params.cfPaymentId,
    bankRrn: params.bankRrn,
    rawGatewayResponse: {
      ...meta,
      webhookSettledAt: new Date().toISOString(),
      gatewayEvent: params.gatewayPayload || null,
    },
    notes: params.sourceNote || `Cashfree Webhook Settlement (${params.cfOrderId})`,
  });

  return {
    settled: true,
    payment: acidResult.payment,
    balanceBefore: acidResult.balanceBefore,
    balanceAfter: acidResult.balanceAfter,
    orderAllocations: acidResult.allocations,
  };
}

/**
 * POST /api/payments/cashfree/webhook
 * Receives signed Cashfree Webhook events (PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK,
 * PAYMENT_USER_DROPPED_WEBHOOK) as well as midway-drop recovery checks.
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
      const result = await settleWebhookPaymentRecord({
        cfOrderId,
        cfPaymentId: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
        bankRrn: paymentData?.bank_reference || undefined,
        gatewayPayload: payload,
        sourceNote: `Cashfree Webhook Confirmation (${cfOrderId})`,
      });

      return NextResponse.json(
        { status: "OK", received: true, eventType, reconciled: result.settled },
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
          await settleWebhookPaymentRecord({
            cfOrderId,
            cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
            bankRrn: winPay?.bank_reference || undefined,
            gatewayPayload: payload,
            sourceNote: `Cashfree Webhook Recovery after Midway Drop (${cfOrderId})`,
          });
          return NextResponse.json(
            { status: "OK", received: true, recoveredPaidOrder: true },
            { status: 200 }
          );
        }

        const isDropped =
          eventType === "PAYMENT_USER_DROPPED_WEBHOOK" ||
          paymentData?.payment_status === "USER_DROPPED";

        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "FAILED",
            notes: isDropped
              ? `Customer exited checkout midway (${cfOrderId}) — Ledger unchanged`
              : `Payment attempt failed on gateway (${cfOrderId}) — Ledger unchanged`,
            rawGatewayResponse: payload,
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
        const settled = await settleWebhookPaymentRecord({
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
      });

      if (localPayment?.status === "SUCCESS") {
        return NextResponse.json({
          success: true,
          verified: true,
          orderStatus: "PAID",
          payment: localPayment,
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
        const res = await settleWebhookPaymentRecord({
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
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: "PENDING",
          cashfreeOrderId: { not: null },
        },
        orderBy: { paidAt: "desc" },
        take: 15,
      });

      let settledCount = 0;
      let expiredCount = 0;

      for (const p of pendingPayments) {
        if (!p.cashfreeOrderId) continue;
        const cfOrder = await cashfreeGateway.getOrder(p.cashfreeOrderId).catch(() => null);
        if (!cfOrder) continue;

        if (cfOrder.order_status === "PAID") {
          const cfPayments = await cashfreeGateway
            .getOrderPayments(p.cashfreeOrderId)
            .catch(() => []);
          const winPay = cfPayments.find((pay) => pay.payment_status === "SUCCESS") || cfPayments[0];
          await settleWebhookPaymentRecord({
            cfOrderId: p.cashfreeOrderId,
            cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
            bankRrn: winPay?.bank_reference || undefined,
            gatewayPayload: cfOrder,
            sourceNote: `Background Webhook Recovery (${p.cashfreeOrderId})`,
          });
          settledCount++;
        } else if (cfOrder.order_status === "EXPIRED" || cfOrder.order_status === "TERMINATED") {
          await prisma.payment.update({
            where: { id: p.id },
            data: {
              status: "FAILED",
              notes: `Session ${cfOrder.order_status} after customer left midway (${p.cashfreeOrderId})`,
            },
          });
          expiredCount++;
        }
      }

      return NextResponse.json({
        success: true,
        checked: pendingPayments.length,
        settledCount,
        expiredCount,
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
