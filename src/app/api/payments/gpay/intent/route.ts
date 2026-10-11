import { NextRequest, NextResponse } from "next/server";
import { createGPayPaymentIntent, getGPayConfig } from "@/lib/gpay";
import { PaymentSecurityPolicyEngine } from "@/lib/payment-policies";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      note,
      customerId,
      customerName,
      customerMobile,
      orderNumber,
      orderId,
      customTxnId,
    } = body;

    // 1. Validate Amount via Security Policy
    const amountVal = PaymentSecurityPolicyEngine.validateAmount(amount);
    if (!amountVal.valid) {
      return NextResponse.json(
        { success: false, error: amountVal.message },
        { status: 400 }
      );
    }

    // 2. Customer validation if customerId is passed
    let existingCustomer = null;
    if (customerId) {
      existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, mobile: true },
      });
      if (!existingCustomer) {
        return NextResponse.json(
          { success: false, error: "Referenced customer does not exist" },
          { status: 404 }
        );
      }
    }

    // 3. Create Google Pay UPI Intent and Dynamic QR
    const intentResult = await createGPayPaymentIntent({
      amount: amountVal.sanitizedValue,
      note: note || (orderNumber ? `Payment for Order ${orderNumber}` : "KB Khata Counter Payment"),
      customerName: customerName || existingCustomer?.name,
      customerMobile: customerMobile || existingCustomer?.mobile || undefined,
      orderNumber,
      customTxnId,
    });

    // 4. Record PENDING payment in database for tracking & reconciliation
    if (customerId) {
      const paymentRef = `GPAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await prisma.payment.create({
        data: {
          paymentRef,
          customerId,
          orderId: orderId || null,
          amount: intentResult.amount,
          method: "GOOGLE_PAY_QR",
          status: "PENDING",
          merchantTxnId: intentResult.merchantTxnId,
          upiRefId: intentResult.upiRefId,
          notes: note || `Pending GPay UPI QR for ${orderNumber || "Bill"}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: intentResult,
    });
  } catch (error: any) {
    console.error("Google Pay intent creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to initialize Google Pay UPI intent",
      },
      { status: 500 }
    );
  }
}

