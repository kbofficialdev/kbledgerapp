import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { extractClientIp } from "@/lib/session-db";
import { executeAcidOrderCreation } from "@/lib/acid-ledger";
import { reconcilePendingCashfreePayments } from "@/lib/cashfree-reconcile";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    await reconcilePendingCashfreePayments();

    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId")?.trim();
    const customerId = searchParams.get("customerId")?.trim();
    const paymentType = searchParams.get("paymentType")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const search = searchParams.get("search")?.trim();
    const id = searchParams.get("id")?.trim();

    const whereClause: any = {};

    if (id) {
      whereClause.OR = [
        { id },
        { orderNumber: id },
      ];
    } else {
      whereClause.customer = { isActive: true };
      if (villageId) whereClause.villageId = villageId;
      if (customerId) whereClause.customerId = customerId;
      if (paymentType && ["CREDIT", "DEBIT", "PARTIAL"].includes(paymentType)) {
        whereClause.paymentType = paymentType;
      }
    }

    if (startDate || endDate) {
      whereClause.orderDate = {};
      if (startDate) whereClause.orderDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.orderDate.lte = end;
      }
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { mobile: { contains: search } } },
        { customer: { customerCode: { contains: search, mode: "insensitive" } } },
        { items: { some: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        village: { select: { id: true, name: true, code: true } },
        customer: { select: { id: true, name: true, mobile: true, customerCode: true } },
        items: true,
        payments: true,
      },
      orderBy: { orderDate: "desc" },
      take: 100,
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      villageId: o.villageId,
      villageName: o.village.name,
      villageCode: o.village.code,
      customerId: o.customerId,
      customerName: o.customer.name,
      customerCode: o.customer.customerCode,
      customerMobile: o.customer.mobile,
      totalAmount: Number(o.totalAmount),
      paidAmount: Number(o.paidAmount),
      creditAmount: Number(o.creditAmount),
      paymentType: o.paymentType,
      paymentStatus: o.paymentStatus,
      notes: o.notes,
      items: o.items.map((i) => ({
        id: i.id,
        customItemId: i.customItemId,
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        pricePerUnit: Number(i.pricePerUnit),
        lineTotal: Number(i.lineTotal),
      })),
    }));

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load orders.") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const {
      villageId,
      customerId,
      items,
      paymentType, // "CREDIT", "DEBIT", "PARTIAL"
      paidAmount: rawPaidAmount,
      paymentMethod = "CASH",
      notes,
      merchantTxnId,
      gpayTransactionId,
      cashfreeOrderId,
      cashfreePaymentId,
      paymentSessionId,
      upiRefId,
      bankRrn,
      payerVpa,
    } = body;

    if (!villageId || !customerId) {
      return NextResponse.json(
        { success: false, error: "Both Village and Customer are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one line item" },
        { status: 400 }
      );
    }

    if (!["CREDIT", "DEBIT", "PARTIAL"].includes(paymentType)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment settlement type" },
        { status: 400 }
      );
    }

    // Verify village and customer exist before starting ACID transaction
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { success: false, error: "Cannot create bills or orders for a blacklisted or disabled customer account." },
        { status: 403 }
      );
    }

    const result = await executeAcidOrderCreation({
      villageId,
      customerId,
      items,
      paymentType,
      paidAmount: parseFloat(rawPaidAmount) || 0,
      paymentMethod: paymentMethod || "CASH",
      notes,
      merchantTxnId,
      gpayTransactionId,
      cashfreeOrderId,
      cashfreePaymentId,
      paymentSessionId,
      upiRefId,
      bankRrn,
      payerVpa,
      ipAddress: extractClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        success: true,
        order: result.order,
        orderNumber: result.order.orderNumber,
        newBalance: result.newBalance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to record order. Please verify input data and try again.") },
      { status: 500 }
    );
  }
}
