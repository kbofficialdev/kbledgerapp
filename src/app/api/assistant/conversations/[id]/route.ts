import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// GET /api/assistant/conversations/[id] - Load single conversation with messages (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const { id } = params;

    const conversation = await prisma.assistantConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to load conversation." },
      { status: 500 }
    );
  }
}

// PATCH /api/assistant/conversations/[id] - Rename conversation (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title cannot be empty." },
        { status: 400 }
      );
    }

    const updated = await prisma.assistantConversation.update({
      where: { id },
      data: { title },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: updated.id,
        title: updated.title,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to rename conversation." },
      { status: 500 }
    );
  }
}

// DELETE /api/assistant/conversations/[id] - Delete conversation (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const { id } = params;

    await prisma.assistantConversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation." },
      { status: 500 }
    );
  }
}

