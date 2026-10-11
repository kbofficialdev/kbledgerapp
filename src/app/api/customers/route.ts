import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const villageId = searchParams.get("villageId")?.trim() || "";
    const filter = searchParams.get("filter")?.trim() || ""; // "with_balance", "zero_balance"

    const whereClause: any = {
      isActive: true,
      ...(villageId ? { villageId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { customerCode: { contains: search, mode: "insensitive" } },
              { mobile: { contains: search } },
              { altMobile: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (filter === "with_balance") {
      whereClause.currentBalance = { gt: 0 };
    } else if (filter === "zero_balance") {
      whereClause.currentBalance = { lte: 0 };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        village: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { orders: true, payments: true, ledgerEntries: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedCustomers = customers.map((c) => ({
      id: c.id,
      customerCode: c.customerCode,
      name: c.name,
      mobile: c.mobile,
      altMobile: c.altMobile,
      email: c.email,
      address: c.address,
      villageId: c.villageId,
      villageName: c.village.name,
      villageCode: c.village.code,
      creditLimit: Number(c.creditLimit),
      currentBalance: Number(c.currentBalance),
      notes: c.notes,
      orderCount: c._count.orders,
      paymentCount: c._count.payments,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ success: true, customers: formattedCustomers });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      villageId,
      name,
      mobile,
      altMobile,
      email,
      address,
      creditLimit,
      initialBalance,
      notes,
    } = body;

    if (!villageId) {
      return NextResponse.json(
        { success: false, error: "Village selection is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!mobile || !mobile.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer mobile number is required" },
        { status: 400 }
      );
    }

    // Verify village exists
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    });

    if (!village) {
      return NextResponse.json(
        { success: false, error: "Specified village does not exist" },
        { status: 404 }
      );
    }

    // Generate unique customer code
    let customerCode = body.customerCode?.trim();
    if (!customerCode) {
      customerCode = generateCustomerCode(village.code);
      // Ensure uniqueness
      const exists = await prisma.customer.findUnique({
        where: { customerCode },
      });
      if (exists) {
        customerCode = `${customerCode}-${Math.floor(10 + Math.random() * 90)}`;
      }
    }

    const initBal = Number(initialBalance || 0);

    const customer = await prisma.$transaction(async (tx) => {
      const newCust = await tx.customer.create({
        data: {
          customerCode,
          name: name.trim(),
          mobile: mobile.trim(),
          altMobile: altMobile?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          villageId,
          creditLimit: Number(creditLimit || 0),
          currentBalance: initBal,
          notes: notes?.trim() || null,
        },
      });

      // If initial balance was brought forward from paper book:
      if (initBal > 0) {
        await tx.ledgerEntry.create({
          data: {
            customerId: newCust.id,
            entryType: "ADJUSTMENT",
            debitAmount: initBal,
            creditAmount: 0,
            runningBalance: initBal,
            description: "Opening balance migrated from physical bahi-khata book",
          },
        });
      }

      return newCust;
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
