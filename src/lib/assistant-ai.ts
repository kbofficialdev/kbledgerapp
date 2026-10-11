/**
 * Server-Side Model Adapter & Database-Grounded AI Engine
 * Specialized for the owner of KB Khata & Fashions.
 * Interacts with Google Gemini AI models with streaming, live database grounding, and fallback support.
 */

import prisma from "@/lib/prisma";

export interface MessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

// Latest models in priority order verified with the current API key
const VERIFIED_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
];

const BASE_SYSTEM_PROMPT = `You are "KB AI Business Advisor" — an intelligent business strategist, financial consultant, and operational advisor built exclusively for the owner of KB Khata & Fashions.

You have DIRECT, REAL-TIME access to the shop's PostgreSQL database (provided below).

Your Mission:
1. Answer ANY question the shop owner asks about sales, customer accounts, Udhaar (credit dues), payments, village performance, or items.
2. Proactively assist the owner in making profitable, smart business decisions (e.g., credit recovery plans, risk reduction, customer relationships, discount policies).
3. Always ground your facts in the real database numbers. Use exact Rupee figures (₹) and customer/village names.

Formatting Requirements:
- Use clean, structured Markdown for exceptional clarity and readability.
- Use bold text for key numbers, totals, and customer names (e.g. **₹78,800.00**, **KOKKULA BHAVITH KUMAR**).
- Use Markdown tables when showing lists of customers, debts, villages, or orders.
- Provide practical, structured bullet points:
  * 💡 **Strategic Recommendations**
  * ⚠️ **Credit & Risk Warnings**
  * 📈 **Revenue & Cash Opportunities**
- Answer in the language the owner asks in (fluent English, Telugu, or Hindi).
- Keep responses direct, sharp, professional, and courteous. Avoid robotic filler phrases.
`;

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    "";
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY server configuration.");
  }
  return key;
}

/**
 * Fetch a comprehensive, real-time snapshot of the shop's database
 * to ground the AI in actual business realities.
 */
export async function getLiveShopDatabaseContext(): Promise<string> {
  try {
    const [
      totalVillages,
      villages,
      totalCustomers,
      customersWithUdhaar,
      allCustomers,
      recentOrders,
      recentPayments,
    ] = await Promise.all([
      prisma.village.count({ where: { isActive: true } }),
      prisma.village.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          taluk: true,
          district: true,
          _count: { select: { customers: true, orders: true } },
        },
        take: 30,
      }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.findMany({
        where: { isActive: true, currentBalance: { gt: 0 } },
        orderBy: { currentBalance: "desc" },
        take: 15,
        include: { village: { select: { name: true, code: true } } },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, currentBalance: true, creditLimit: true, villageId: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { name: true, customerCode: true } },
          village: { select: { name: true } },
          items: { select: { name: true, quantity: true, unit: true, pricePerUnit: true, lineTotal: true } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 10,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    let totalUdhaarOwed = 0;
    for (const c of allCustomers) {
      totalUdhaarOwed += Number(c.currentBalance);
    }

    // Calculate village-wise debt
    const villageDebtMap = new Map<string, number>();
    for (const c of allCustomers) {
      const cur = villageDebtMap.get(c.villageId) || 0;
      villageDebtMap.set(c.villageId, cur + Number(c.currentBalance));
    }

    const villageLines = villages.map((v) => {
      const debt = villageDebtMap.get(v.id) || 0;
      return `- ${v.name} (${v.code}): ${v._count.customers} customers, ${v._count.orders} orders, Total Udhaar: ₹${debt.toFixed(2)}`;
    });

    const debtorLines = customersWithUdhaar.map((c, idx) => {
      return `${idx + 1}. ${c.name} (${c.customerCode}, Village: ${c.village.name}) — Owed: ₹${Number(c.currentBalance).toFixed(2)}, Limit: ₹${Number(c.creditLimit).toFixed(2)}, Mobile: ${c.mobile}`;
    });

    const recentOrderLines = recentOrders.map((o) => {
      const itemsList = o.items.map((i) => `${i.name} (${Number(i.quantity)} ${i.unit || 'pcs'} @ ₹${Number(i.pricePerUnit)})`).join(", ");
      return `- #${o.orderNumber}: Customer ${o.customer.name} (${o.village.name}), Total: ₹${Number(o.totalAmount).toFixed(2)} [${o.paymentType}] (Paid: ₹${Number(o.paidAmount).toFixed(2)}, Credit: ₹${Number(o.creditAmount).toFixed(2)}), Items: [${itemsList || 'N/A'}]`;
    });

    const paymentLines = recentPayments.map((p) => {
      return `- Ref: ${p.paymentRef}: Customer ${p.customer.name}, ₹${Number(p.amount).toFixed(2)} via ${p.method} [Status: ${p.status}, RRN: ${p.bankRrn || 'N/A'}]`;
    });

    return `
[LIVE KB KHATA DATABASE SNAPSHOT AS OF ${new Date().toLocaleString("en-IN")}]
- Total Active Villages: ${totalVillages}
- Total Active Customers: ${totalCustomers}
- Customers with Unpaid Udhaar: ${customersWithUdhaar.length}
- Total Outstanding Udhaar Across Shop: ₹${totalUdhaarOwed.toFixed(2)}

TOP INDEBTED CUSTOMERS (UDHAAR):
${debtorLines.length > 0 ? debtorLines.join("\n") : "None currently in debt."}

VILLAGE SUMMARY & DUES:
${villageLines.length > 0 ? villageLines.join("\n") : "None registered."}

RECENT ORDER TRANSACTIONS:
${recentOrderLines.length > 0 ? recentOrderLines.join("\n") : "No recent orders."}

RECENT PAYMENTS COLLECTED:
${paymentLines.length > 0 ? paymentLines.join("\n") : "No recent payments."}
[END DATABASE SNAPSHOT]
`;
  } catch (err: any) {
    console.error("[Assistant DB Snapshot] Error generating snapshot:", err.message);
    return "[Database snapshot temporarily unavailable]";
  }
}

/**
 * Format message array into Gemini-compatible contents structure
 */
function buildGeminiContents(
  prompt: string,
  history: MessagePayload[] = []
): Array<{ role: "user" | "model"; parts: { text: string }[] }> {
  const contents: Array<{ role: "user" | "model"; parts: { text: string }[] }> = [];

  for (const msg of history) {
    if (msg.role === "system") continue;
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  return contents;
}

/**
 * Generate a complete non-streaming response from Gemini
 */
export async function generateAssistantResponse(
  prompt: string,
  history: MessagePayload[] = []
): Promise<string> {
  const apiKey = getApiKey();
  const dbContext = await getLiveShopDatabaseContext();
  const systemInstruction = `${BASE_SYSTEM_PROMPT}\n\n${dbContext}`;
  const contents = buildGeminiContents(prompt, history);

  let lastError: any = null;

  for (const model of VERIFIED_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn(`[Assistant AI] Model ${model} returned error ${res.status}:`, errorData);
        lastError = new Error(errorData?.error?.message || `HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[Assistant AI] Network error with model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate response from AI models.");
}

/**
 * Creates an SSE ReadableStream that yields token chunks as they arrive from Gemini.
 * Injects real-time shop database grounding into the system prompt.
 */
export async function streamAssistantResponse(
  prompt: string,
  history: MessagePayload[] = [],
  signal?: AbortSignal
): Promise<{
  stream: ReadableStream<Uint8Array>;
  getFullText: () => Promise<string>;
}> {
  const apiKey = getApiKey();
  const dbContext = await getLiveShopDatabaseContext();
  const systemInstruction = `${BASE_SYSTEM_PROMPT}\n\n${dbContext}`;
  const contents = buildGeminiContents(prompt, history);

  let upstreamResponse: Response | null = null;
  let activeModel = VERIFIED_MODELS[0];

  for (const model of VERIFIED_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (res.ok && res.body) {
        upstreamResponse = res;
        activeModel = model;
        console.log(`[Assistant AI Stream] Connected to model: ${model}`);
        break;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[Assistant AI Stream] Model ${model} error:`, errJson);
      }
    } catch (err: any) {
      if (err.name === "AbortError") throw err;
      console.warn(`[Assistant AI Stream] Exception with model ${model}:`, err.message);
    }
  }

  if (!upstreamResponse || !upstreamResponse.body) {
    throw new Error("Unable to establish live AI streaming connection with Gemini models.");
  }

  const upstreamReader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let accumulatedText = "";
  let resolveFullText: (text: string) => void;
  let rejectFullText: (err: any) => void;
  const fullTextPromise = new Promise<string>((resolve, reject) => {
    resolveFullText = resolve;
    rejectFullText = reject;
  });

  const transformStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          if (signal?.aborted) {
            upstreamReader.cancel();
            break;
          }

          const { done, value } = await upstreamReader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataPayload = trimmed.slice(6).trim();
              if (!dataPayload || dataPayload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataPayload);
                const chunkText =
                  parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (chunkText) {
                  accumulatedText += chunkText;
                  const clientEvent = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
                  controller.enqueue(encoder.encode(clientEvent));
                }
              } catch {
                // Ignore partial JSON chunks
              }
            }
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
        resolveFullText(accumulatedText);
      } catch (err: any) {
        rejectFullText(err);
        controller.error(err);
      }
    },
    cancel() {
      upstreamReader.cancel();
      resolveFullText(accumulatedText);
    },
  });

  return {
    stream: transformStream,
    getFullText: () => fullTextPromise,
  };
}

/**
 * Generate a concise title for a new conversation based on the first prompt
 */
export async function generateConversationTitle(firstPrompt: string): Promise<string> {
  try {
    const cleaned = firstPrompt.trim().replace(/\s+/g, " ");
    if (cleaned.length <= 35) {
      return cleaned;
    }
    const words = cleaned.split(" ").slice(0, 5);
    const candidate = words.join(" ");
    return candidate.length > 35 ? candidate.slice(0, 32) + "..." : candidate;
  } catch {
    return "New Conversation";
  }
}
