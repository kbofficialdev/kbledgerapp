import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeGateway } from "@/lib/cashfree";
import { authGuard } from "@/lib/auth";
import { sanitizeApiError } from "@/lib/api-error";

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
      orderType, // "BILLING_ORDER" | "DEBT_CLEARANCE"
    } = body;

    const parsedAmount = Number(amount ?? orderAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount. Amount must be positive." },
        { status: 400 }
      );
    }

    const principal = await authGuard.resolvePrincipal(req);
    const effCustomerId = customerId || customerDetails.customerId || principal.customerId;
    const effCustomerName = customerName || customerDetails.customerName || "KB Customer";
    const effCustomerPhone = customerPhone || customerDetails.customerPhone || "9999999999";
    const effCustomerEmail = customerEmail || customerDetails.customerEmail || "customer@kbkhata.store";

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

    // Resolve Customer in DB by ID or phone so webhook always has customerId
    let customer = null;
    if (effCustomerId) {
      customer = await prisma.customer
        .findUnique({
          where: { id: effCustomerId },
        })
        .catch(() => null);
    }
    if (!customer && effCustomerPhone && effCustomerPhone !== "9999999999") {
      const cleanedMobile = String(effCustomerPhone).replace(/\D/g, "").slice(-10);
      if (cleanedMobile.length === 10) {
        customer = await prisma.customer
          .findUnique({
            where: { mobile: cleanedMobile },
          })
          .catch(() => null);
      }
    }

    // Generate unique Cashfree order ID
    const cfOrderId = orderId || `CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentRef = `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const effectiveNote =
      note ||
      orderMeta?.notes ||
      (orderType === "DEBT_CLEARANCE" ? "Khata Debt Clearance" : "KB Khata Online Payment");

    // Call Cashfree REST API to create the order & payment_session_id
    const cfResponse = await cashfreeGateway.createOrder({
      orderId: cfOrderId,
      orderAmount: parsedAmount,
      customerDetails: {
        customerId: customer?.id || effCustomerId || `cust_${Date.now()}`,
        customerName: customer?.name || effCustomerName,
        customerPhone: customer?.mobile || effCustomerPhone,
        customerEmail: customer?.email || effCustomerEmail,
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

    // Record initial PENDING payment with full webhook recovery metadata in PostgreSQL
    if (customer) {
      const validOrderId =
        orderId && !String(orderId).startsWith("CF_")
          ? await prisma.order
              .findUnique({ where: { id: orderId }, select: { id: true } })
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
            orderType: orderType || "DEBT_CLEARANCE",
            selectedOrderIds: Array.isArray(orderIds) ? orderIds : [],
            billingDraft: billingDraft || null,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      orderId: cfOrderId,
      order_id: cfOrderId,
      paymentSessionId: cfResponse.payment_session_id,
      payment_session_id: cfResponse.payment_session_id,
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
