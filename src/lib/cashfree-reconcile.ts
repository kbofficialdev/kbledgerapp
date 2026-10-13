import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { executeAcidOrderCreation, executeAcidPaymentSettlement } from "@/lib/acid-ledger";

let lastReconcileTime = 0;
let activeReconcilePromise: Promise<{
  checked: number;
  settledCount: number;
  expiredCount: number;
}> | null = null;

/**
 * Atomically settles a verified Cashfree order into PostgreSQL ACID Ledger.
 * Handles both Counter Billing Drafts (creates Order + OrderItems + BILL_DEBIT + PAYMENT_CREDIT)
 * and Debt Clearance (FIFO order allocation + PAYMENT_CREDIT + balance reduction),
 * even if the customer or admin closed the browser midway.
 */
export async function settleCashfreePaymentRecord(params: {
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

  const meta =
    existingPayment.rawGatewayResponse && typeof existingPayment.rawGatewayResponse === "object"
      ? (existingPayment.rawGatewayResponse as Record<string, any>)
      : {};

  // If already settled, return existing order & payment idempotently
  if (existingPayment.status === "SUCCESS") {
    let existingOrder = null;
    if (existingPayment.orderId) {
      existingOrder = await prisma.order
        .findUnique({
          where: { id: existingPayment.orderId },
          include: { items: true },
        })
        .catch(() => null);
    }
    return {
      settled: true,
      alreadySettled: true,
      payment: existingPayment,
      order: existingOrder,
    };
  }

  // Case A: Counter Billing Draft stored at create-order time
  const draft = meta.billingDraft || meta.orderMeta?.billingDraft || null;
  if (draft && !existingPayment.orderId && Array.isArray(draft.items) && draft.items.length > 0) {
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
      bankRrn: params.bankRrn,
      notes: draft.notes || params.sourceNote || `Cashfree Online Bill (${params.cfOrderId})`,
    });

    return {
      settled: true,
      orderCreated: acidOrder.order,
      order: acidOrder.order,
      payment: acidOrder.paymentRecord,
      newBalance: acidOrder.newBalance,
    };
  }

  // Case B: Standard Debt / Order Settlement via Serializable ACID Savepoint Engine
  const selectedOrderIds = Array.isArray(meta.selectedOrderIds) ? meta.selectedOrderIds : [];
  const acidResult = await executeAcidPaymentSettlement({
    customerId: existingPayment.customerId,
    orderId: existingPayment.orderId || null,
    orderIds: selectedOrderIds,
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
    notes: params.sourceNote || existingPayment.notes || `Cashfree Settlement (${params.cfOrderId})`,
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
 * Automatically sweeps any PENDING Cashfree payments in PostgreSQL and verifies their live
 * status against Cashfree Gateway. If PAID, atomically settles them into the Ledger & Orders.
 */
export async function reconcilePendingCashfreePayments(force = false) {
  const now = Date.now();
  if (!force && now - lastReconcileTime < 2500) {
    if (activeReconcilePromise) return activeReconcilePromise;
    return { checked: 0, settledCount: 0, expiredCount: 0 };
  }

  if (activeReconcilePromise) {
    return activeReconcilePromise;
  }

  lastReconcileTime = now;
  activeReconcilePromise = (async () => {
    try {
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: "PENDING",
          cashfreeOrderId: { not: null },
        },
        orderBy: { paidAt: "desc" },
        take: 15,
      });

      if (pendingPayments.length === 0) {
        return { checked: 0, settledCount: 0, expiredCount: 0 };
      }

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
          const winPay =
            cfPayments.find((pay) => pay.payment_status === "SUCCESS") || cfPayments[0];
          await settleCashfreePaymentRecord({
            cfOrderId: p.cashfreeOrderId,
            cfPaymentId: winPay?.cf_payment_id ? String(winPay.cf_payment_id) : undefined,
            bankRrn: winPay?.bank_reference || undefined,
            gatewayPayload: cfOrder,
            sourceNote: `Cashfree Auto-Reconciliation (${p.cashfreeOrderId})`,
          });
          settledCount++;
        } else if (cfOrder.order_status === "EXPIRED" || cfOrder.order_status === "TERMINATED") {
          await prisma.payment.update({
            where: { id: p.id },
            data: {
              status: "FAILED",
              notes: `Session ${cfOrder.order_status} without completion (${p.cashfreeOrderId})`,
            },
          });
          expiredCount++;
        }
      }

      return {
        checked: pendingPayments.length,
        settledCount,
        expiredCount,
      };
    } catch {
      return { checked: 0, settledCount: 0, expiredCount: 0 };
    } finally {
      activeReconcilePromise = null;
    }
  })();

  return activeReconcilePromise;
}

