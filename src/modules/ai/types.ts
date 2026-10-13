/**
 * AI AGENT & COPILOT DOMAIN MODULE: TYPE DEFINITIONS
 */

import { AgentArtifact, AgentToolStep } from "@/lib/admin-ai-tools";

export type { AgentArtifact, AgentToolStep };

export interface AICallOptions {
  role: "ADMIN" | "CUSTOMER";
  customerId?: string;
  prompt: string;
  image?: string | { data: string; mimeType: string };
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

export interface AIResponse {
  content: string;
  artifacts?: AgentArtifact[];
  toolSteps?: AgentToolStep[];
  framework: "LANGGRAPH" | "LANGCHAIN" | "GEMINI_DIRECT";
  status: "SUCCESS" | "FAILED";
  error?: string;
}

