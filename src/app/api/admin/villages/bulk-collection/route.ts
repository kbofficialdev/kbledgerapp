import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import { extractClientIp } from "@/lib/session-db";
import { Decimal } from "@prisma/client/runtime/library";
import * as XLSX from "xlsx";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/villages/bulk-collection
 * Ingests an uploaded Excel (.xlsx) or CSV file with collected amounts,
 * updates customer balances atomically, writes Payment, LedgerEntry, and TransactionAudit records.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "The uploaded spreadsheet contains no data rows." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    // Filter rows that have a positive collected amount
    const validEntries: Array<{
      customerCode: string;
      customerName?: string;
      collectedAmount: number;
      notes?: string;
    }> = [];

    for (const r of rawRows) {
      // Look for standard column aliases
      const code = (
        r["Customer Code"] ||
        r["customerCode"] ||
        r["Code"] ||
        r["Customer ID"] ||
        ""
      ).toString().trim();

      const rawAmount =
        r["Collected Cash (₹)"] ??
        r["Collected Cash"] ??
        r["Collected Amount (₹)"] ??
        r["collectedAmount"] ??
        r["Amount"] ??
        r["Amount Collected"];

      const amount = Number(rawAmount);

      if (code && !isNaN(amount) && amount > 0) {
        validEntries.push({
          customerCode: code,
          customerName: r["Customer Name"] || r["customerName"],
          collectedAmount: Number(amount.toFixed(2)),
          notes: r["Notes / Remarks"] || r["notes"] || "Village field cash collection",
        });
      }
    }

    if (validEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No collected amounts found. Make sure the 'Collected Cash (₹)' column contains values greater than zero.",
        },
        { status: 400 }
      );
    }

    // Execute ACID bulk collection updates with FIFO order allocation & savepoints
    const { executeAcidPaymentSettlement } = await import("@/lib/acid-ledger");
    const processed: any[] = [];
    let totalAmountProcessed = 0;

    for (const entry of validEntries) {
      const customer = await prisma.customer.findUnique({
        where: { customerCode: entry.customerCode },
      });

      if (!customer || !customer.isActive) {
        continue; // Skip unrecognized or blacklisted/disabled customer accounts
      }

      const paymentRef = `COL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const settlement = await executeAcidPaymentSettlement({
        customerId: customer.id,
        amount: entry.collectedAmount,
        method: "CASH",
        paymentRef,
        notes: `Field collection import: ${entry.notes}`,
        ipAddress: clientIp,
        userAgent,
      });

      totalAmountProcessed += settlement.amountPaid;
      processed.push({
        customerCode: customer.customerCode,
        customerName: customer.name,
        amountCredited: settlement.amountPaid,
        balanceBefore: settlement.balanceBefore,
        balanceAfter: settlement.balanceAfter,
        allocations: settlement.allocations,
      });
    }

    const results = {
      count: processed.length,
      totalAmount: Number(totalAmountProcessed.toFixed(2)),
      processed,
    };

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.count} collections totaling ₹${results.totalAmount.toLocaleString("en-IN")}.`,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to process bulk collection spreadsheet.") },
      { status: 500 }
    );
  }
}

