import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/email";
import { createAdminToken, setAdminCookie } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { otp, pin, username } = await req.json();

    let isValid = false;
    let resolvedUsername = username || "kbadmin";

    const admins = await prisma.adminProfile.findMany({
      where: { role: "ADMIN" },
    });

    if (admins.length > 0 && !username) {
      resolvedUsername = admins[0].username;
    }

    // Check emergency PIN fallback if provided (against DB AdminProfile or .env)
    if (pin && typeof pin === "string") {
      const cleanPin = pin.trim();
      const envEmergencyPin = process.env.ADMIN_EMERGENCY_PIN;
      const envFallbackPin = process.env.ADMIN_FALLBACK_PIN;
      const matchedByPin = admins.find(
        (a) => a.fallbackPinHash && a.fallbackPinHash === cleanPin
      );
      if (
        (envEmergencyPin && cleanPin === envEmergencyPin) ||
        (envFallbackPin && cleanPin === envFallbackPin) ||
        matchedByPin
      ) {
        isValid = true;
        if (matchedByPin) {
          resolvedUsername = matchedByPin.username;
        }
      }
    }

    // Check OTP code if provided
    if (!isValid && otp && typeof otp === "string" && otp.trim().length === 6) {
      const cleanOtp = otp.trim();
      const matchedByPin = admins.find(
        (a) => a.fallbackPinHash && a.fallbackPinHash === cleanOtp
      );
      if (matchedByPin) {
        isValid = true;
        resolvedUsername = matchedByPin.username;
      } else {
        const verification = verifyOtp("admin_mfa", cleanOtp);
        if (verification.valid) {
          isValid = true;
        } else {
          return NextResponse.json({ error: verification.message }, { status: 401 });
        }
      }
    }

    if (!isValid) {
      await prisma.systemAuditLog.create({
        data: {
          actor: resolvedUsername,
          action: "ADMIN_LOGIN_FAILED",
          metadata: { reason: "Invalid OTP or PIN code" },
        },
      });
      return NextResponse.json({ error: "Invalid verification code or PIN." }, { status: 401 });
    }

    // Success: Generate cryptographically signed admin session token bound to IP
    const { extractClientIp, registerActiveSessionInDb } = await import("@/lib/session-db");
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers.get("user-agent");
    const sessionId = `adm_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ttlSeconds = 24 * 3600;
    const sessionToken = await createAdminToken(resolvedUsername, ttlSeconds, ipAddress, sessionId);

    // Enforce "One IP, One Session, One Account"
    await registerActiveSessionInDb({
      identifier: resolvedUsername,
      role: "ADMIN",
      token: sessionToken,
      ipAddress,
      userAgent,
      expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
    });

    await prisma.systemAuditLog.create({
      data: {
        actor: resolvedUsername,
        action: "ADMIN_LOGIN_SUCCESS",
        metadata: { sessionTokenSnippet: sessionToken.slice(0, 16), ipAddress },
        ipAddress,
        userAgent,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Administrator session verified successfully.",
      adminUrl: "/admin",
      sessionToken,
      admin: {
        username: resolvedUsername,
        role: "ADMIN",
        lastLoginAt: new Date(),
      },
    });

    setAdminCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to verify admin authentication. Please try again.") },
      { status: 500 }
    );
  }
}
