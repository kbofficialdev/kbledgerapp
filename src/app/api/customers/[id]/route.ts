import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeApiError } from "@/lib/api-error";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        village: true,
        orders: {
          orderBy: { orderDate: "desc" },
          take: 50,
          include: {
            items: true,
          },
        },
        ledgerEntries: {
          orderBy: { entryDate: "desc" },
          take: 100,
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        creditLimit: Number(customer.creditLimit),
        currentBalance: Number(customer.currentBalance),
        orders: customer.orders.map((o) => ({
          ...o,
          totalAmount: Number(o.totalAmount),
          paidAmount: Number(o.paidAmount),
          creditAmount: Number(o.creditAmount),
          items: o.items.map((i) => ({
            ...i,
            quantity: Number(i.quantity),
            pricePerUnit: Number(i.pricePerUnit),
            lineTotal: Number(i.lineTotal),
          })),
        })),
        ledgerEntries: customer.ledgerEntries.map((l) => ({
          ...l,
          debitAmount: Number(l.debitAmount),
          creditAmount: Number(l.creditAmount),
          runningBalance: Number(l.runningBalance),
        })),
        payments: customer.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load customer profile.") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, mobile, altMobile, email, address, creditLimit, notes, villageId } = body;

    let cleanMobile: string | undefined = undefined;
    if (mobile && typeof mobile === "string") {
      const sanitized = mobile.trim().replace(/\D/g, "");
      if (sanitized.length < 10) {
        return NextResponse.json(
          { success: false, error: "Valid 10-digit mobile number is required" },
          { status: 400 }
        );
      }
      const existing = await prisma.customer.findFirst({
        where: { mobile: sanitized, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Mobile number ${sanitized} is already in use by customer "${existing.name}" (${existing.customerCode}).` },
          { status: 409 }
        );
      }
      cleanMobile = sanitized;
    }

    let cleanEmail: string | null | undefined = undefined;
    if (email !== undefined) {
      if (email && typeof email === "string" && email.trim()) {
        const sanitizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
          return NextResponse.json(
            { success: false, error: "Please provide a valid email format" },
            { status: 400 }
          );
        }
        const existing = await prisma.customer.findFirst({
          where: { email: sanitizedEmail, id: { not: params.id } },
        });
        if (existing) {
          return NextResponse.json(
            { success: false, error: `Email address "${sanitizedEmail}" is already in use by customer "${existing.name}" (${existing.customerCode}).` },
            { status: 409 }
          );
        }
        cleanEmail = sanitizedEmail;
      } else {
        cleanEmail = null;
      }
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(cleanMobile ? { mobile: cleanMobile } : {}),
        altMobile: altMobile !== undefined ? altMobile?.trim() || null : undefined,
        ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
        address: address !== undefined ? address?.trim() || null : undefined,
        villageId: villageId || undefined,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to update customer details.") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    if (Number(customer.currentBalance) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Customer has outstanding credit balance of ₹${customer.currentBalance}. Settle pending balance before archiving.`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Customer archived successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to archive customer.") },
      { status: 500 }
    );
  }
}

