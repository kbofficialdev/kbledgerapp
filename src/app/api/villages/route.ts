import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const villages = await prisma.village.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { taluk: { contains: search, mode: "insensitive" } },
                { district: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { orders: true },
        },
        customers: {
          where: { isActive: true },
          select: { currentBalance: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const villagesWithMetrics = villages.map((v) => {
      const totalOutstanding = v.customers.reduce(
        (sum, c) => sum + Number(c.currentBalance || 0),
        0
      );
      return {
        id: v.id,
        code: v.code,
        name: v.name,
        taluk: v.taluk,
        district: v.district,
        pincode: v.pincode,
        notes: v.notes,
        customerCount: v.customers.length,
        orderCount: v._count.orders,
        totalOutstanding,
        createdAt: v.createdAt,
      };
    });

    return NextResponse.json({ success: true, villages: villagesWithMetrics });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch villages.") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { name, taluk, district, pincode, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Village name is required" },
        { status: 400 }
      );
    }

    let code = body.code?.trim()?.toUpperCase();
    if (!code) {
      const count = await prisma.village.count();
      const prefix = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "VIL";
      code = `VIL-${prefix}-${String(count + 1).padStart(3, "0")}`;
    }

    const existing = await prisma.village.findUnique({ where: { code } });
    if (existing) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const village = await prisma.village.create({
      data: {
        code,
        name: name.trim(),
        taluk: taluk?.trim() || null,
        district: district?.trim() || null,
        pincode: pincode?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, village }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to create village.") },
      { status: 500 }
    );
  }
}
