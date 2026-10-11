import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, otp } = await req.json();

    if (!identifier || !otp) {
      return NextResponse.json({ error: "Identifier and 6-digit OTP are required." }, { status: 400 });
    }

    const cleanInput = identifier.trim();

    const customer = await prisma.customer.findFirst({
      where: {
        isActive: true,
        OR: [
          { mobile: cleanInput },
          { email: { equals: cleanInput, mode: "insensitive" } },
          { customerCode: { equals: cleanInput, mode: "insensitive" } },
          { id: cleanInput },
        ],
      },
    });

    if (!customer || !customer.email) {
      return NextResponse.json({ error: "Customer not found or email not registered." }, { status: 404 });
    }

    // Verify OTP against email
    const verification = verifyOtp(customer.email, otp);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.message }, { status: 401 });
    }

    // Set secure customer session cookie (optional) & return redirect target
    const response = NextResponse.json({
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      portalUrl: `/portal/${customer.id}`,
    });

    response.cookies.set("kb_customer_session", customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Portal Verify OTP Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to verify OTP." }, { status: 500 });
  }
}

