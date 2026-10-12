import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { authGuard } from "@/lib/auth";
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
    const cfPaymentId = body.cfPaymentId || body.cf_payment_id || body.paymentId;

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
    const successfulPayment = cfPayments.find((p) => p.payment_status === "SUCCESS") || cfPayments[0];

    // 2. Fetch existing Payment record from DB
    const existingPayment = await prisma.payment.findUnique({
      where: { cashfreeOrderId: orderId },
      include: {
        customer: true,
        order: true,
      },
    });

    if (!existingPayment) {
      return NextResponse.json({
        success: true,
        verified: isPaid,
        orderStatus: cfOrder.order_status,
        orderAmount: cfOrder.order_amount,
        message: isPaid ? "Payment confirmed on Cashfree gateway." : `Order status is ${cfOrder.order_status}.`,
      });
    }

    // Idempotency: If already marked SUCCESS, return existing verified status
    if (existingPayment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        verified: true,
        payment: existingPayment,
        orderStatus: "PAID",
        message: "Payment already verified and credited.",
      });
    }

    // If Cashfree confirms payment was successful, atomically update database
    if (isPaid) {
      const payAmount = Number(existingPayment.amount);
      const customerId = existingPayment.customerId;

      await prisma.$transaction(async (tx) => {
        // A. Update Payment Record
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "SUCCESS",
            cashfreePaymentId: successfulPayment?.cf_payment_id ? String(successfulPayment.cf_payment_id) : undefined,
            bankRrn: successfulPayment?.bank_reference || undefined,
            gatewayResponseCode: "SUCCESS",
            rawGatewayResponse: (successfulPayment as any) || (cfOrder as any),
            paidAt: new Date(),
          },
        });

        // B. If attached to an Order, reconcile order payment
        if (existingPayment.orderId) {
          const order = await tx.order.findUnique({
            where: { id: existingPayment.orderId },
          });

          if (order) {
            const newPaid = Number(order.paidAmount) + payAmount;
            const newCredit = Math.max(0, Number(order.totalAmount) - newPaid);
            await tx.order.update({
              where: { id: order.id },
              data: {
                paidAmount: newPaid,
                creditAmount: newCredit,
                paymentStatus: newCredit <= 0 ? "SUCCESS" : "PENDING",
              },
            });
          }
        }

        // C. Update Customer Balance & Add Ledger Entry
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (customer) {
          const currentBal = Number(customer.currentBalance);
          const newBal = currentBal - payAmount; // Paying reduces debt (Udhaar)

          await tx.customer.update({
            where: { id: customer.id },
            data: { currentBalance: newBal },
          });

          await tx.ledgerEntry.create({
            data: {
              customerId: customer.id,
              orderId: existingPayment.orderId || null,
              entryType: "PAYMENT_CREDIT",
              debitAmount: 0.0,
              creditAmount: payAmount,
              runningBalance: newBal,
              description: `Cashfree Payment (${orderId}) — Online Collection`,
            },
          });
        }
      });
    }

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: existingPayment.id },
    });

    return NextResponse.json({
      success: true,
      verified: isPaid,
      orderStatus: cfOrder.order_status,
      orderAmount: cfOrder.order_amount,
      payment: updatedPayment,
      paymentDetails: successfulPayment || null,
      message: isPaid ? "Payment confirmed on Cashfree gateway." : `Order status: ${cfOrder.order_status}`,
    });
  } catch (error: any) {
    console.error("[Cashfree Verify Error]:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify payment status.") },
      { status: 500 }
    );
  }
}

