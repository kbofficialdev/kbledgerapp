import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const village = await prisma.village.findUnique({
      where: { id: params.id },
      include: {
        customers: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { customers: true, orders: true },
        },
      },
    });

    if (!village) {
      return NextResponse.json(
        { success: false, error: "Village not found" },
        { status: 404 }
      );
    }

    const totalOutstanding = village.customers.reduce(
      (sum, c) => sum + Number(c.currentBalance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      village: {
        ...village,
        totalOutstanding,
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
    const { name, taluk, district, pincode, notes } = body;

    const village = await prisma.village.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        taluk: taluk !== undefined ? taluk?.trim() || null : undefined,
        district: district !== undefined ? district?.trim() || null : undefined,
        pincode: pincode !== undefined ? pincode?.trim() || null : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    return NextResponse.json({ success: true, village });
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
    // Check if customers exist
    const customerCount = await prisma.customer.count({
      where: { villageId: params.id, isActive: true },
    });

    if (customerCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete village with ${customerCount} active customer accounts. Deactivate or reassign customers first.`,
        },
        { status: 400 }
      );
    }

    await prisma.village.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Village archived successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

