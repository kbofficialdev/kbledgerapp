import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    const expectedPin = process.env.ADMIN_FALLBACK_PIN || "123456";

    if (!pin || pin.trim() !== expectedPin) {
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

    const adminEmail = process.env.EMAIL_USER || "noreply.kb.app@gmail.com";
    const otp = generateOtp("admin_mfa");
    await sendOtpEmail({
      to: adminEmail,
      name: "KB Store Admin",
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
        username: "kbadmin",
        role: "ADMIN",
        loginMethod: "EMERGENCY_PIN",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

