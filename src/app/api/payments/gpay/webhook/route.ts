import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGPayWebhookSignature, getGPayConfig } from "@/lib/gpay";
import { PaymentSecurityPolicyEngine } from "@/lib/payment-policies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-gpay-signature") || req.headers.get("x-signature") || "";
    const timestampHeader = req.headers.get("x-gpay-timestamp") || req.headers.get("x-timestamp");

    // 1. Validate Freshness (if timestamp header is present)
    if (timestampHeader) {
      const freshness = PaymentSecurityPolicyEngine.validateFreshness(timestampHeader, 300);
      if (!freshness.valid) {
        return NextResponse.json(
          { success: false, error: "Stale webhook request rejected" },
          { status: 400 }
        );
      }
    }

    // 2. In production or when webhook secret is configured, verify HMAC signature
    const config = getGPayConfig();
    if (signature && config.webhookSecret) {
      const isValid = verifyGPayWebhookSignature(rawBody, signature, config.webhookSecret);
      if (!isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "Invalid webhook HMAC signature" },
          { status: 401 }
        );
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const {
      event,
      merchantTxnId,
      upiRefId,
      bankRrn,
      payerVpa,
      gpayTransactionId,
      amount,
      status,
    } = payload;

    // We only process successful payment completions
    const isSuccess =
      status === "SUCCESS" ||
      event === "PAYMENT_SUCCESS" ||
      event === "TRANSACTION_COMPLETED";

    if (!isSuccess) {
      return NextResponse.json({
        success: true,
        message: "Ignored non-success event",
        status: "IGNORED",
      });
    }

    // Lookup pending payment record
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          merchantTxnId ? { merchantTxnId } : undefined,
          upiRefId ? { upiRefId } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!payment) {
      return NextResponse.json({
        success: true,
        message: "Transaction not registered in local database",
        status: "UNMATCHED",
      });
    }

    // Idempotency check: Already processed
    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Transaction already processed (Idempotent)",
        status: "ALREADY_COMPLETED",
      });
    }

    // Execute atomic settlement
    const payAmount = Number(payment.amount);
    const targetCustomerId = payment.customerId;

    await prisma.$transaction(async (tx) => {
      // Update Payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          method: "GOOGLE_PAY_UPI",
          bankRrn: bankRrn || payment.bankRrn || `RRN${Date.now().toString().slice(-8)}`,
          payerVpa: payerVpa || payment.payerVpa || null,
          gpayTransactionId: gpayTransactionId || payment.gpayTransactionId || `GP-${Date.now()}`,
          gatewayResponseCode: "SUCCESS",
          rawGatewayResponse: payload,
          paidAt: new Date(),
        },
      });

      // Update Customer Balance
      const updatedCustomer = await tx.customer.update({
        where: { id: targetCustomerId },
        data: {
          currentBalance: {
            decrement: payAmount,
          },
        },
      });

      // Insert Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          customerId: targetCustomerId,
          orderId: payment.orderId || null,
          entryType: "PAYMENT_CREDIT",
          debitAmount: 0,
          creditAmount: payAmount,
          runningBalance: updatedCustomer.currentBalance,
          description: `Google Pay Webhook Settlement - Ref #${updatedPayment.paymentRef} [RRN: ${updatedPayment.bankRrn}]`,
        },
      });

      // Update Order if attached
      if (payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "SUCCESS",
          },
        });
      }

      // Audit Log
      await tx.systemAuditLog.create({
        data: {
          actor: "GPAY_WEBHOOK",
          action: "WEBHOOK_PAYMENT_CONFIRMED",
          metadata: {
            paymentId: updatedPayment.id,
            merchantTxnId: updatedPayment.merchantTxnId,
            bankRrn: updatedPayment.bankRrn,
            amount: payAmount,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed and payment ledger credited successfully",
      status: "SUCCESS",
    });
  } catch (error: any) {
    console.error("Error processing Google Pay webhook:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failure" },
      { status: 500 }
    );
  }
}

