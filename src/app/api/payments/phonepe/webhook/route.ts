import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhonePeConfig, verifyWebhookChecksum } from "@/lib/phonepe";

export async function POST(req: NextRequest) {
  try {
    const config = getPhonePeConfig();
    const xVerify = req.headers.get("x-verify") || req.headers.get("X-VERIFY");

    const body = await req.json();
    const rawResponse = body.response;

    if (!rawResponse) {
      return NextResponse.json(
        { success: false, error: "Missing base64 response payload" },
        { status: 400 }
      );
    }

    // Checksum verification
    if (xVerify) {
      const isValid = verifyWebhookChecksum(rawResponse, xVerify, config.saltKey, config.saltIndex);
      if (!isValid && config.env !== "SANDBOX") {
        console.warn("Invalid PhonePe webhook checksum received:", xVerify);
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    // Decode Base64 payload
    const decodedString = Buffer.from(rawResponse, "base64").toString("utf-8");
    const payload = JSON.parse(decodedString);

    const { code, data } = payload;
    const merchantTxnId = data?.merchantTransactionId;
    const phonePeTransactionId = data?.transactionId;

    if (!merchantTxnId) {
      return NextResponse.json(
        { success: false, error: "Missing merchantTransactionId in payload" },
        { status: 400 }
      );
    }

    // Find the matching payment
    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId },
      include: { customer: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Matching payment transaction not found" },
        { status: 404 }
      );
    }

    // Idempotency check: if already processed, return success
    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Transaction already processed successfully",
      });
    }

    const isSuccess = code === "PAYMENT_SUCCESS" || payload.success === true;

    if (isSuccess) {
      // Execute atomic ledger update
      await prisma.$transaction(async (tx) => {
        // 1. Update Payment record
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            phonePeTransactionId: phonePeTransactionId || `PPREF_${Date.now()}`,
            phonePeResponseCode: code,
            rawGatewayResponse: payload,
          },
        });

        // 2. Decrement Customer currentBalance
        const updatedCustomer = await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            currentBalance: {
              decrement: payment.amount,
            },
          },
        });

        // 3. Create Ledger Entry (PAYMENT_CREDIT / Jama)
        await tx.ledgerEntry.create({
          data: {
            customerId: payment.customerId,
            orderId: payment.orderId,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: payment.amount,
            runningBalance: updatedCustomer.currentBalance,
            description: `PhonePe Online Payment received - Txn #${phonePeTransactionId || merchantTxnId}`,
          },
        });

        // 4. Update Order if attached
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: "SUCCESS",
            },
          });
        }

        // 5. System Audit Log
        await tx.systemAuditLog.create({
          data: {
            actor: "PHONEPE_WEBHOOK",
            action: "PAYMENT_CONFIRMED",
            metadata: {
              merchantTxnId,
              phonePeTransactionId,
              amount: Number(payment.amount),
              customerId: payment.customerId,
            },
          },
        });
      });
    } else {
      // Mark as FAILED
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          phonePeResponseCode: code,
          rawGatewayResponse: payload,
        },
      });
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: any) {
    console.error("PhonePe Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
