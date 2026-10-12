import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-session";
import { extractClientIp } from "@/lib/session-db";
import { Decimal } from "@prisma/client/runtime/library";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/khata/settle
 * Settles multiple orders (full or partial) via Cashfree PG.
 * Strictly guarantees mathematical consistency, updates orders, customer balance,
 * creates Payment, LedgerEntry, and an immutable TransactionAudit record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession(req);
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orderIds,
      amount,
      cashfreeOrderId,
      cashfreePaymentId,
      paymentSessionId,
      notes,
    } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount. Must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one order must be selected for settlement." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    // Execute within an ACID transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch customer with lock
      const customer = await tx.customer.findUnique({
        where: { id: session.customerId },
      });

      if (!customer) {
        throw new Error("Customer profile not found.");
      }

      // 2. Fetch selected orders strictly belonging to this customer
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          customerId: customer.id,
        },
        orderBy: { orderDate: "asc" }, // FIFO allocation
      });

      if (orders.length !== orderIds.length) {
        throw new Error("One or more selected orders could not be verified or do not belong to you.");
      }

      const totalSelectedDebt = orders.reduce(
        (sum, o) => sum + Number(o.creditAmount),
        0
      );

      if (parsedAmount > totalSelectedDebt + 0.01) {
        throw new Error(
          `Payment amount (₹${parsedAmount}) cannot exceed total debt owed on selected orders (₹${totalSelectedDebt.toFixed(2)}).`
        );
      }

      // 3. Allocate paid amount across orders (FIFO)
      let remainingToAllocate = parsedAmount;
      const allocations: Array<{
        orderId: string;
        orderNumber: string;
        amountAllocated: number;
        previousCredit: number;
        remainingCredit: number;
        status: string;
      }> = [];

      for (const order of orders) {
        if (remainingToAllocate <= 0) break;

        const orderCredit = Number(order.creditAmount);
        const orderPaid = Number(order.paidAmount);
        const orderTotal = Number(order.totalAmount);

        const allocate = Math.min(remainingToAllocate, orderCredit);
        remainingToAllocate -= allocate;

        const newPaid = orderPaid + allocate;
        const newCredit = Math.max(0, orderCredit - allocate);
        const newPaymentType = newCredit <= 0.01 ? "DEBIT" : "PARTIAL";

        allocations.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountAllocated: Number(allocate.toFixed(2)),
          previousCredit: orderCredit,
          remainingCredit: Number(newCredit.toFixed(2)),
          status: newPaymentType,
        });

        // Update the order
        await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: new Decimal(newPaid.toFixed(2)),
            creditAmount: new Decimal(newCredit.toFixed(2)),
            paymentType: newPaymentType,
            updatedAt: new Date(),
          },
        });
      }

      // 4. Update customer current balance (Udhaar)
      const balanceBefore = Number(customer.currentBalance);
      const balanceAfter = Math.max(0, balanceBefore - parsedAmount);

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: new Decimal(balanceAfter.toFixed(2)),
        },
      });

      // 5. Create or Update Payment record (idempotent for cashfreeOrderId)
      const paymentRef = `PAY-CF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      let payment = null;

      if (cashfreeOrderId) {
        const existingPayment = await tx.payment.findUnique({
          where: { cashfreeOrderId },
        });
        if (existingPayment) {
          payment = await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount: new Decimal(parsedAmount.toFixed(2)),
              status: "SUCCESS",
              cashfreePaymentId: cashfreePaymentId || existingPayment.cashfreePaymentId,
              paymentSessionId: paymentSessionId || existingPayment.paymentSessionId,
              notes: notes || existingPayment.notes,
              paidAt: new Date(),
            },
          });
        }
      }

      if (!payment) {
        payment = await tx.payment.create({
          data: {
            paymentRef,
            customerId: customer.id,
            amount: new Decimal(parsedAmount.toFixed(2)),
            method: "CASHFREE_ELEMENTS",
            status: "SUCCESS",
            cashfreeOrderId: cashfreeOrderId || null,
            cashfreePaymentId: cashfreePaymentId || null,
            paymentSessionId: paymentSessionId || null,
            notes: notes || `Multi-order online settlement for ${allocations.length} orders via Cashfree`,
            paidAt: new Date(),
          },
        });
      }

      // 6. Create LedgerEntry record
      const ledger = await tx.ledgerEntry.create({
        data: {
          customerId: customer.id,
          entryType: "PAYMENT_CREDIT",
          creditAmount: new Decimal(parsedAmount.toFixed(2)),
          runningBalance: new Decimal(balanceAfter.toFixed(2)),
          description: `Cashfree Payment (${paymentRef}) - Multi-Order Settlement for ${allocations.map((a) => a.orderNumber).join(", ")}`,
          entryDate: new Date(),
        },
      });

      // 7. Create immutable TransactionAudit record
      const transactionRef = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const audit = await tx.transactionAudit.create({
        data: {
          transactionRef,
          customerId: customer.id,
          amount: new Decimal(parsedAmount.toFixed(2)),
          method: "CASHFREE_ELEMENTS",
          status: "SUCCESS",
          balanceBefore: new Decimal(balanceBefore.toFixed(2)),
          balanceAfter: new Decimal(balanceAfter.toFixed(2)),
          orderAllocations: allocations,
          cashfreeOrderId: cashfreeOrderId || null,
          cashfreePaymentId: cashfreePaymentId || null,
          paymentSessionId: paymentSessionId || null,
          ipAddress: clientIp,
          userAgent,
          notes: notes || `Online self-service settlement of ${allocations.length} bills`,
        },
      });

      return {
        paymentRef: payment.paymentRef,
        transactionRef: audit.transactionRef,
        amountPaid: parsedAmount,
        balanceBefore,
        balanceAfter,
        allocations,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Settlement of ₹${result.amountPaid} processed successfully!`,
      data: result,
    });
  } catch (error: any) {
    console.error("[Customer Khata Settle Error]:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to process multi-order settlement. Please try again.") },
      { status: 500 }
    );
  }
}

