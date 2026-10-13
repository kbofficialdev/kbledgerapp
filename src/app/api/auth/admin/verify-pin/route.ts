import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    const admins = await prisma.adminProfile.findMany({
      where: { role: "ADMIN" },
    });

    const cleanPin = (pin || "").trim();
    const envFallbackPin = process.env.ADMIN_FALLBACK_PIN;
    const envEmergencyPin = process.env.ADMIN_EMERGENCY_PIN;
    const matchedAdmin = admins.find(
      (a) => a.fallbackPinHash && a.fallbackPinHash === cleanPin
    );

    const isValidPin =
      Boolean(cleanPin) &&
      ((envFallbackPin && cleanPin === envFallbackPin) ||
        (envEmergencyPin && cleanPin === envEmergencyPin) ||
        Boolean(matchedAdmin));

    if (!isValidPin) {
      await prisma.systemAuditLog.create({
        data: {
          actor: "ANONYMOUS_PIN_LOGIN",
          action: "PIN_LOGIN_FAILED",
        },
      });

      return NextResponse.json(
        { success: false, error: "Invalid administrator emergency PIN" },
        { status: 401 }
      );
    }

    const activeAdmin = matchedAdmin || admins[0];
    const adminEmail = activeAdmin?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, error: "No administrator email configured for OTP dispatch." },
        { status: 400 }
      );
    }

    const otp = generateOtp("admin_mfa");
    await sendOtpEmail({
      to: adminEmail,
      name: activeAdmin?.username || "KB Store Admin",
      otp,
      role: "ADMIN",
    });

    await prisma.systemAuditLog.create({
      data: {
        actor: "ADMIN_EMERGENCY_PIN",
        action: "PIN_VERIFIED_MFA_OTP_DISPATCHED",
        metadata: { dispatchedTo: adminEmail },
      },
    });

    const maskedEmail = adminEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      success: true,
      requiresMfa: true,
      maskedEmail,
      admin: {
        username: activeAdmin?.username || "kbadmin",
        role: "ADMIN",
        loginMethod: "EMERGENCY_PIN",
      },
    });
  } catch (error: any) {
    console.error("[Admin Verify PIN Error]:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify administrative PIN.") },
      { status: 500 }
    );
  }
}
