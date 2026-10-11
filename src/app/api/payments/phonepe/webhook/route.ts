import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhonePeConfig, verifyWebhookChecksum } from "@/lib/phonepe";

export const dynamic = "force-dynamic";

/**
 * Health check / verification ping handler for Webhook validation
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "KB Khata PhonePe Webhook Service",
    endpoint: "/api/payments/phonepe/webhook",
    supportedAuth: ["SHA_BASIC_AUTH", "X_VERIFY_HMAC"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const config = getPhonePeConfig();

    // 1. Check HTTP Basic Authentication (if configured in PhonePe dashboard with SHA Username/Password)
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Basic ")) {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== config.webhookUser || password !== config.webhookPass) {
        console.warn("Invalid PhonePe webhook Basic Auth credentials:", username);
        return NextResponse.json(
          { success: false, error: "Unauthorized webhook caller" },
          { status: 401 }
        );
      }
    }

    // 2. Parse incoming payload
    const body = await req.json();
    let payload: any = null;

    if (body.response) {
      // Checksum verification if x-verify header provided
      const xVerify = req.headers.get("x-verify") || req.headers.get("X-VERIFY");
      if (xVerify) {
        const isValid = verifyWebhookChecksum(body.response, xVerify, config.saltKey, config.saltIndex);
        if (!isValid && config.env === "PRODUCTION") {
          console.warn("Invalid PhonePe webhook checksum signature:", xVerify);
          return NextResponse.json(
            { success: false, error: "Invalid webhook signature" },
            { status: 401 }
          );
        }
      }

      // Decode Base64 string
      const decodedString = Buffer.from(body.response, "base64").toString("utf-8");
      payload = JSON.parse(decodedString);
    } else {
      // Direct JSON webhook payload
      payload = body;
    }

    const event = payload.event || payload.code || "";
    const data = payload.data || payload.payload || payload;
    const merchantTxnId = data.merchantTransactionId || data.merchantTxnId || payload.merchantTransactionId;
    const phonePeTransactionId = data.transactionId || data.phonePeTransactionId || payload.transactionId;

    if (!merchantTxnId) {
      console.warn("PhonePe Webhook received without merchantTransactionId:", payload);
      return NextResponse.json(
        { success: false, error: "Missing merchantTransactionId" },
        { status: 400 }
      );
    }

    // 3. Find matching payment in database
    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId },
      include: { customer: true },
    });

    if (!payment) {
      console.warn(`Payment with merchantTxnId ${merchantTxnId} not found in database.`);
      return NextResponse.json(
        { success: false, error: "Payment transaction record not found" },
        { status: 404 }
      );
    }

    // Idempotency: if already SUCCESS, acknowledge HTTP 200 immediately
    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Transaction already processed successfully",
      });
    }

    // Determine success condition
    const isPaymentSuccess =
      payload.code === "PAYMENT_SUCCESS" ||
      payload.success === true ||
      event.toUpperCase().includes("SUCCESS") ||
      event.toUpperCase().includes("COMPLETED");

    if (isPaymentSuccess) {
      await prisma.$transaction(async (tx) => {
        // 1. Update Payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            phonePeTransactionId: phonePeTransactionId || `PP_${Date.now()}`,
            phonePeResponseCode: payload.code || "SUCCESS",
            rawGatewayResponse: payload,
          },
        });

        // 2. Decrement Customer currentBalance (Khata Udhaar)
        const updatedCustomer = await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            currentBalance: {
              decrement: payment.amount,
            },
          },
        });

        // 3. Create double-entry Ledger record (PAYMENT_CREDIT / Jama)
        await tx.ledgerEntry.create({
          data: {
            customerId: payment.customerId,
            orderId: payment.orderId,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: payment.amount,
            runningBalance: updatedCustomer.currentBalance,
            description: `PhonePe Online Payment confirmed - Txn #${phonePeTransactionId || merchantTxnId}`,
          },
        });

        // 4. Update attached Order if applicable
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: "SUCCESS",
            },
          });
        }

        // 5. System Audit Trail
        await tx.systemAuditLog.create({
          data: {
            actor: "PHONEPE_WEBHOOK",
            action: "WEBHOOK_PAYMENT_SUCCESS",
            metadata: {
              merchantTxnId,
              phonePeTransactionId,
              amount: Number(payment.amount),
              customerId: payment.customerId,
              customerName: payment.customer.name,
            },
          },
        });
      });
    } else {
      // Mark Failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          phonePeResponseCode: payload.code || "FAILED",
          rawGatewayResponse: payload,
        },
      });

      await prisma.systemAuditLog.create({
        data: {
          actor: "PHONEPE_WEBHOOK",
          action: "WEBHOOK_PAYMENT_FAILED",
          metadata: { merchantTxnId, payload },
        },
      });
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: any) {
    console.error("PhonePe Webhook processing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
