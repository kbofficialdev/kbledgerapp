import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPhonePeStatus } from "@/lib/phonepe";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merchantTxnId = params.id;

    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId },
      include: { customer: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // Call PhonePe status API
    const statusRes = await checkPhonePeStatus(merchantTxnId);

    // If verified success and still pending locally, reconcile!
    if (statusRes.success && statusRes.code === "PAYMENT_SUCCESS" && payment.status !== "SUCCESS") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            phonePeTransactionId: statusRes.data?.transactionId || `PP_SYNC_${Date.now()}`,
            phonePeResponseCode: statusRes.code,
            rawGatewayResponse: statusRes.data,
          },
        });

        const updatedCustomer = await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            currentBalance: { decrement: payment.amount },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            customerId: payment.customerId,
            orderId: payment.orderId,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: payment.amount,
            runningBalance: updatedCustomer.currentBalance,
            description: `PhonePe Reconciled Payment - Ref #${merchantTxnId}`,
          },
        });

        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "SUCCESS" },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      localStatus: payment.status,
      gatewayResponse: statusRes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

