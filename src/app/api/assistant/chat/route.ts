import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAssistantResponse,
  streamAssistantResponse,
  generateConversationTitle,
  MessagePayload,
} from "@/lib/assistant-ai";

import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Restrict AI Service exclusively to authenticated Store Administrators
    const adminAuth = await requireAdminSession(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: KB AI Business Advisor is restricted exclusively to authenticated store administrators.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    let conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const isStream = body.stream !== false; // Default to streaming

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt cannot be empty." },
        { status: 400 }
      );
    }

    // 1. Ensure conversation exists in PostgreSQL
    let conversation = conversationId
      ? await prisma.assistantConversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 20, // last 20 messages for context
            },
          },
        })
      : null;

    if (!conversation) {
      const initialTitle = await generateConversationTitle(prompt);
      conversation = await prisma.assistantConversation.create({
        data: {
          title: initialTitle,
        },
        include: {
          messages: true,
        },
      });
      conversationId = conversation.id;
    } else if (conversation.title === "New Conversation") {
      // Auto-title from the first prompt
      const newTitle = await generateConversationTitle(prompt);
      await prisma.assistantConversation.update({
        where: { id: conversation.id },
        data: { title: newTitle },
      });
    }

    // 2. Persist user's message immediately
    const userMessage = await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: prompt,
      },
    });

    // Update conversation updatedAt timestamp
    await prisma.assistantConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 3. Prepare message history for AI context
    const historyPayload: MessagePayload[] = (conversation.messages || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // 4. Handle Streaming Response
    if (isStream) {
      try {
        const { stream, getFullText } = await streamAssistantResponse(
          prompt,
          historyPayload,
          req.signal
        );

        // Background persistence task after stream finishes
        (async () => {
          try {
            const completedContent = await getFullText();
            if (completedContent && completedContent.trim()) {
              await prisma.assistantMessage.create({
                data: {
                  conversationId: conversation!.id,
                  role: "assistant",
                  content: completedContent.trim(),
                },
              });
              await prisma.assistantConversation.update({
                where: { id: conversation!.id },
                data: { updatedAt: new Date() },
              });
            }
          } catch (dbErr) {
          }
        })();

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Conversation-Id": conversation.id,
            "X-User-Message-Id": userMessage.id,
          },
        });
      } catch (streamInitErr: any) {
        // Fall back to non-streaming execution below
      }
    }

    // 5. Non-streaming Execution (or fallback)
    const assistantContent = await generateAssistantResponse(prompt, historyPayload);

    const assistantMessage = await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantContent.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      userMessage: {
        id: userMessage.id,
        role: "user",
        content: userMessage.content,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeApiError(error, "AI Assistant is currently performing ledger reconciliation. Please ask your question again shortly."),
      },
      { status: 500 }
    );
  }
}

