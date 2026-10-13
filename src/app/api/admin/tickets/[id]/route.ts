import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tickets/[id]
 * Retrieves ticket details, customer profile, and conversation thread.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: {
            village: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        customer: {
          ...ticket.customer,
          creditLimit: Number(ticket.customer.creditLimit),
          currentBalance: Number(ticket.customer.currentBalance),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch ticket.") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tickets/[id]
 * Posts an admin reply to the customer's enquiry.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await req.json();
    const { message, status } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Reply message cannot be empty." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    // Create the admin reply
    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: "ADMIN",
        senderName: "Store Administrator",
        content: message.trim(),
      },
    });

    // Update ticket status
    const newStatus = status || (ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status);
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin response posted successfully.",
      newMessage,
      status: newStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to post admin reply.") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tickets/[id]
 * Updates ticket status (e.g. RESOLVED, CLOSED, IN_PROGRESS).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const body = await req.json();
    const { status, priority } = body;

    const data: any = { updatedAt: new Date() };
    if (status) data.status = status;
    if (priority) data.priority = priority;

    const updated = await prisma.supportTicket.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: `Ticket status updated to ${updated.status}.`,
      ticket: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to update ticket.") },
      { status: 500 }
    );
  }
}

