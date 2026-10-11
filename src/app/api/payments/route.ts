import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, orderId, amount, method, notes } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const paymentRef = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          paymentRef,
          customerId,
          orderId: orderId || null,
          amount: payAmount,
          method: method || "CASH",
          status: "SUCCESS",
          notes: notes || null,
        },
      });

      // 2. Decrement Customer currentBalance
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: {
            decrement: payAmount,
          },
        },
      });

      // 3. Create LedgerEntry (PAYMENT_CREDIT / Jama)
      const ledger = await tx.ledgerEntry.create({
        data: {
          customerId,
          orderId: orderId || null,
          entryType: "PAYMENT_CREDIT",
          debitAmount: 0,
          creditAmount: payAmount,
          runningBalance: updatedCustomer.currentBalance,
          description: `Payment received (${payment.method}) - Ref #${paymentRef}${notes ? `: ${notes}` : ""}`,
        },
      });

      return { payment, updatedCustomer, ledger };
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      newBalance: Number(result.updatedCustomer.currentBalance),
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const payments = await prisma.payment.findMany({
      where: customerId ? { customerId } : {},
      include: {
        customer: {
          select: { name: true, customerCode: true, village: { select: { name: true } } },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 100,
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentRef: p.paymentRef,
      customerId: p.customerId,
      customerName: p.customer.name,
      customerCode: p.customer.customerCode,
      villageName: p.customer.village.name,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      paidAt: p.paidAt,
      notes: p.notes,
      phonePeTransactionId: p.phonePeTransactionId,
    }));

    return NextResponse.json({ success: true, payments: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
