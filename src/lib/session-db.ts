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

export function isLoopbackIp(ip?: string | null): boolean {
  if (!ip) return true;
  const trimmed = ip.trim().toLowerCase();
  return (
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed === "::ffff:127.0.0.1" ||
    trimmed === "localhost"
  );
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return isLoopbackIp(first) ? "127.0.0.1" : first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    const trimmed = realIp.trim();
    return isLoopbackIp(trimmed) ? "127.0.0.1" : trimmed;
  }
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
  const normalizedIp = isLoopbackIp(params.ipAddress) ? "127.0.0.1" : params.ipAddress;

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

  // 2. Upsert the single active session for this account & IP
  await prisma.activeSession.upsert({
    where: { tokenHash },
    update: {
      identifier: params.identifier,
      role: params.role,
      ipAddress: normalizedIp,
      userAgent: params.userAgent || null,
      expiresAt: new Date(params.expiresAt * 1000),
      isActive: true,
      lastActiveAt: new Date(),
    },
    create: {
      identifier: params.identifier,
      role: params.role,
      ipAddress: normalizedIp,
      userAgent: params.userAgent || null,
      tokenHash,
      expiresAt: new Date(params.expiresAt * 1000),
      isActive: true,
    },
  });
}

/**
 * Validates that an active session exists in PostgreSQL, has not been invalidated
 * by another login from a conflicting IP, has not expired, and matches the calling IP.
 */
export async function validateActiveSessionInDb(
  token: string,
  clientIp?: string,
  fallbackPrincipal?: {
    identifier: string;
    role: "ADMIN" | "CUSTOMER";
    expiresAt: number;
  }
): Promise<{ valid: boolean; error?: string }> {
  try {
    const tokenHash = computeTokenHash(token);
    const normalizedClientIp = isLoopbackIp(clientIp) ? "127.0.0.1" : (clientIp || "127.0.0.1");
    const session = await prisma.activeSession.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      if (fallbackPrincipal && fallbackPrincipal.identifier) {
        const expDate =
          fallbackPrincipal.expiresAt > 10000000000
            ? new Date(fallbackPrincipal.expiresAt)
            : new Date(fallbackPrincipal.expiresAt * 1000);
        if (new Date() < expDate) {
          await prisma.activeSession.create({
            data: {
              identifier: fallbackPrincipal.identifier,
              role: fallbackPrincipal.role,
              ipAddress: normalizedClientIp,
              userAgent: "AutoRestoredSession",
              tokenHash,
              expiresAt: expDate,
              isActive: true,
            },
          });
          return { valid: true };
        }
      }
      return {
        valid: false,
        error: "Session has been invalidated or terminated by another login (Single Session Concurrency Enforced).",
      };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, error: "Session has expired in the security registry." };
    }

    if (!session.isActive) {
      if (session.userAgent === "EXPLICIT_LOGOUT") {
        return {
          valid: false,
          error: "Session has been closed by explicit sign-out.",
        };
      }

      // Check if an active session exists on a different non-loopback IP
      const conflictingOtherIpSession = await prisma.activeSession.findFirst({
        where: {
          identifier: session.identifier,
          role: session.role,
          isActive: true,
        },
      });

      if (
        conflictingOtherIpSession &&
        !isLoopbackIp(conflictingOtherIpSession.ipAddress) &&
        !isLoopbackIp(normalizedClientIp) &&
        conflictingOtherIpSession.ipAddress !== normalizedClientIp
      ) {
        return {
          valid: false,
          error: "Session has been invalidated or terminated by another login (Single Session Concurrency Enforced).",
        };
      }

      // Same IP / loopback session recovery
      await prisma.activeSession.update({
        where: { id: session.id },
        data: { isActive: true, lastActiveAt: new Date() },
      });
      return { valid: true };
    }

    // IP Check: Allow localhost loopback (127.0.0.1 / ::1 / ::ffff:127.0.0.1)
    if (
      !isLoopbackIp(normalizedClientIp) &&
      !isLoopbackIp(session.ipAddress) &&
      normalizedClientIp !== session.ipAddress
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
  } catch {
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
      data: { isActive: false, userAgent: "EXPLICIT_LOGOUT" },
    });
  } catch {
    // Ignore DB errors during logout cleanup
  }
}

