import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { authGuard } from "@/lib/auth";
import { settleCashfreePaymentRecord } from "@/lib/cashfree-reconcile";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const principal = await authGuard.resolvePrincipal(req);
    if (!principal.isAuthenticated()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const orderId = body.orderId || body.order_id;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required orderId or order_id parameter." },
        { status: 400 }
      );
    }

    // 1. Fetch live order details from Cashfree Gateway
    const cfOrder = await cashfreeGateway.getOrder(orderId);
    const cfPayments = await cashfreeGateway.getOrderPayments(orderId);

    const isPaid = cfOrder.order_status === "PAID";
    const successfulPayment =
      cfPayments.find((p) => p.payment_status === "SUCCESS") || cfPayments[0];

    // 2. Fetch existing Payment record from DB
    const existingPayment = await prisma.payment.findUnique({
      where: { cashfreeOrderId: orderId },
      include: {
        customer: true,
        order: { include: { items: true } },
      },
    });

    if (!existingPayment) {
      return NextResponse.json({
        success: true,
        verified: isPaid,
        orderStatus: cfOrder.order_status,
        orderAmount: cfOrder.order_amount,
        message: isPaid
          ? "Payment confirmed on Cashfree gateway."
          : `Order status is ${cfOrder.order_status}.`,
      });
    }

    // Idempotency: If already marked SUCCESS, return existing verified status
    if (existingPayment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        verified: true,
        payment: existingPayment,
        order: existingPayment.order || null,
        orderStatus: "PAID",
        message: "Payment already verified and credited.",
      });
    }

    // 3. If Cashfree confirms payment was successful, atomically settle via unified Cashfree Reconciler
    //    (Handles both Counter Billing Drafts and Debt Clearance idempotently)
    let settlementResult: any = null;
    if (isPaid) {
      settlementResult = await settleCashfreePaymentRecord({
        cfOrderId: orderId,
        cfPaymentId: successfulPayment?.cf_payment_id
          ? String(successfulPayment.cf_payment_id)
          : undefined,
        bankRrn: successfulPayment?.bank_reference || undefined,
        gatewayPayload: (successfulPayment as any) || (cfOrder as any),
        sourceNote: `Cashfree Payment (${orderId}) — Online Collection`,
      });
    }

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: existingPayment.id },
      include: { order: { include: { items: true } } },
    });

    return NextResponse.json({
      success: true,
      verified: isPaid,
      orderStatus: cfOrder.order_status,
      orderAmount: cfOrder.order_amount,
      payment: updatedPayment,
      order: settlementResult?.order || updatedPayment?.order || null,
      paymentDetails: successfulPayment || null,
      message: isPaid
        ? "Payment confirmed on Cashfree gateway."
        : `Order status: ${cfOrder.order_status}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify payment status.") },
      { status: 500 }
    );
  }
}
