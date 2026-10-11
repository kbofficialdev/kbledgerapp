import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPhonePeStatus } from "@/lib/phonepe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txnId = searchParams.get("txnId");
  const isSimulated = searchParams.get("simulated") === "true";

  if (!txnId) {
    return NextResponse.redirect(new URL("/payments?status=error", req.url));
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId: txnId },
      include: { customer: true },
    });

    if (!payment) {
      return NextResponse.redirect(new URL("/payments?status=not_found", req.url));
    }

    // In sandbox or simulated mode, mark successful and reconcile
    if (payment.status === "PENDING" && isSimulated) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            phonePeTransactionId: `SIM_PP_${Date.now()}`,
          },
        });

        const updatedCustomer = await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            currentBalance: {
              decrement: payment.amount,
            },
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
            description: `PhonePe Online Payment received - Ref #${txnId}`,
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

    return NextResponse.redirect(
      new URL(`/customers/${payment.customerId}?payment_success=${txnId}`, req.url)
    );
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.redirect(new URL("/payments?status=error", req.url));
  }
}
