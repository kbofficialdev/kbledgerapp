import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-session";
import * as XLSX from "xlsx";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/villages/collection-sheet
 * Queries PostgreSQL database view `village_collection_sheet_view`.
 * Supports ?villageId=... and ?format=excel for instant spreadsheet export.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const format = searchParams.get("format");

    let rows: any[] = [];

    // Query the PostgreSQL view directly for performance and security encapsulation
    if (villageId && villageId !== "ALL") {
      rows = await prisma.$queryRaw`
        SELECT 
          customer_id,
          customer_code,
          customer_name,
          mobile,
          current_balance,
          credit_limit,
          village_id,
          village_name,
          village_code
        FROM village_collection_sheet_view
        WHERE village_id = ${villageId}
        ORDER BY customer_name ASC;
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT 
          customer_id,
          customer_code,
          customer_name,
          mobile,
          current_balance,
          credit_limit,
          village_id,
          village_name,
          village_code
        FROM village_collection_sheet_view
        ORDER BY village_name ASC, customer_name ASC;
      `;
    }

    const formattedData = rows.map((r, idx) => ({
      sNo: idx + 1,
      customerId: r.customer_id,
      customerCode: r.customer_code,
      customerName: r.customer_name,
      mobile: r.mobile,
      villageName: r.village_name,
      villageCode: r.village_code,
      outstandingBalance: Number(r.current_balance),
      creditLimit: Number(r.credit_limit),
      collectedAmount: "", // Blank slot for physical handwriting or Excel entry
      collectorSignature: "",
    }));

    // If client requested Excel export (.xlsx)
    if (format === "excel") {
      const excelRows = formattedData.map((r) => ({
        "S.No": r.sNo,
        "Customer Code": r.customerCode,
        "Customer Name": r.customerName,
        "Mobile Number": r.mobile,
        "Village Territory": r.villageName,
        "Outstanding Udhaar (₹)": r.outstandingBalance,
        "Credit Limit (₹)": r.creditLimit,
        "Collected Cash (₹)": "", // Left blank for field data entry
        "Notes / Remarks": "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Village Collections");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Disposition": `attachment; filename="KB_Khata_Village_Collection_Sheet_${Date.now()}.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      customers: formattedData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to generate collection sheet.") },
      { status: 500 }
    );
  }
}

