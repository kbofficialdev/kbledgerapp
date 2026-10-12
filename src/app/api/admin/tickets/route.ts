import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tickets
 * Lists all customer support tickets across all territories with filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerCode: true,
            mobile: true,
            village: { select: { name: true } },
            currentBalance: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        customerName: t.customer.name,
        customerCode: t.customer.customerCode,
        customerMobile: t.customer.mobile,
        villageName: t.customer.village.name,
        customerBalance: Number(t.customer.currentBalance),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        latestMessage: t.messages[0] ? t.messages[0].content : null,
      })),
    });
  } catch (error: any) {
    console.error("Admin tickets GET error:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load tickets.") },
      { status: 500 }
    );
  }
}

