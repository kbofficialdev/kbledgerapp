import prisma from "@/lib/prisma";

export function computeTokenHash(token: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("crypto");
    return nodeCrypto.createHash("sha256").update(token).digest("hex");
  } catch {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Enforces "One IP, One Session, One Account":
 * 1. Invalidates any existing active sessions for this account (one active session per account).
 * 2. Records the new active session in PostgreSQL with the client IP address and expiration.
 */
export async function registerActiveSessionInDb(params: {
  identifier: string;
  role: "ADMIN" | "CUSTOMER";
  token: string;
  ipAddress: string;
  userAgent?: string | null;
  expiresAt: number;
}): Promise<void> {
  const tokenHash = computeTokenHash(params.token);

  // 1. One Account = One Active Session:
  // Invalidate any existing active sessions for this account
  await prisma.activeSession.updateMany({
    where: {
      identifier: params.identifier,
      role: params.role,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // 2. Persist the single active session for this account & IP
  await prisma.activeSession.create({
    data: {
      identifier: params.identifier,
      role: params.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent || null,
      tokenHash,
      expiresAt: new Date(params.expiresAt * 1000),
      isActive: true,
    },
  });
}

/**
 * Validates that an active session exists in PostgreSQL, has not been invalidated
 * by another login, has not expired, and matches the calling IP.
 */
export async function validateActiveSessionInDb(
  token: string,
  clientIp?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const tokenHash = computeTokenHash(token);
    const session = await prisma.activeSession.findUnique({
      where: { tokenHash },
    });

    if (!session || !session.isActive) {
      return {
        valid: false,
        error: "Session has been invalidated or terminated by another login (Single Session Concurrency Enforced).",
      };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, error: "Session has expired in the security registry." };
    }

    // IP Check: Allow localhost loopback (127.0.0.1 / ::1)
    if (
      clientIp &&
      clientIp !== "127.0.0.1" &&
      clientIp !== "::1" &&
      session.ipAddress !== "127.0.0.1" &&
      session.ipAddress !== "::1" &&
      clientIp !== session.ipAddress
    ) {
      return {
        valid: false,
        error: "IP address mismatch detected. One IP, One Session policy violation.",
      };
    }

    // Update last active timestamp
    await prisma.activeSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return { valid: true };
  } catch (err: any) {
    console.error("validateActiveSessionInDb error:", err);
    return { valid: true }; // Fallback to token cryptographic check on DB read failure
  }
}

/**
 * Invalidates an active session in the database upon logout
 */
export async function invalidateSessionInDb(token: string): Promise<void> {
  try {
    const tokenHash = computeTokenHash(token);
    await prisma.activeSession.updateMany({
      where: { tokenHash },
      data: { isActive: false },
    });
  } catch (err) {
    console.error("invalidateSessionInDb error:", err);
  }
}

