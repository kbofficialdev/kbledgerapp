import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentSecurityPolicyEngine } from "@/lib/payment-policies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      merchantTxnId,
      upiRefId,
      paymentRef,
      bankRrn,
      payerVpa,
      gpayTransactionId,
      customerId,
      orderId,
      amount,
      notes,
    } = body;

    // Validate Bank RRN if provided
    if (bankRrn) {
      const rrnCheck = PaymentSecurityPolicyEngine.validateBankRrn(bankRrn);
      if (!rrnCheck.valid) {
        return NextResponse.json(
          { success: false, error: rrnCheck.message },
          { status: 400 }
        );
      }
    }

    // 1. Find existing payment by merchantTxnId, upiRefId, or paymentRef
    let existingPayment = null;
    if (merchantTxnId) {
      existingPayment = await prisma.payment.findUnique({
        where: { merchantTxnId },
      });
    } else if (upiRefId) {
      existingPayment = await prisma.payment.findUnique({
        where: { upiRefId },
      });
    } else if (paymentRef) {
      existingPayment = await prisma.payment.findUnique({
        where: { paymentRef },
      });
    }

    // Idempotency: If already SUCCESS, return gracefully
    if (existingPayment && existingPayment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified successfully (Idempotent)",
        payment: existingPayment,
      });
    }

    // If existing payment found and in PENDING status, complete it
    if (existingPayment) {
      const payAmount = Number(existingPayment.amount);
      const targetCustomerId = existingPayment.customerId;

      const result = await prisma.$transaction(async (tx) => {
        // A. Update payment to SUCCESS
        const updatedPayment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "SUCCESS",
            method: "GOOGLE_PAY_UPI",
            bankRrn: bankRrn || existingPayment.bankRrn || `RRN${Date.now().toString().slice(-8)}`,
            payerVpa: payerVpa || existingPayment.payerVpa || null,
            gpayTransactionId: gpayTransactionId || `GP-${Date.now()}`,
            gatewayResponseCode: "SUCCESS",
            paidAt: new Date(),
            notes: notes ? `${existingPayment.notes || ""}; ${notes}` : existingPayment.notes,
          },
        });

        // B. Decrement Customer outstanding credit balance
        const updatedCustomer = await tx.customer.update({
          where: { id: targetCustomerId },
          data: {
            currentBalance: {
              decrement: payAmount,
            },
          },
        });

        // C. Record double-entry Ledger entry
        const ledger = await tx.ledgerEntry.create({
          data: {
            customerId: targetCustomerId,
            orderId: existingPayment.orderId || null,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: payAmount,
            runningBalance: updatedCustomer.currentBalance,
            description: `Google Pay UPI Settlement - Ref #${updatedPayment.paymentRef} [RRN: ${updatedPayment.bankRrn || "N/A"}]`,
          },
        });

        // D. Update order status if orderId attached
        if (existingPayment.orderId) {
          await tx.order.update({
            where: { id: existingPayment.orderId },
            data: {
              paymentStatus: "SUCCESS",
            },
          });
        }

        // E. Audit log
        await tx.systemAuditLog.create({
          data: {
            actor: "SYSTEM_GPAY",
            action: "GPAY_PAYMENT_VERIFIED",
            metadata: {
              paymentId: updatedPayment.id,
              merchantTxnId: updatedPayment.merchantTxnId,
              amount: payAmount,
              bankRrn: updatedPayment.bankRrn,
            },
          },
        });

        return { payment: updatedPayment, customer: updatedCustomer, ledger };
      });

      return NextResponse.json({
        success: true,
        payment: result.payment,
        newBalance: Number(result.customer.currentBalance),
      });
    }

    // If no prior pending record, but customerId and amount provided (direct checkout verification)
    if (customerId && amount) {
      const payAmount = Number(amount);
      const cleanRef = `GPAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            paymentRef: cleanRef,
            customerId,
            orderId: orderId || null,
            amount: payAmount,
            method: "GOOGLE_PAY_UPI",
            status: "SUCCESS",
            merchantTxnId: merchantTxnId || `GPAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
            upiRefId: upiRefId || null,
            bankRrn: bankRrn || `RRN${Date.now().toString().slice(-8)}`,
            payerVpa: payerVpa || null,
            gpayTransactionId: gpayTransactionId || `GP-${Date.now()}`,
            gatewayResponseCode: "SUCCESS",
            notes: notes || "Direct Google Pay UPI verification",
          },
        });

        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: {
            currentBalance: {
              decrement: payAmount,
            },
          },
        });

        const ledger = await tx.ledgerEntry.create({
          data: {
            customerId,
            orderId: orderId || null,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: payAmount,
            runningBalance: updatedCustomer.currentBalance,
            description: `Google Pay UPI Settlement - Ref #${payment.paymentRef} [RRN: ${payment.bankRrn}]`,
          },
        });

        if (orderId) {
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: "SUCCESS",
            },
          });
        }

        await tx.systemAuditLog.create({
          data: {
            actor: "SYSTEM_GPAY",
            action: "GPAY_PAYMENT_VERIFIED_DIRECT",
            metadata: {
              paymentId: payment.id,
              amount: payAmount,
              bankRrn: payment.bankRrn,
            },
          },
        });

        return { payment, customer: updatedCustomer, ledger };
      });

      return NextResponse.json({
        success: true,
        payment: result.payment,
        newBalance: Number(result.customer.currentBalance),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Cannot verify payment: Missing transaction reference or customer/amount details",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error verifying Google Pay payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}

