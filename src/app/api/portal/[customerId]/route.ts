import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomerSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { customerId } = params;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Role-based authorization: caller must be an authorized admin or the authenticated customer themselves
    const auth = await requireCustomerSession(req, customerId);
    if (!auth.authorized) {
      return auth.response!;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        village: {
          select: { id: true, name: true, code: true, taluk: true, district: true },
        },
        orders: {
          include: {
            items: true,
          },
          orderBy: { orderDate: "desc" },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
        ledgerEntries: {
          orderBy: { entryDate: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer khata profile not found" },
        { status: 404 }
      );
    }

    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      customerCode: customer.customerCode,
      mobile: customer.mobile,
      altMobile: customer.altMobile,
      email: customer.email,
      address: customer.address,
      villageId: customer.villageId,
      villageName: customer.village.name,
      villageCode: customer.village.code,
      villageTaluk: customer.village.taluk,
      villageDistrict: customer.village.district,
      creditLimit: Number(customer.creditLimit),
      currentBalance: Number(customer.currentBalance),
      notes: customer.notes,
      createdAt: customer.createdAt,
    };

    const formattedOrders = customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
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

    const formattedPayments = customer.payments.map((p) => ({
      id: p.id,
      paymentRef: p.paymentRef,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      merchantTxnId: p.merchantTxnId,
      upiRefId: p.upiRefId,
      bankRrn: p.bankRrn,
      payerVpa: p.payerVpa,
      paidAt: p.paidAt,
      notes: p.notes,
    }));

    const formattedLedger = customer.ledgerEntries.map((l) => ({
      id: l.id,
      entryDate: l.entryDate,
      entryType: l.entryType,
      debitAmount: Number(l.debitAmount),
      creditAmount: Number(l.creditAmount),
      runningBalance: Number(l.runningBalance),
      description: l.description,
    }));

    return NextResponse.json({
      success: true,
      customer: formattedCustomer,
      orders: formattedOrders,
      payments: formattedPayments,
      ledgerEntries: formattedLedger,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load customer portal data.") },
      { status: 500 }
    );
  }
}

