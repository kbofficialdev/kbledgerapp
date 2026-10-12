import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomItemId, generateOrderNumber } from "@/lib/utils";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

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
    console.error("Error fetching orders:", error);
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

    // Verify village and customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Validate and calculate totals
    let calculatedTotal = 0;
    const sanitizedItems = items.map((item: any) => {
      const name = item.name?.trim() || "Item";
      const quantity = Math.max(0.001, parseFloat(item.quantity) || 1);
      const unit = item.unit?.trim() || "pcs";
      const pricePerUnit = Math.max(0, parseFloat(item.pricePerUnit) || 0);
      const lineTotal = Math.round(quantity * pricePerUnit * 100) / 100;
      calculatedTotal += lineTotal;

      return {
        customItemId: item.customItemId?.trim() || generateCustomItemId(),
        name,
        quantity,
        unit,
        pricePerUnit,
        lineTotal,
      };
    });

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    let finalPaidAmount = 0;
    let finalCreditAmount = 0;

    if (paymentType === "CREDIT") {
      finalPaidAmount = 0;
      finalCreditAmount = calculatedTotal;
    } else if (paymentType === "DEBIT") {
      finalPaidAmount = calculatedTotal;
      finalCreditAmount = 0;
    } else if (paymentType === "PARTIAL") {
      finalPaidAmount = Math.min(calculatedTotal, Math.max(0, parseFloat(rawPaidAmount) || 0));
      finalCreditAmount = Math.round((calculatedTotal - finalPaidAmount) * 100) / 100;
    }

    const orderNumber = generateOrderNumber();

    // Atomic execution in a Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          villageId,
          customerId,
          totalAmount: calculatedTotal,
          paidAmount: finalPaidAmount,
          creditAmount: finalCreditAmount,
          paymentType,
          paymentStatus: "SUCCESS",
          notes: notes?.trim() || null,
          items: {
            create: sanitizedItems.map((i) => ({
              customItemId: i.customItemId,
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              pricePerUnit: i.pricePerUnit,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      // 2. If payment was made (Debit or Partial Paid), record or link Payment
      let paymentRecord = null;
      if (finalPaidAmount > 0) {
        if (cashfreeOrderId) {
          const existingPayment = await tx.payment.findUnique({
            where: { cashfreeOrderId },
          });
          if (existingPayment) {
            paymentRecord = await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                orderId: order.id,
                amount: finalPaidAmount,
                status: "SUCCESS",
                method: paymentMethod || "CASHFREE_ELEMENTS",
                cashfreePaymentId: cashfreePaymentId || existingPayment.cashfreePaymentId,
                paymentSessionId: paymentSessionId || existingPayment.paymentSessionId,
                paidAt: new Date(),
                notes: notes ? `Counter bill payment for ${orderNumber} - ${notes}` : `Counter bill payment for ${orderNumber}`,
              },
            });
          }
        }

        if (!paymentRecord) {
          paymentRecord = await tx.payment.create({
            data: {
              paymentRef: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
              orderId: order.id,
              customerId,
              amount: finalPaidAmount,
              method: paymentMethod,
              status: "SUCCESS",
              cashfreeOrderId: cashfreeOrderId || null,
              cashfreePaymentId: cashfreePaymentId || null,
              paymentSessionId: paymentSessionId || null,
              merchantTxnId: merchantTxnId || null,
              gpayTransactionId: gpayTransactionId || null,
              upiRefId: upiRefId || null,
              bankRrn: bankRrn || null,
              payerVpa: payerVpa || null,
              notes: notes ? `Counter bill payment for ${orderNumber} - ${notes}` : `Counter bill payment for ${orderNumber}`,
            },
          });
        }
      }

      // 3. Update Customer Current Balance:
      // If customer owed credit (Udhaar), increment currentBalance by finalCreditAmount
      let newBalance = Number(customer.currentBalance);
      if (finalCreditAmount > 0) {
        const updated = await tx.customer.update({
          where: { id: customerId },
          data: {
            currentBalance: {
              increment: finalCreditAmount,
            },
          },
        });
        newBalance = Number(updated.currentBalance);
      }

      // 4. Record Bahi-Khata Ledger Entries
      // Entry 1: Bill Debit
      const itemsSummary = sanitizedItems.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(", ");
      await tx.ledgerEntry.create({
        data: {
          customerId,
          orderId: order.id,
          entryType: "BILL_DEBIT",
          debitAmount: calculatedTotal,
          creditAmount: 0,
          runningBalance: Number(customer.currentBalance) + calculatedTotal,
          description: `Bill #${orderNumber} [${itemsSummary.slice(0, 80)}]`,
        },
      });

      // Entry 2: Payment Credit (if paid in part or full)
      if (finalPaidAmount > 0) {
        await tx.ledgerEntry.create({
          data: {
            customerId,
            orderId: order.id,
            entryType: "PAYMENT_CREDIT",
            debitAmount: 0,
            creditAmount: finalPaidAmount,
            runningBalance: newBalance,
            description: `Payment received (${paymentMethod}) against Bill #${orderNumber}`,
          },
        });
      }

      return { order, paymentRecord, newBalance };
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
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to record order. Please verify input data and try again.") },
      { status: 500 }
    );
  }
}
