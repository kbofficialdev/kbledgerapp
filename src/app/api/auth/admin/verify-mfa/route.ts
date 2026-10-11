import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/email";

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

    // Success: Generate admin session token
    const sessionToken = `kb_adm_mfa_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await prisma.systemAuditLog.create({
      data: {
        actor: username,
        action: "ADMIN_MFA_LOGIN_SUCCESS",
        metadata: { sessionToken: sessionToken.slice(0, 16) },
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

    response.cookies.set("kb_admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Admin MFA Verification Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to verify admin MFA." }, { status: 500 });
  }
}
