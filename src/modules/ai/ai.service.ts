/**
 * AI AGENT & COPILOT DOMAIN MODULE: SERVICE IMPLEMENTATION
 */

import { prisma } from "@/lib/prisma";
import { runLangGraphAdminAgent } from "@/lib/langgraph-admin-agent";
import { askGeminiAssistant } from "@/lib/gemini";
import { AICallOptions, AIResponse, AgentArtifact, AgentToolStep } from "./types";

export class AIService {
  private static instance: AIService;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  isConfigured(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  }

  /**
   * Runs the modern LangGraph multi-agent system for store executives/admins
   */
  async runAdminAgent(options: Omit<AICallOptions, "role">): Promise<AIResponse> {
    try {
      let formattedImage: { data: string; mimeType: string } | undefined = undefined;
      if (options.image) {
        if (typeof options.image === "string") {
          if (options.image.startsWith("data:")) {
            const [header, base64] = options.image.split(",");
            const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
            formattedImage = { data: base64, mimeType };
          } else {
            formattedImage = { data: options.image, mimeType: "image/jpeg" };
          }
        } else {
          formattedImage = options.image;
        }
      }

      const result = await runLangGraphAdminAgent({
        prompt: options.prompt,
        conversationHistory: options.conversationHistory || [],
        image: formattedImage,
      });

      return {
        content: result.answer,
        artifacts: result.artifacts,
        toolSteps: result.toolSteps,
        framework: "LANGGRAPH",
        status: "SUCCESS",
      };
    } catch (err: any) {
      return {
        content: `Error executing LangGraph agent: ${err.message}`,
        framework: "LANGGRAPH",
        status: "FAILED",
        error: err.message,
      };
    }
  }

  /**
   * Runs the customer khata assistant with strict customer role isolation
   */
  async runCustomerCopilot(
    customerId: string,
    prompt: string,
    conversationHistory: any[] = [],
    image?: string
  ): Promise<AIResponse> {
    // 1. Verify active account
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        village: { select: { name: true } },
        orders: {
          orderBy: { orderDate: "desc" },
          take: 5,
          include: { items: true },
        },
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          take: 5,
        },
      },
    });

    if (!customer) {
      return {
        content: "Customer profile not found.",
        framework: "GEMINI_DIRECT",
        status: "FAILED",
        error: "NOT_FOUND",
      };
    }

    if (!customer.isActive) {
      return {
        content:
          "Your account has been deactivated/blacklisted. AI khata services are unavailable. Please contact store management.",
        framework: "GEMINI_DIRECT",
        status: "FAILED",
        error: "ACCOUNT_DISABLED",
      };
    }

    const contextPrompt = `
You are the dedicated KB Khata Assistant for customer ${customer.name} (Code: ${customer.customerCode}).
Territory: ${customer.village?.name || "Village Store"}
Current Outstanding Udhaar Balance: ₹${customer.currentBalance}
Credit Limit: ₹${customer.creditLimit}
Recent Orders count: ${customer.orders.length}
Recent Payments count: ${customer.payments.length}

Answer the customer politely in standard Indian English or Telugu as requested.
Customer Query: ${prompt}
`;

    let formattedImage: { data: string; mimeType: string } | undefined = undefined;
    if (image) {
      if (image.startsWith("data:")) {
        const [header, base64] = image.split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
        formattedImage = { data: base64, mimeType };
      } else {
        formattedImage = { data: image, mimeType: "image/jpeg" };
      }
    }

    try {
      const reply = await askGeminiAssistant({
        prompt: contextPrompt,
        conversationHistory,
        image: formattedImage,
      });
      return {
        content: reply,
        framework: "GEMINI_DIRECT",
        status: "SUCCESS",
      };
    } catch (err: any) {
      return {
        content: `Could not process request: ${err.message}`,
        framework: "GEMINI_DIRECT",
        status: "FAILED",
        error: err.message,
      };
    }
  }
}
