import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN" },
    });

    const adminEmail = process.env.EMAIL_USER || "noreply.kb.app@gmail.com";
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
    return NextResponse.json({ error: error.message || "Failed to dispatch admin OTP." }, { status: 500 });
  }
}
