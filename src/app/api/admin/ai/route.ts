import { NextRequest, NextResponse } from "next/server";
import {
  runLangGraphAdminAgent,
  fetchLiveStoreSnapshot,
} from "@/lib/langgraph-admin-agent";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const { metrics, villagesList, topDebtors } = await fetchLiveStoreSnapshot();
    return NextResponse.json({
      success: true,
      framework: "LangGraph StateGraph + LangChain Core + ChatGoogleGenerativeAI (Gemini Brain)",
      metrics,
      villages: villagesList,
      customers: topDebtors.map((c) => ({
        id: c.id,
        name: c.name,
        customerCode: c.customerCode,
        mobile: c.mobile,
        email: c.email,
        currentBalance: Number(c.currentBalance),
        villageName: c.village.name,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load store metrics.") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    let { prompt = "", conversationHistory = [], image, toolAction } = body;

    if ((!prompt || typeof prompt !== "string" || !prompt.trim()) && !image && !toolAction) {
      return NextResponse.json(
        { error: "A valid prompt, tool action, or image upload is required." },
        { status: 400 }
      );
    }

    if (!prompt.trim() && image) {
      prompt = "Please inspect and analyze this uploaded store document/receipt/collection sheet.";
    } else if (!prompt.trim() && toolAction) {
      prompt = `Execute LangChain structured tool: ${toolAction.toolName}`;
    }

    const result = await runLangGraphAdminAgent({
      prompt,
      conversationHistory,
      image,
      toolAction,
    });

    return NextResponse.json({
      success: true,
      framework: "LangGraph StateGraph + LangChain ChatGoogleGenerativeAI",
      answer: result.answer,
      toolSteps: result.toolSteps,
      artifacts: result.artifacts,
      graphTrace: result.graphTrace,
      metrics: result.metrics,
      villages: result.villages,
      customers: result.customers,
    });
  } catch (error: any) {
    console.error("[LangGraph Admin Agent Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: sanitizeApiError(
          error,
          "The LangGraph AI Agent is temporarily unavailable. Please try again shortly."
        ),
      },
      { status: 500 }
    );
  }
}
