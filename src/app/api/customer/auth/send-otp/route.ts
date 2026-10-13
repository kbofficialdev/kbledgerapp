import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.phone || body.mobile || body.email;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Mobile number or email is required." }, { status: 400 });
    }

    const cleanInput = identifier.trim();

    // Find customer by mobile, email, or code
    const customer = await prisma.customer.findFirst({
      where: {
        isActive: true,
        OR: [
          { mobile: cleanInput },
          { email: { equals: cleanInput, mode: "insensitive" } },
          { customerCode: { equals: cleanInput, mode: "insensitive" } },
        ],
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "No customer account found with this mobile/email. Please verify or contact KB Khata store." },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        {
          error: `Customer ${customer.name} does not have an email registered. Please ask store admin to add your email for OTP verification.`,
        },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP and send via SMTP
    const otp = generateOtp(customer.email);
    const sent = await sendOtpEmail({
      to: customer.email,
      name: customer.name,
      otp,
      role: "CUSTOMER",
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to dispatch verification email. Please try again shortly." },
        { status: 500 }
      );
    }

    // Mask email for display
    const [userPart, domain] = customer.email.split("@");
    const maskedUser = userPart.length > 2 ? `${userPart.slice(0, 2)}***` : `${userPart}***`;
    const maskedEmail = `${maskedUser}@${domain}`;

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${maskedEmail}`,
      maskedEmail,
      customerId: customer.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to send verification code. Please try again.") },
      { status: 500 }
    );
  }
}

