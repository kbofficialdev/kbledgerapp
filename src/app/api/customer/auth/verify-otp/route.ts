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
      return NextResponse.json({ error: "Missing identifier or OTP code." }, { status: 400 });
    }

    const cleanInput = identifier.trim();

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

    if (!customer || !customer.email) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const verification = verifyOtp(customer.email, otp.trim());
    if (!verification.valid) {
      return NextResponse.json({ error: verification.message }, { status: 401 });
    }

    // Generate signed customer session token bound to IP
    const { extractClientIp, registerActiveSessionInDb } = await import("@/lib/session-db");
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers.get("user-agent");
    const sessionId = `cust_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ttlSeconds = 7 * 24 * 3600;
    const sessionToken = await createCustomerToken(customer.id, ttlSeconds, ipAddress, sessionId);

    // Enforce "One IP, One Session, One Account"
    await registerActiveSessionInDb({
      identifier: customer.id,
      role: "CUSTOMER",
      token: sessionToken,
      ipAddress,
      userAgent,
      expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
    });

    const response = NextResponse.json({
      success: true,
      message: "Customer authentication verified successfully.",
      customerUrl: `/customer`,
      portalUrl: `/customer`,
      customerId: customer.id,
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.customerCode,
        mobile: customer.mobile,
      },
    });

    setCustomerCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to verify authentication code. Please try again.") },
      { status: 500 }
    );
  }
}

