/**
 * Google Gemini AI Assistant Client for KB Khata Store
 */

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function askGeminiAssistant({
  prompt,
  conversationHistory = [],
  dbContextSummary = "",
}: {
  prompt: string;
  conversationHistory?: Array<{ role: "user" | "model"; text: string }>;
  dbContextSummary?: string;
}): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    "";

  const systemInstruction = `
You are the dedicated AI Business Advisor & Ledger Assistant for "KB Khata & Fashions", an offline village store ledger & bahi-khata management system.
Merchant: KB Fashions
Google Pay VPA: kbfashions.eazypay@icici

Terminology Rules:
- "Debit" / "నగదు (Nagathu)": Paid full payment on the spot at counter.
- "Credit" / "ఉద్ధార (Udhaar)": Unpaid balance owed by the customer, added to bahi-khata ledger.
- "Partial" / "పాక్షిక చెల్లింపు": Part paid in cash/UPI, remainder added to Udhaar.

Your Duties:
1. Provide accurate, professional, and friendly store guidance based on the store's database context provided.
2. If asked in Telugu, answer fluently and courteously in Telugu (తెలుగు) with clear financial summaries.
3. If asked in English or Hinglish, answer clearly with structured points, bold totals, and rupee symbols (₹).
4. You can analyze customer balances, highest debt villages, collections today, payment reconciliations, stock advice, and ledger entries.
5. Keep your answers concise, practical for a shopkeeper/clerk, and actionable.

Current Store Database Context:
${dbContextSummary || "No extra context provided."}
`;

  // Build contents array
  const contents: GeminiMessage[] = [];

  // Add conversation history
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }

  // Add the current prompt with system instruction attached
  contents.push({
    role: "user",
    parts: [
      {
        text: `[System Instruction: ${systemInstruction}]\n\nUser Question: ${prompt}`,
      },
    ],
  });

  const modelsToTry = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`[Gemini API] Model ${model} returned error:`, errorData?.error?.message || response.statusText);
        lastError = new Error(errorData?.error?.message || `HTTP ${response.status}`);
        continue; // Try next model
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (err) {
      console.warn(`[Gemini API] Request failed for model ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to get response from Gemini AI models.");
}

