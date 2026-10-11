/**
 * Server-Side Model Adapter for KB AI Assistant
 * Interacts with Google Gemini AI models with streaming and fallback support.
 * All secret credentials remain strictly on the server.
 */

export interface MessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

const SYSTEM_INSTRUCTION = `You are KB AI Assistant, an advanced, articulate, and thoughtful conversational AI assistant.
Your goal is to provide accurate, high-quality, and structured answers to whatever the user asks.

Formatting rules:
- Format all code, commands, and scripts inside fenced code blocks with language identifiers (e.g. \`\`\`typescript, \`\`\`python, \`\`\`bash).
- Use Markdown formatting (bold, italic, numbered lists, bullet points, headers, tables) for clarity and readability.
- Be concise, direct, and avoid redundant conversational filler or preambles.
- Answer in the same language the user uses (e.g. English, Telugu, Hindi).
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
 * Format message array into Gemini-compatible contents structure
 */
function buildGeminiContents(
  prompt: string,
  history: MessagePayload[] = []
): Array<{ role: "user" | "model"; parts: { text: string }[] }> {
  const contents: Array<{ role: "user" | "model"; parts: { text: string }[] }> = [];

  // Filter out system messages and map roles
  for (const msg of history) {
    if (msg.role === "system") continue;
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Append user's current prompt
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
  const contents = buildGeminiContents(prompt, history);
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
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
 * Calls onComplete callback with full generated text when finished.
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
  const contents = buildGeminiContents(prompt, history);
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  let upstreamResponse: Response | null = null;
  let activeModel = PRIMARY_MODEL;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (res.ok && res.body) {
        upstreamResponse = res;
        activeModel = model;
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
    throw new Error("Unable to establish live AI streaming connection.");
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
                  // Send as custom client SSE event
                  const clientEvent = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
                  controller.enqueue(encoder.encode(clientEvent));
                }
              } catch (parseErr) {
                // Ignore partial JSON chunks
              }
            }
          }
        }

        // Send completion event
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

    // Fast heuristic title: first 4 to 6 words
    const words = cleaned.split(" ").slice(0, 5);
    const candidate = words.join(" ");
    return candidate.length > 35 ? candidate.slice(0, 32) + "..." : candidate;
  } catch {
    return "New Conversation";
  }
}
