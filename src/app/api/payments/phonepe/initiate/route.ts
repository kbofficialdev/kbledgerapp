import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiatePhonePePayment } from "@/lib/phonepe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, amount, orderId, notes } = body;

    if (!customerId || !amount) {
      return NextResponse.json(
        { success: false, error: "Customer ID and amount are required" },
        { status: 400 }
      );
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const merchantTxnId = `MTXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentRef = `PHONEPE-${merchantTxnId.slice(-8)}`;

    // Create Payment record with PENDING status
    const payment = await prisma.payment.create({
      data: {
        paymentRef,
        customerId,
        orderId: orderId || null,
        amount: payAmount,
        method: "PHONEPE_UPI",
        status: "PENDING",
        merchantTxnId,
        notes: notes || "PhonePe Standard Checkout initiation",
      },
    });

    // Call PhonePe Checkout API
    const response = await initiatePhonePePayment({
      merchantTransactionId: merchantTxnId,
      merchantUserId: customer.customerCode,
      amountInRupees: payAmount,
      mobileNumber: customer.mobile,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      merchantTxnId,
      redirectUrl: response.redirectUrl,
      simulated: response.simulated || false,
    });
  } catch (error: any) {
    console.error("Error initiating PhonePe payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
