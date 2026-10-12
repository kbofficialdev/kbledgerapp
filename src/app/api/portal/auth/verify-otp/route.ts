import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtp } from "@/lib/email";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

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

    // Generate cryptographically signed customer session token
    const sessionToken = await createCustomerToken(customer.id);

    const response = NextResponse.json({
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      customerCode: customer.customerCode,
      portalUrl: "/portal",
      sessionToken,
    });

    setCustomerCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    console.error("[Portal Verify OTP Error]:", error);
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to verify authentication code. Please try again.") },
      { status: 500 }
    );
  }
}
