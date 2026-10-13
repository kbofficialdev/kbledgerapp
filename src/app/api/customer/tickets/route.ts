import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerSession, getAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

async function resolveTargetCustomerId(req: NextRequest): Promise<string | null> {
  const session = await getCustomerSession(req);
  if (session?.customerId) return session.customerId;
  const adminSession = await getAdminSession(req);
  if (adminSession) {
    const firstCustomer = await prisma.customer.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return firstCustomer?.id || null;
  }
  return null;
}

/**
 * GET /api/customer/tickets
 * Lists all support tickets submitted by the authenticated customer.
 */
export async function GET(req: NextRequest) {
  try {
    const customerId = await resolveTargetCustomerId(req);
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // latest message preview
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
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        latestMessage: t.messages[0] ? t.messages[0].content : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch tickets.") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/tickets
 * Raises a new support ticket / enquiry.
 */
export async function POST(req: NextRequest) {
  try {
    const customerId = await resolveTargetCustomerId(req);
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { subject, category = "GENERAL", priority = "MEDIUM", message } = body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: "Ticket subject is required." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Initial enquiry message is required." },
        { status: 400 }
      );
    }

    const ticketNumber = `TKT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: customer.id,
        subject: subject.trim(),
        category,
        priority,
        status: "OPEN",
        messages: {
          create: {
            senderRole: "CUSTOMER",
            senderName: customer.name,
            content: message.trim(),
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Enquiry #${ticket.ticketNumber} submitted successfully. Store team will review shortly.`,
      ticket,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to submit enquiry. Please try again.") },
      { status: 500 }
    );
  }
}

