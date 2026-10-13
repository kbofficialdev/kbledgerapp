import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/email";
import { createAdminToken, setAdminCookie } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { otp, username = "kbadmin" } = await req.json();

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json({ error: "Please enter the valid 6-digit OTP code." }, { status: 400 });
    }

    const verification = verifyOtp("admin_mfa", otp.trim());
    if (!verification.valid) {
      await prisma.systemAuditLog.create({
        data: {
          actor: username,
          action: "ADMIN_MFA_OTP_FAILED",
          metadata: { reason: verification.message },
        },
      });
      return NextResponse.json({ error: verification.message }, { status: 401 });
    }

    // Success: Generate cryptographically signed admin session token
    const sessionToken = await createAdminToken(username);

    await prisma.systemAuditLog.create({
      data: {
        actor: username,
        action: "ADMIN_MFA_LOGIN_SUCCESS",
        metadata: { sessionTokenSnippet: sessionToken.slice(0, 16) },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Multi-Factor Authentication verified successfully.",
      sessionToken,
      admin: {
        username,
        role: "ADMIN",
        lastLoginAt: new Date(),
      },
    });

    setAdminCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to verify administrator security code.") },
      { status: 500 }
    );
  }
}

