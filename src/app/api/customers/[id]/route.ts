import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      { success: false, error: error.message },
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

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(mobile ? { mobile: mobile.trim() } : {}),
        altMobile: altMobile !== undefined ? altMobile?.trim() || null : undefined,
        email: email !== undefined ? email?.trim() || null : undefined,
        address: address !== undefined ? address?.trim() || null : undefined,
        villageId: villageId || undefined,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

