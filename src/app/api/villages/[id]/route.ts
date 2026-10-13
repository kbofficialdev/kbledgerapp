import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

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
      { success: false, error: sanitizeApiError(error, "Failed to load village details.") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { name, code, taluk, district, pincode, notes, isActive } = body;

    let cleanCode: string | undefined = undefined;
    if (code && typeof code === "string" && code.trim()) {
      const candidate = code.trim().toUpperCase();
      const existing = await prisma.village.findFirst({
        where: { code: candidate, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Village code "${candidate}" is already in use by "${existing.name}".` },
          { status: 409 }
        );
      }
      cleanCode = candidate;
    }

    const village = await prisma.village.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(cleanCode ? { code: cleanCode } : {}),
        taluk: taluk !== undefined ? taluk?.trim() || null : undefined,
        district: district !== undefined ? district?.trim() || null : undefined,
        pincode: pincode !== undefined ? pincode?.trim() || null : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      village,
      message: "Village profile updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to update village.") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return PUT(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const activeCustomerCount = await prisma.customer.count({
      where: { villageId: params.id, isActive: true },
    });

    if (activeCustomerCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete village with ${activeCustomerCount} active customer accounts. Reassign or delete those customers first.`,
        },
        { status: 400 }
      );
    }

    const totalCustomerCount = await prisma.customer.count({
      where: { villageId: params.id },
    });

    if (totalCustomerCount === 0) {
      await prisma.village.delete({
        where: { id: params.id },
      });
    } else {
      await prisma.village.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Village deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to delete village.") },
      { status: 500 }
    );
  }
}
