import { NextRequest, NextResponse } from "next/server";
import { PaymentTokenService, SecurityValidationError } from "@/modules/payments/payment-token.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/validate?token={token}
 * Validates cryptographically signed checkout tokens.
 * Blocks all unofficial, tampered, or expired checkout requests.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing checkout security token. Unofficial payment access blocked.",
        code: "ERR_TOKEN_MISSING",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Cryptographically verify signature and expiry
    const payload = PaymentTokenService.verifyCheckoutToken(token);

    // 2. Validate customer in database
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: {
        id: true,
        name: true,
        customerCode: true,
        mobile: true,
        email: true,
        isActive: true,
        currentBalance: true,
        village: { select: { id: true, name: true, code: true } },
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer record not found. Checkout access denied.",
          code: "ERR_CUSTOMER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (!customer.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "This customer account is disabled/blacklisted. Payments are suspended.",
          code: "ERR_CUSTOMER_DISABLED",
        },
        { status: 403 }
      );
    }

    // 3. Check for existing payment status in DB
    const payment = await prisma.payment.findUnique({
      where: { cashfreeOrderId: payload.orderId },
      select: {
        id: true,
        status: true,
        amount: true,
        method: true,
        paymentRef: true,
        paidAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      payload: {
        ...payload,
        customer: {
          id: customer.id,
          name: customer.name,
          customerCode: customer.customerCode,
          mobile: customer.mobile,
          email: customer.email,
          villageName: customer.village?.name,
          currentBalance: Number(customer.currentBalance),
        },
        paymentRecord: payment
          ? {
              status: payment.status,
              amount: Number(payment.amount),
              paymentRef: payment.paymentRef,
            }
          : null,
      },
    });
  } catch (error: any) {
    const isSecurityError = error instanceof SecurityValidationError;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unauthorized payment request.",
        code: isSecurityError ? error.code : "ERR_UNAUTHORIZED_ACCESS",
      },
      { status: 403 }
    );
  }
}
