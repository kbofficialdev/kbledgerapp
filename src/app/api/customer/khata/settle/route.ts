import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth-session";
import { extractClientIp } from "@/lib/session-db";
import { executeAcidPaymentSettlement } from "@/lib/acid-ledger";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/khata/settle
 * Settles multiple orders (full or partial) via Cashfree PG using the ACID Ledger Engine
 * (Serializable isolation, SQL SAVEPOINT checkpoints, and FIFO order allocation).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession(req);
    if (!session || !session.customerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Customer session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orderIds,
      amount,
      cashfreeOrderId,
      cashfreePaymentId,
      paymentSessionId,
      notes,
    } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount. Must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one order must be selected for settlement." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    const result = await executeAcidPaymentSettlement({
      customerId: session.customerId,
      orderIds,
      amount: parsedAmount,
      method: "CASHFREE_ELEMENTS",
      paymentRef: `PAY-CF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      cashfreeOrderId: cashfreeOrderId || null,
      cashfreePaymentId: cashfreePaymentId || null,
      paymentSessionId: paymentSessionId || null,
      notes: notes || `Online self-service settlement of ${orderIds.length} bills`,
      ipAddress: clientIp,
      userAgent,
      strictOrderCap: true,
    });

    return NextResponse.json({
      success: true,
      message: `Settlement of ₹${result.amountPaid} processed successfully!`,
      data: {
        paymentRef: result.paymentRef,
        transactionRef: result.transactionRef,
        amountPaid: result.amountPaid,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        allocations: result.allocations,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to process multi-order settlement. Please try again.") },
      { status: 500 }
    );
  }
}

