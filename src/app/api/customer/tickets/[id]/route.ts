import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/tickets/[id]
 * Retrieves ticket details and full conversation history.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCustomerSession(req);
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: { id: true, name: true, customerCode: true, mobile: true },
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

    // Tenant isolation: Customer can only view their own ticket
    if (ticket.customerId !== session.customerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot view this ticket." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error("Customer ticket GET error:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch ticket.") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/tickets/[id]
 * Appends a reply message to the ticket conversation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCustomerSession(req);
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    if (ticket.customerId !== session.customerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot reply to this ticket." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Reply message cannot be empty." },
        { status: 400 }
      );
    }

    // Create the message and update ticket timestamp
    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: "CUSTOMER",
        senderName: ticket.customer.name,
        content: message.trim(),
      },
    });

    // Reopen ticket if it was resolved/closed
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "CLOSED" ? "OPEN" : ticket.status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully.",
      newMessage,
    });
  } catch (error: any) {
    console.error("Customer ticket message POST error:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to post message.") },
      { status: 500 }
    );
  }
}

