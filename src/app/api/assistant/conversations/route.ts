import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// GET /api/assistant/conversations - List all conversations (Admin only)
export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }
    const conversations = await prisma.assistantConversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messageCount: c._count.messages,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to load conversation history." },
      { status: 500 }
    );
  }
}

// POST /api/assistant/conversations - Create a new conversation (Admin only)
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 80)
      : "New Conversation";

    const conversation = await prisma.assistantConversation.create({
      data: {
        title,
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to initialize conversation." },
      { status: 500 }
    );
  }
}

