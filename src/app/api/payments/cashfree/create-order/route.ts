import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { authGuard } from "@/lib/auth";
import { sanitizeApiError } from "@/lib/api-error";
import { PaymentTokenService } from "@/modules/payments";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      orderAmount,
      orderId,
      orderIds,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerDetails = {},
      orderMeta = {},
      billingDraft,
      note,
      orderType,
    } = body;

    const parsedAmount = Number(amount ?? orderAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount. Amount must be positive." },
        { status: 400 }
      );
    }

    const principal = await authGuard.resolvePrincipal(req);
    const effectiveBillingDraft = billingDraft || orderMeta?.billingDraft || null;
    const effectiveOrderType =
      orderType ||
      orderMeta?.orderType ||
      (effectiveBillingDraft ? "COUNTER_BILL" : "DEBT_CLEARANCE");
    const effectiveOrderIds = Array.isArray(orderIds)
      ? orderIds
      : Array.isArray(orderMeta?.orderIds)
        ? orderMeta.orderIds
        : [];

    const effCustomerId =
      customerId ||
      customerDetails.customerId ||
      effectiveBillingDraft?.customerId ||
      principal.customerId;
    const effCustomerPhone = customerPhone || customerDetails.customerPhone || "";

    const isAuthorized =
      principal.isAuthenticated() ||
      Boolean(effCustomerPhone) ||
      Boolean(req.headers.get("authorization"));

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }

    // Resolve Customer in DB by ID or phone so webhook always has customerId and real contact details
    let customer = null;
    if (effCustomerId) {
      customer = await prisma.customer
        .findUnique({
          where: { id: effCustomerId },
        })
        .catch(() => null);
    }
    if (!customer && effCustomerPhone) {
      const cleanedMobile = String(effCustomerPhone).replace(/\D/g, "").slice(-10);
      if (cleanedMobile.length === 10) {
        customer = await prisma.customer
          .findUnique({
            where: { mobile: cleanedMobile },
          })
          .catch(() => null);
      }
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer account not found in database. Please select a valid registered customer.",
        },
        { status: 404 }
      );
    }

    if (!customer.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "This customer account is disabled/blacklisted and cannot initiate payments.",
        },
        { status: 403 }
      );
    }

    // Resolve email strictly from customer record or active admin record in DB (never hardcoded)
    let resolvedEmail = customer.email || customerEmail || customerDetails.customerEmail || undefined;
    if (!resolvedEmail) {
      const activeAdmin = await prisma.adminProfile
        .findFirst({
          select: { email: true },
        })
        .catch(() => null);
      resolvedEmail = activeAdmin?.email || undefined;
    }

    // Generate unique Cashfree order ID
    const cfOrderId = orderId || `CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentRef = `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const effectiveNote =
      note ||
      orderMeta?.notes ||
      (effectiveOrderType === "COUNTER_BILL"
        ? `Counter Bill for ${customer.name}`
        : `Khata Debt Clearance for ${customer.name}`);

    // Call Cashfree REST API to create the order & payment_session_id
    const cfResponse = await cashfreeGateway.createOrder({
      orderId: cfOrderId,
      orderAmount: parsedAmount,
      customerDetails: {
        customerId: customer.id,
        customerName: customer.name || customerName || customerDetails.customerName,
        customerPhone: customer.mobile,
        customerEmail: resolvedEmail,
      },
      orderNote: effectiveNote,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${
        principal.isAdmin() ? "admin/billing/receipt" : "customer"
      }?order_id={order_id}`,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/cashfree/webhook`,
    });

    if (!cfResponse.payment_session_id) {
      return NextResponse.json(
        { success: false, error: "Cashfree did not return a valid payment_session_id." },
        { status: 502 }
      );
    }

    // Record initial PENDING payment with full webhook & midway-exit recovery metadata in PostgreSQL
    const validOrderId =
      orderId && !String(orderId).startsWith("CF_")
        ? await prisma.order
            .findUnique({ where: { id: orderId }, select: { id: true } })
            .then((o) => o?.id || null)
            .catch(() => null)
        : effectiveOrderIds.length === 1
          ? await prisma.order
              .findUnique({ where: { id: effectiveOrderIds[0] }, select: { id: true } })
              .then((o) => o?.id || null)
              .catch(() => null)
          : null;

    await prisma.payment.create({
      data: {
        paymentRef,
        cashfreeOrderId: cfOrderId,
        paymentSessionId: cfResponse.payment_session_id,
        customerId: customer.id,
        orderId: validOrderId,
        amount: parsedAmount,
        method: "CASHFREE_ELEMENTS",
        status: "PENDING",
        notes: effectiveNote,
        rawGatewayResponse: {
          webhookState: "PENDING_CHECKOUT",
          createdAt: new Date().toISOString(),
          orderType: effectiveOrderType,
          selectedOrderIds: effectiveOrderIds,
          billingDraft: effectiveBillingDraft,
        },
      },
    });

    // Generate cryptographically signed checkout session token for dedicated checkout page
    const token = PaymentTokenService.signCheckoutToken({
      orderId: cfOrderId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      customerEmail: resolvedEmail,
      amount: parsedAmount,
      currency: cfResponse.order_currency || "INR",
      orderType: effectiveOrderType,
      paymentSessionId: cfResponse.payment_session_id,
      gateway: "CASHFREE",
      environment: cashfreeGateway.getEnvironment(),
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?orderId=${encodeURIComponent(cfOrderId)}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/failed?orderId=${encodeURIComponent(cfOrderId)}`,
      notes: effectiveNote,
      ttlSeconds: 1200,
    });

    const checkoutUrl = `/checkout/pay?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      success: true,
      orderId: cfOrderId,
      order_id: cfOrderId,
      paymentSessionId: cfResponse.payment_session_id,
      payment_session_id: cfResponse.payment_session_id,
      token,
      checkoutUrl,
      cfOrderId,
      cf_order_id: cfResponse.cf_order_id || cfOrderId,
      amount: parsedAmount,
      currency: cfResponse.order_currency,
      environment: cashfreeGateway.getEnvironment(),
      webhookEndpoint: "/api/payments/cashfree/webhook",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeApiError(
          error,
          "Failed to initialize payment gateway. Please check details and try again."
        ),
      },
      { status: 500 }
    );
  }
}
