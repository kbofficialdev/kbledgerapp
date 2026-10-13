import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedIdentifier = (body.identifier || body.email || body.mobile || body.username || "").trim();

    if (!requestedIdentifier) {
      return NextResponse.json(
        { error: "Administrator email, mobile number, or username is required." },
        { status: 400 }
      );
    }

    const admins = await prisma.adminProfile.findMany({
      where: { role: "ADMIN" },
    });

    const cleanDigits = requestedIdentifier.replace(/\D/g, "");
    const admin = admins.find(
      (a) =>
        (a.email && a.email.toLowerCase() === requestedIdentifier.toLowerCase()) ||
        (a.mobile && cleanDigits.length >= 10 && a.mobile.includes(cleanDigits)) ||
        (a.username && a.username.toLowerCase() === requestedIdentifier.toLowerCase())
    );

    if (!admin) {
      return NextResponse.json(
        { error: "No administrator account matches this identifier." },
        { status: 404 }
      );
    }

    const adminEmail = admin?.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
      return NextResponse.json(
        { error: "No administrator email is configured." },
        { status: 400 }
      );
    }

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
      { error: sanitizeApiError(error, "Failed to dispatch administrator security code.") },
      { status: 500 }
    );
  }
}
