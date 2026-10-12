import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedIdentifier = (body.identifier || body.email || body.mobile || "").trim();

    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN" },
    });

    if (!requestedIdentifier) {
      return NextResponse.json(
        { error: "Administrator email, mobile number, or username is required." },
        { status: 400 }
      );
    }

    const cleanDigits = requestedIdentifier.replace(/\D/g, "");
    const isMatch =
      (admin?.email && admin.email.toLowerCase() === requestedIdentifier.toLowerCase()) ||
      (admin?.mobile && cleanDigits.length >= 10 && admin.mobile.includes(cleanDigits)) ||
      (admin?.username && admin.username.toLowerCase() === requestedIdentifier.toLowerCase());

    if (!isMatch) {
      return NextResponse.json(
        { error: "No administrator account matches this identifier. Please verify." },
        { status: 404 }
      );
    }

    const adminEmail = admin?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "bhavithkumar9394@gmail.com";
    const otp = generateOtp("admin_mfa");

    await sendOtpEmail({
      to: adminEmail,
      name: admin?.username || "KB Store Admin",
      otp,
      role: "ADMIN",
    });

    await prisma.systemAuditLog.create({
      data: {
        actor: admin?.username || "kbadmin",
        action: "ADMIN_LOGIN_OTP_DISPATCHED",
        metadata: { dispatchedTo: adminEmail },
      },
    });

    const maskedEmail = adminEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      success: true,
      message: `Security OTP dispatched to ${maskedEmail}`,
      maskedEmail,
    });
  } catch (error: any) {
    console.error("[Admin Send OTP Error]:", error);
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to dispatch administrator security code. Please try again.") },
      { status: 500 }
    );
  }
}

