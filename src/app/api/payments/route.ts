import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, requireCustomerSession } from "@/lib/auth-session";
import { extractClientIp } from "@/lib/session-db";
import { executeAcidPaymentSettlement } from "@/lib/acid-ledger";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      orderId,
      amount,
      method,
      notes,
      merchantTxnId,
      gpayTransactionId,
      upiRefId,
      bankRrn,
      payerVpa,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Role-based authorization: Admin OR Customer paying their own account
    const auth = await requireCustomerSession(req, customerId);
    if (!auth.authorized) return auth.response!;

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

    const result = await executeAcidPaymentSettlement({
      customerId,
      orderId: orderId || null,
      amount: payAmount,
      method: method || "GOOGLE_PAY",
      notes,
      merchantTxnId,
      gpayTransactionId,
      upiRefId,
      bankRrn,
      payerVpa,
      ipAddress: extractClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      newBalance: result.balanceAfter,
      allocations: result.allocations,
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to record payment.") },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    // If customerId is provided, authorize for that customer or admin; otherwise require admin
    if (customerId) {
      const auth = await requireCustomerSession(req, customerId);
      if (!auth.authorized) return auth.response!;
    } else {
      const adminAuth = await requireAdminSession(req);
      if (!adminAuth.authorized) return adminAuth.response!;
    }

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
      merchantTxnId: p.merchantTxnId,
      gpayTransactionId: p.gpayTransactionId,
      upiRefId: p.upiRefId,
      bankRrn: p.bankRrn,
      payerVpa: p.payerVpa,
    }));

    return NextResponse.json({ success: true, payments: formatted });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch payments.") },
      { status: 500 }
    );
  }
}
