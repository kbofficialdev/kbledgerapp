/**
 * Universal Error Sanitizer for KB Khata API Endpoints
 * Prevents leaking internal database exceptions, stack traces, cloud quota limits,
 * or credentials to clients, while preserving clean user-facing validation errors.
 */

const LEAK_PATTERNS = [
  /prisma/i,
  /database/i,
  /sql/i,
  /unique constraint/i,
  /foreign key/i,
  /relation.*does not exist/i,
  /syntax error/i,
  /quota exceeded/i,
  /rate limit/i,
  /generativelanguage/i,
  /gemini/i,
  /cashfree.*secret/i,
  /api key/i,
  /econnrefused/i,
  /enotfound/i,
  /timeout/i,
  /at\s+[\w.<>]+:\d+/i,
  /node_modules/i,
  /jwt/i,
  /secret/i,
  /undefined/i,
  /null/i,
];

export function sanitizeApiError(
  error: unknown,
  fallbackMessage = "An error occurred while processing your request. Please try again or contact store support."
): string {
  if (!error) return fallbackMessage;

  const rawMessage =
    typeof error === "string"
      ? error
      : (error as any)?.message || (error as any)?.toString() || "";

  // Check if message contains sensitive leaked patterns
  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(rawMessage)) {
      return fallbackMessage;
    }
  }

  // If message is too long, it's likely a dump or HTML error page
  if (rawMessage.length > 150) {
    return fallbackMessage;
  }

  return rawMessage || fallbackMessage;
}
