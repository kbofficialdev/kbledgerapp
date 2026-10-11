import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAssistantResponse,
  streamAssistantResponse,
  generateConversationTitle,
  MessagePayload,
} from "@/lib/assistant-ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
            console.error("[Assistant Chat Stream] Failed to save assistant message:", dbErr);
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
        console.warn("[Assistant Chat] Stream initialization failed, falling back to non-streaming:", streamInitErr);
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
    console.error("[Assistant Chat POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate AI response. Please retry.",
      },
      { status: 500 }
    );
  }
}

