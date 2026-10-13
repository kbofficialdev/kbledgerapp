import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedIdentifier = (body.identifier || body.email || body.mobile || "").trim();

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
    const matchedAdmin = admins.find(
      (admin) =>
        (admin.email && admin.email.toLowerCase() === requestedIdentifier.toLowerCase()) ||
        (admin.mobile && cleanDigits.length >= 10 && admin.mobile.includes(cleanDigits)) ||
        (admin.username && admin.username.toLowerCase() === requestedIdentifier.toLowerCase())
    );

    if (!matchedAdmin) {
      return NextResponse.json(
        { error: "No administrator account matches this identifier. Please verify." },
        { status: 404 }
      );
    }

    const adminEmail = matchedAdmin.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
      return NextResponse.json(
        { error: "Administrator account does not have a verified email configured." },
        { status: 400 }
      );
    }

    const otp = generateOtp("admin_mfa");

    await sendOtpEmail({
      to: adminEmail,
      name: matchedAdmin.username || "KB Store Admin",
      otp,
      role: "ADMIN",
    });

    await prisma.systemAuditLog.create({
      data: {
        actor: matchedAdmin.username || "kbadmin",
        action: "ADMIN_LOGIN_OTP_DISPATCHED",
        metadata: { dispatchedTo: adminEmail },
      },
    });

    const maskedEmail = adminEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      success: true,
      message: `Security OTP dispatched to ${maskedEmail}`,
      maskedEmail,
      username: matchedAdmin.username,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to dispatch administrator security code. Please try again.") },
      { status: 500 }
    );
  }
}
