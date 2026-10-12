import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
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

    // Process PAYMENT_SUCCESS_WEBHOOK or success event
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentData?.payment_status === "SUCCESS") {
      const existingPayment = await prisma.payment.findUnique({
        where: { cashfreeOrderId: cfOrderId },
      });

      if (existingPayment && existingPayment.status !== "SUCCESS") {
        const payAmount = Number(existingPayment.amount);

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: "SUCCESS",
              cashfreePaymentId: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
              bankRrn: paymentData?.bank_reference || undefined,
              gatewayResponseCode: "SUCCESS",
              rawGatewayResponse: payload,
              paidAt: new Date(),
            },
          });

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

          const customer = await tx.customer.findUnique({
            where: { id: existingPayment.customerId },
          });

          if (customer) {
            const currentBal = Number(customer.currentBalance);
            const newBal = currentBal - payAmount;
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
                description: `Cashfree Webhook Confirmation (${cfOrderId})`,
              },
            });
          }
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

