import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId")?.trim();
    const customerId = searchParams.get("customerId")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const entryType = searchParams.get("entryType")?.trim();
    const search = searchParams.get("search")?.trim();

    const whereClause: any = {};

    if (customerId) {
      whereClause.customerId = customerId;
    } else if (villageId) {
      whereClause.customer = { villageId };
    }

    if (entryType && ["BILL_DEBIT", "PAYMENT_CREDIT", "ADJUSTMENT"].includes(entryType)) {
      whereClause.entryType = entryType;
    }

    if (startDate || endDate) {
      whereClause.entryDate = {};
      if (startDate) whereClause.entryDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.entryDate.lte = end;
      }
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { mobile: { contains: search } } },
        { customer: { customerCode: { contains: search, mode: "insensitive" } } },
      ];
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            customerCode: true,
            village: { select: { id: true, name: true, code: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            paymentType: true,
            items: true,
          },
        },
      },
      orderBy: { entryDate: "desc" },
      take: 200,
    });

    const formatted = entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      entryType: e.entryType,
      debitAmount: Number(e.debitAmount),
      creditAmount: Number(e.creditAmount),
      runningBalance: Number(e.runningBalance),
      description: e.description,
      customerName: e.customer.name,
      customerMobile: e.customer.mobile,
      customerEmail: e.customer.email,
      customerCode: e.customer.customerCode,
      villageName: e.customer.village.name,
      villageCode: e.customer.village.code,
      orderNumber: e.order?.orderNumber,
      paymentType: e.order?.paymentType,
    }));

    // Aggregate totals for the filtered range
    const totalDebit = formatted.reduce((sum, e) => sum + e.debitAmount, 0);
    const totalCredit = formatted.reduce((sum, e) => sum + e.creditAmount, 0);

    return NextResponse.json({
      success: true,
      entries: formatted,
      summary: {
        totalDebit,
        totalCredit,
        netDifference: totalDebit - totalCredit,
        count: formatted.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching ledger reports:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
