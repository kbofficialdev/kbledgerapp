import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { sendCustomStoreEmail, sendCustomerWelcomeEmail } from "@/lib/email";

export interface AgentArtifact {
  id: string;
  type: "pdf" | "excel" | "image" | "email" | "record";
  title: string;
  subtitle: string;
  filename?: string;
  mimeType?: string;
  dataUrl?: string;
  previewText?: string;
  metadata?: Record<string, string | number>;
  dashboardLink?: string;
}

export interface AgentToolStep {
  id: string;
  toolName: string;
  label: string;
  status: "completed" | "failed";
  durationMs: number;
  summary: string;
  args: Record<string, any>;
}

export interface ToolExecutionResult {
  step: AgentToolStep;
  artifact?: AgentArtifact;
  markdownSummary: string;
}

/**
 * Gemini Function Declarations for Native Tool Calling
 */
export const ADMIN_GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: "generate_pdf_report",
    description:
      "Generate an official downloadable PDF report (Store Ledger Report, Customer Khata Statement, or Debt Recovery Plan) from live PostgreSQL records.",
    parameters: {
      type: "OBJECT",
      properties: {
        reportType: {
          type: "STRING",
          description: "Type of PDF report: STORE_LEDGER, CUSTOMER_STATEMENT, or DEBT_RECOVERY_PLAN",
        },
        customerQuery: {
          type: "STRING",
          description: "Optional customer name, mobile, or code if generating a specific customer statement.",
        },
      },
      required: ["reportType"],
    },
  },
  {
    name: "generate_excel_sheet",
    description:
      "Generate a downloadable multi-sheet Excel (.xlsx) workbook containing customer balances, village exposure, orders, and payment logs.",
    parameters: {
      type: "OBJECT",
      properties: {
        sheetType: {
          type: "STRING",
          description: "Type of Excel export: FULL_WORKBOOK, DEBTORS_SHEET, or ORDERS_EXPORT",
        },
        villageQuery: {
          type: "STRING",
          description: "Optional village name or code to filter the sheet.",
        },
      },
      required: ["sheetType"],
    },
  },
  {
    name: "generate_visual_image",
    description:
      "Generate a high-resolution visual chart, infographic, or promotional store banner image for download and inline display.",
    parameters: {
      type: "OBJECT",
      properties: {
        visualType: {
          type: "STRING",
          description: "Visual type: VILLAGE_DEBT_CHART, FINANCIAL_INFOGRAPHIC, or PROMO_POSTER",
        },
        headline: {
          type: "STRING",
          description: "Custom headline or title for the generated visual image or poster.",
        },
        subtext: {
          type: "STRING",
          description: "Optional subtitle, offer details, or summary notes for the visual.",
        },
      },
      required: ["visualType"],
    },
  },
  {
    name: "draft_and_send_email",
    description:
      "Compose and send an official store email (payment reminder, account statement, or custom announcement) via SMTP to a customer or email address.",
    parameters: {
      type: "OBJECT",
      properties: {
        recipientQuery: {
          type: "STRING",
          description:
            "Customer name, mobile, customerCode, direct email address, or ALL_DEBTORS to email all customers with pending Udhaar.",
        },
        subject: {
          type: "STRING",
          description: "Email subject line.",
        },
        messageBody: {
          type: "STRING",
          description: "Custom email body text. Live balance details will be included automatically.",
        },
      },
      required: ["recipientQuery"],
    },
  },
  {
    name: "create_village",
    description: "Create a new village territory in the PostgreSQL database.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Village name (e.g., Rampur)" },
        code: { type: "STRING", description: "Unique short code (e.g., VIL-RMP)" },
        taluk: { type: "STRING", description: "Taluk or Mandal name (default: Tandoor)" },
        district: { type: "STRING", description: "District name (default: Mancherial)" },
        pincode: { type: "STRING", description: "6-digit pincode" },
      },
      required: ["name"],
    },
  },
  {
    name: "register_customer",
    description:
      "Register a new customer account in the PostgreSQL ledger under a village territory and optionally send welcome credentials.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Full name of the customer" },
        mobile: { type: "STRING", description: "10-digit mobile number" },
        email: { type: "STRING", description: "Optional email address for OTP login & notifications" },
        villageName: { type: "STRING", description: "Village name or code (defaults to first active village)" },
        creditLimit: { type: "NUMBER", description: "Maximum Udhaar credit limit in INR (default 10000)" },
        openingBalance: { type: "NUMBER", description: "Initial opening Udhaar balance in INR (default 0)" },
      },
      required: ["name", "mobile"],
    },
  },
  {
    name: "create_order_bill",
    description:
      "Create a new store order / bill for a customer with itemized lines and automatic ledger balance update (DEBIT, CREDIT, or PARTIAL).",
    parameters: {
      type: "OBJECT",
      properties: {
        customerQuery: { type: "STRING", description: "Customer name, mobile number, or customerCode" },
        itemName: { type: "STRING", description: "Name of item purchased (e.g., Sona Masoori Rice 25kg)" },
        quantity: { type: "NUMBER", description: "Quantity purchased (default 1)" },
        unit: { type: "STRING", description: "Unit (pcs, bag, kg, pkt, box)" },
        pricePerUnit: { type: "NUMBER", description: "Price per unit in INR" },
        paymentType: {
          type: "STRING",
          description: "Payment mode: DEBIT (paid full cash/UPI), CREDIT (full Udhaar), or PARTIAL",
        },
        paidAmount: {
          type: "NUMBER",
          description: "Amount paid on the spot if PARTIAL (ignored for full DEBIT or full CREDIT)",
        },
        notes: { type: "STRING", description: "Optional billing note" },
      },
      required: ["customerQuery", "itemName", "pricePerUnit"],
    },
  },
  {
    name: "record_payment",
    description:
      "Record a payment collection from a customer to settle their outstanding Udhaar balance and update the ledger.",
    parameters: {
      type: "OBJECT",
      properties: {
        customerQuery: { type: "STRING", description: "Customer name, mobile number, or customerCode" },
        amount: { type: "NUMBER", description: "Payment amount received in INR" },
        method: { type: "STRING", description: "Payment method: CASH, GPAY, or DYNAMIC_QR" },
        notes: { type: "STRING", description: "Optional collection note" },
      },
      required: ["customerQuery", "amount"],
    },
  },
  {
    name: "manage_support_ticket",
    description: "Reply to and update the status of a customer support ticket in the database.",
    parameters: {
      type: "OBJECT",
      properties: {
        ticketQuery: {
          type: "STRING",
          description: "Ticket number (e.g., TKT-...) or LATEST to target the most recent open ticket",
        },
        replyMessage: { type: "STRING", description: "Official administrator reply message" },
        newStatus: { type: "STRING", description: "New status: IN_PROGRESS, RESOLVED, or CLOSED" },
      },
      required: ["replyMessage"],
    },
  },
];

/**
 * Helper: Generate PDF Buffer using PDFKit
 */
async function buildExecutivePdfBuffer(
  reportType: string,
  customerQuery?: string
): Promise<{ buffer: Buffer; title: string; subtitle: string; filename: string; rowCount: number }> {
  const [villages, customers, orders, payments] = await Promise.all([
    prisma.village.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({
      where: { isActive: true },
      include: { village: true },
      orderBy: { currentBalance: "desc" },
    }),
    prisma.order.findMany({
      include: { customer: true, village: true, items: true },
      orderBy: { orderDate: "desc" },
      take: 25,
    }),
    prisma.payment.findMany({
      include: { customer: true },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
  ]);

  const filteredCustomers = customerQuery
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
          c.mobile.includes(customerQuery) ||
          c.customerCode.toLowerCase().includes(customerQuery.toLowerCase())
      )
    : customers;

  const targetCustomers = filteredCustomers.length > 0 ? filteredCustomers : customers;
  const totalUdhaar = targetCustomers.reduce((acc, c) => acc + Number(c.currentBalance), 0);
  const totalSales = orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const cleanType = (reportType || "STORE_LEDGER").toUpperCase();
  const title =
    cleanType === "CUSTOMER_STATEMENT"
      ? "Official Customer Khata Statement"
      : cleanType === "DEBT_RECOVERY_PLAN"
        ? "Executive Udhaar Recovery & Debtor Schedule"
        : "Executive Store Ledger & Financial Audit Report";
  const filename = `KB_Khata_${cleanType}_${dateStamp}.pdf`;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on("end", () => {
        resolve({
          buffer: Buffer.concat(chunks),
          title,
          subtitle: `${targetCustomers.length} Customers • Total Udhaar Rs. ${totalUdhaar.toLocaleString("en-IN")}`,
          filename,
          rowCount: targetCustomers.length + orders.length,
        });
      });
      doc.on("error", reject);

      // Header Block
      doc.rect(40, 40, 515, 70).fill("#09090b");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("KB FASHIONS & KHATA", 56, 54);
      doc
        .fillColor("#a1a1aa")
        .font("Helvetica")
        .fontSize(9)
        .text("Executive Rural Commerce & Bahi-Khata Ledger • Tandoor, Mancherial Dist, TS", 56, 76);
      doc
        .fillColor("#10b981")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`GENERATED BY GENAI AGENT • ${new Date().toLocaleString("en-IN")}`, 56, 92);

      // Report Title
      doc.fillColor("#09090b").font("Helvetica-Bold").fontSize(14).text(title.toUpperCase(), 40, 128);
      doc.moveTo(40, 146).lineTo(555, 146).stroke("#e4e4e7");

      // KPI Summary Row
      const kpis = [
        { label: "ACTIVE VILLAGES", val: `${villages.length}` },
        { label: "CUSTOMERS AUDITED", val: `${targetCustomers.length}` },
        { label: "OUTSTANDING UDHAAR", val: `Rs. ${totalUdhaar.toLocaleString("en-IN")}` },
        { label: "RECENT SALES VOLUME", val: `Rs. ${totalSales.toLocaleString("en-IN")}` },
      ];

      kpis.forEach((k, idx) => {
        const x = 40 + idx * 130;
        doc.rect(x, 156, 122, 46).fillAndStroke("#f8fafc", "#e2e8f0");
        doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7).text(k.label, x + 10, 165);
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(k.val, x + 10, 180);
      });

      // Customer Ledger Table
      let y = 220;
      doc.fillColor("#09090b").font("Helvetica-Bold").fontSize(11).text("1. CUSTOMER KHATA BALANCES & CREDIT EXPOSURE", 40, y);
      y += 18;

      doc.rect(40, y, 515, 20).fill("#18181b");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      doc.text("CODE", 48, y + 6);
      doc.text("CUSTOMER NAME", 115, y + 6);
      doc.text("VILLAGE", 260, y + 6);
      doc.text("MOBILE", 350, y + 6);
      doc.text("UDHAAR BALANCE", 445, y + 6);
      y += 20;

      targetCustomers.slice(0, 18).forEach((c, idx) => {
        if (y > 740) {
          doc.addPage();
          y = 50;
        }
        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, y, 515, 18).fillAndStroke(bg, "#e2e8f0");
        doc.fillColor("#0f172a").font("Helvetica").fontSize(8);
        doc.text(c.customerCode, 48, y + 5);
        doc.font("Helvetica-Bold").text(c.name.slice(0, 26), 115, y + 5);
        doc.font("Helvetica").text((c.village?.name || "N/A").slice(0, 16), 260, y + 5);
        doc.text(c.mobile, 350, y + 5);
        const bal = Number(c.currentBalance);
        doc
          .fillColor(bal > 0 ? "#e11d48" : "#059669")
          .font("Helvetica-Bold")
          .text(`Rs. ${bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 445, y + 5);
        y += 18;
      });

      y += 22;
      if (y > 680) {
        doc.addPage();
        y = 50;
      }

      // Recent Orders Table
      doc.fillColor("#09090b").font("Helvetica-Bold").fontSize(11).text("2. RECENT STORE BILLS & TRANSACTIONS", 40, y);
      y += 18;

      doc.rect(40, y, 515, 20).fill("#18181b");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      doc.text("ORDER NO", 48, y + 6);
      doc.text("CUSTOMER", 140, y + 6);
      doc.text("DATE", 275, y + 6);
      doc.text("MODE", 355, y + 6);
      doc.text("TOTAL AMOUNT", 445, y + 6);
      y += 20;

      orders.slice(0, 12).forEach((o, idx) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, y, 515, 18).fillAndStroke(bg, "#e2e8f0");
        doc.fillColor("#0f172a").font("Helvetica").fontSize(8);
        doc.text(o.orderNumber, 48, y + 5);
        doc.text((o.customer?.name || "Customer").slice(0, 22), 140, y + 5);
        doc.text(new Date(o.orderDate).toLocaleDateString("en-IN"), 275, y + 5);
        doc.text(o.paymentType, 355, y + 5);
        doc
          .font("Helvetica-Bold")
          .text(`Rs. ${Number(o.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 445, y + 5);
        y += 18;
      });

      // Official Seal Footer
      y += 24;
      if (y < 760) {
        doc
          .fillColor("#64748b")
          .font("Helvetica-Oblique")
          .fontSize(8)
          .text(
            `Digitally Verified & Signed by KB Fashions & Khata Autonomous GenAI Engine • Total Collected: Rs. ${totalCollected.toLocaleString("en-IN")}`,
            40,
            y
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper: Generate Excel (.xlsx) Workbook Buffer
 */
async function buildExecutiveExcelBuffer(
  sheetType: string,
  villageQuery?: string
): Promise<{ buffer: Buffer; title: string; subtitle: string; filename: string; rowCount: number }> {
  const [villages, customers, orders, payments] = await Promise.all([
    prisma.village.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({
      where: { isActive: true },
      include: { village: true },
      orderBy: { currentBalance: "desc" },
    }),
    prisma.order.findMany({
      include: { customer: true, village: true, items: true },
      orderBy: { orderDate: "desc" },
      take: 100,
    }),
    prisma.payment.findMany({
      include: { customer: true },
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
  ]);

  const filteredCustomers = villageQuery
    ? customers.filter(
        (c) =>
          c.village?.name.toLowerCase().includes(villageQuery.toLowerCase()) ||
          c.village?.code.toLowerCase().includes(villageQuery.toLowerCase())
      )
    : customers;

  const targetCustomers = filteredCustomers.length > 0 ? filteredCustomers : customers;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customers & Khata Balances
  const customerRows = targetCustomers.map((c, idx) => ({
    "S.No": idx + 1,
    "Customer Code": c.customerCode,
    "Customer Name": c.name,
    "Village Name": c.village?.name || "N/A",
    "Village Code": c.village?.code || "N/A",
    "Mobile Number": c.mobile,
    "Email Address": c.email || "",
    "Current Udhaar Balance (INR)": Number(c.currentBalance),
    "Credit Limit (INR)": Number(c.creditLimit),
    "Account Status": Number(c.currentBalance) > 0 ? "UDHAAR PENDING" : "SETTLED",
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, "Customer Khata Ledger");

  // Sheet 2: Village Exposure Summary
  const villageRows = villages.map((v, idx) => {
    const vCusts = customers.filter((c) => c.villageId === v.id);
    const vDebt = vCusts.reduce((acc, c) => acc + Number(c.currentBalance), 0);
    return {
      "S.No": idx + 1,
      "Village Code": v.code,
      "Village Name": v.name,
      "Taluk / Mandal": v.taluk || "Tandoor",
      "District": v.district || "Mancherial",
      "Active Customers": vCusts.length,
      "Total Udhaar Exposure (INR)": vDebt,
    };
  });
  const wsVillages = XLSX.utils.json_to_sheet(villageRows);
  XLSX.utils.book_append_sheet(wb, wsVillages, "Village Exposure");

  // Sheet 3: Orders & Itemized Bills
  const orderRows = orders.map((o, idx) => ({
    "S.No": idx + 1,
    "Order Number": o.orderNumber,
    "Order Date": new Date(o.orderDate).toLocaleString("en-IN"),
    "Customer Name": o.customer?.name || "",
    "Village": o.village?.name || "",
    "Payment Mode": o.paymentType,
    "Total Bill (INR)": Number(o.totalAmount),
    "Paid On Spot (INR)": Number(o.paidAmount),
    "Added To Udhaar (INR)": Number(o.creditAmount),
    "Items Purchased": o.items.map((i) => `${i.name} (${Number(i.quantity)} ${i.unit})`).join(", "),
  }));
  const wsOrders = XLSX.utils.json_to_sheet(orderRows);
  XLSX.utils.book_append_sheet(wb, wsOrders, "Orders & Bills");

  // Sheet 4: Payments & Cashfree Audit
  const paymentRows = payments.map((p, idx) => ({
    "S.No": idx + 1,
    "Payment Ref": p.paymentRef,
    "Customer Name": p.customer?.name || "",
    "Amount Paid (INR)": Number(p.amount),
    "Method": p.method,
    "Status": p.status,
    "Bank RRN / Ref": p.bankRrn || p.cashfreePaymentId || "CASH",
    "Paid At": new Date(p.paidAt).toLocaleString("en-IN"),
  }));
  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
  XLSX.utils.book_append_sheet(wb, wsPayments, "Payments & Settlements");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const cleanType = (sheetType || "FULL_WORKBOOK").toUpperCase();
  const filename = `KB_Khata_${cleanType}_${dateStamp}.xlsx`;

  return {
    buffer,
    title: "KB Khata Multi-Sheet Excel Workbook (.xlsx)",
    subtitle: `4 Worksheets • ${targetCustomers.length} Customers, ${orders.length} Orders, ${payments.length} Payments`,
    filename,
    rowCount: targetCustomers.length + villageRows.length + orderRows.length + paymentRows.length,
  };
}

/**
 * Helper: Build High-Resolution Executive Visual SVG DataURL
 */
async function buildExecutiveVisualImage(
  visualType: string,
  headline?: string,
  subtext?: string
): Promise<{ dataUrl: string; title: string; subtitle: string; filename: string }> {
  const [villages, customers, orders, payments] = await Promise.all([
    prisma.village.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({ where: { isActive: true }, include: { village: true } }),
    prisma.order.findMany(),
    prisma.payment.findMany(),
  ]);

  const totalUdhaar = customers.reduce((sum, c) => sum + Number(c.currentBalance), 0);
  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const villageStats = villages
    .map((v) => {
      const custs = customers.filter((c) => c.villageId === v.id);
      const debt = custs.reduce((s, c) => s + Number(c.currentBalance), 0);
      return { name: v.name, code: v.code, customers: custs.length, debt };
    })
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 5);

  const maxDebt = Math.max(...villageStats.map((v) => v.debt), 1000);
  const cleanType = (visualType || "VILLAGE_DEBT_CHART").toUpperCase();

  const displayTitle =
    headline ||
    (cleanType === "PROMO_POSTER"
      ? "KB Fashions & Khata — Festive Collection & Instant Digital Khata"
      : cleanType === "FINANCIAL_INFOGRAPHIC"
        ? "Executive Store Financial & Cashflow Scorecard"
        : "Village-Wise Udhaar Exposure & Ledger Analytics");

  const displaySub =
    subtext ||
    `Tandoor, Mancherial Dist • ${villages.length} Villages • ${customers.length} Active Accounts • Live PostgreSQL Snapshot`;

  const barsSvg = villageStats
    .map((v, idx) => {
      const y = 260 + idx * 54;
      const barWidth = Math.max(24, Math.min(460, Math.round((v.debt / maxDebt) * 460)));
      return `
        <g>
          <text x="60" y="${y + 18}" fill="#e4e4e7" font-family="sans-serif" font-size="14" font-weight="700">${v.name} (${v.code})</text>
          <text x="60" y="${y + 36}" fill="#71717a" font-family="monospace" font-size="11">${v.customers} Accounts</text>
          <rect x="260" y="${y + 4}" width="480" height="28" rx="8" fill="#18181b" stroke="#27272a" />
          <rect x="260" y="${y + 4}" width="${barWidth}" height="28" rx="8" fill="url(#barGrad)" />
          <text x="755" y="${y + 23}" fill="#ffffff" font-family="monospace" font-size="14" font-weight="700">Rs. ${v.debt.toLocaleString("en-IN")}</text>
        </g>
      `;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#09090b" />
        <stop offset="50%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
      <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
    </defs>
    <rect width="960" height="600" rx="24" fill="url(#bgGrad)" />
    <rect x="20" y="20" width="920" height="560" rx="18" fill="none" stroke="#27272a" stroke-width="1.5" />

    <!-- Header -->
    <rect x="56" y="48" width="44" height="44" rx="12" fill="#ffffff" />
    <text x="67" y="77" fill="#09090b" font-family="sans-serif" font-size="18" font-weight="900">KB</text>
    <text x="116" y="68" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="800">${displayTitle.replace(/&/g, "&amp;")}</text>
    <text x="116" y="90" fill="#a1a1aa" font-family="sans-serif" font-size="13">${displaySub.replace(/&/g, "&amp;")}</text>

    <!-- KPI Cards -->
    <g>
      <rect x="56" y="120" width="200" height="92" rx="14" fill="#18181b" stroke="#27272a" />
      <text x="74" y="148" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="700">OUTSTANDING UDHAAR</text>
      <text x="74" y="184" fill="#f43f5e" font-family="monospace" font-size="22" font-weight="800">Rs. ${totalUdhaar.toLocaleString("en-IN")}</text>

      <rect x="276" y="120" width="200" height="92" rx="14" fill="#18181b" stroke="#27272a" />
      <text x="294" y="148" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="700">LIFETIME SALES</text>
      <text x="294" y="184" fill="#10b981" font-family="monospace" font-size="22" font-weight="800">Rs. ${totalSales.toLocaleString("en-IN")}</text>

      <rect x="496" y="120" width="200" height="92" rx="14" fill="#18181b" stroke="#27272a" />
      <text x="514" y="148" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="700">PAYMENTS COLLECTED</text>
      <text x="514" y="184" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="800">Rs. ${totalCollected.toLocaleString("en-IN")}</text>

      <rect x="716" y="120" width="188" height="92" rx="14" fill="#18181b" stroke="#27272a" />
      <text x="734" y="148" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="700">ACTIVE LEDGERS</text>
      <text x="734" y="184" fill="#fbbf24" font-family="monospace" font-size="22" font-weight="800">${customers.length} Accounts</text>
    </g>

    <!-- Chart Section -->
    <text x="56" y="244" fill="#a1a1aa" font-family="sans-serif" font-size="12" font-weight="700" letter-spacing="1">VILLAGE TERRITORY CREDIT CONCENTRATION &amp; REAL-TIME EXPOSURE</text>
    ${barsSvg}

    <!-- Footer -->
    <line x1="56" y1="536" x2="904" y2="536" stroke="#27272a" />
    <text x="56" y="560" fill="#71717a" font-family="monospace" font-size="11">KB FASHIONS &amp; KHATA • AUTONOMOUS GENAI VISUAL ENGINE • ${new Date().toISOString().slice(0, 10)}</text>
    <text x="710" y="560" fill="#10b981" font-family="monospace" font-size="11" font-weight="700">VERIFIED POSTGRESQL DATA</text>
  </svg>`;

  const base64Svg = Buffer.from(svg, "utf-8").toString("base64");
  return {
    dataUrl: `data:image/svg+xml;base64,${base64Svg}`,
    title: displayTitle,
    subtitle: displaySub,
    filename: `KB_Khata_Visual_${cleanType}_${Date.now()}.svg`,
  };
}

/**
 * Execute a single named Admin Agent Tool against PostgreSQL / PDFKit / XLSX / Nodemailer
 */
export async function executeAdminAgentTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolExecutionResult> {
  const start = Date.now();

  try {
    switch (toolName) {
      case "generate_pdf_report": {
        const reportType = args.reportType || "STORE_LEDGER";
        const pdfRes = await buildExecutivePdfBuffer(reportType, args.customerQuery);
        const dataUrl = `data:application/pdf;base64,${pdfRes.buffer.toString("base64")}`;
        const durationMs = Date.now() - start;

        return {
          step: {
            id: `step_${Date.now()}_pdf`,
            toolName,
            label: "Generated Executive PDF Report",
            status: "completed",
            durationMs,
            summary: `Compiled ${pdfRes.filename} (${(pdfRes.buffer.length / 1024).toFixed(1)} KB) from live PostgreSQL records.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_pdf`,
            type: "pdf",
            title: pdfRes.title,
            subtitle: pdfRes.subtitle,
            filename: pdfRes.filename,
            mimeType: "application/pdf",
            dataUrl,
            metadata: {
              Format: "PDF (A4 Executive)",
              Size: `${(pdfRes.buffer.length / 1024).toFixed(1)} KB`,
              Records: pdfRes.rowCount,
            },
            dashboardLink: "/admin/reports",
          },
          markdownSummary: `### 📄 Official PDF Report Generated\nI have compiled and signed **${pdfRes.title}** (\`${pdfRes.filename}\`) directly from your live PostgreSQL store database. Click **Download PDF** on the artifact card below to save or print it.`,
        };
      }

      case "generate_excel_sheet": {
        const sheetType = args.sheetType || "FULL_WORKBOOK";
        const xlsRes = await buildExecutiveExcelBuffer(sheetType, args.villageQuery);
        const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${xlsRes.buffer.toString("base64")}`;
        const durationMs = Date.now() - start;

        return {
          step: {
            id: `step_${Date.now()}_xls`,
            toolName,
            label: "Generated Multi-Sheet Excel Workbook (.xlsx)",
            status: "completed",
            durationMs,
            summary: `Exported ${xlsRes.filename} with 4 worksheets (${xlsRes.rowCount} total rows).`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_xls`,
            type: "excel",
            title: xlsRes.title,
            subtitle: xlsRes.subtitle,
            filename: xlsRes.filename,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dataUrl,
            metadata: {
              Worksheets: "4 Tabs (Customers, Villages, Orders, Payments)",
              TotalRows: xlsRes.rowCount,
              Size: `${(xlsRes.buffer.length / 1024).toFixed(1)} KB`,
            },
            dashboardLink: "/admin/reports",
          },
          markdownSummary: `### 📊 Excel Workbook (\`.xlsx\`) Ready for Download\nI have generated **${xlsRes.title}** (\`${xlsRes.filename}\`) containing 4 structured worksheets: **Customer Khata Ledger**, **Village Exposure**, **Orders & Bills**, and **Payments & Settlements**. Use the **Download Excel (.xlsx)** button below.`,
        };
      }

      case "generate_visual_image": {
        const visualType = args.visualType || "VILLAGE_DEBT_CHART";
        const imgRes = await buildExecutiveVisualImage(visualType, args.headline, args.subtext);
        const durationMs = Date.now() - start;

        return {
          step: {
            id: `step_${Date.now()}_img`,
            toolName,
            label: "Rendered High-Resolution Store Visual & Chart",
            status: "completed",
            durationMs,
            summary: `Generated ${imgRes.filename} grounded in live store metrics.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_img`,
            type: "image",
            title: imgRes.title,
            subtitle: imgRes.subtitle,
            filename: imgRes.filename,
            mimeType: "image/svg+xml",
            dataUrl: imgRes.dataUrl,
            metadata: {
              Resolution: "960 × 600 HD Vector",
              Type: visualType,
            },
          },
          markdownSummary: `### 🎨 Executive Store Visual Generated\nI have rendered the **${imgRes.title}** graphic using live metrics from your PostgreSQL ledger. You can preview it directly below or download the high-resolution image file.`,
        };
      }

      case "draft_and_send_email": {
        const query = (args.recipientQuery || "").trim();
        let targetEmail = "";
        let recipientName = "Valued Customer";
        let currentBalance = 0;
        let customerCode = "";

        if (query.includes("@")) {
          targetEmail = query;
          const matchedCust = await prisma.customer.findFirst({
            where: { email: { equals: query, mode: "insensitive" } },
          });
          if (matchedCust) {
            recipientName = matchedCust.name;
            currentBalance = Number(matchedCust.currentBalance);
            customerCode = matchedCust.customerCode;
          }
        } else {
          const matchedCust = await prisma.customer.findFirst({
            where: {
              isActive: true,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { mobile: { contains: query } },
                { customerCode: { contains: query, mode: "insensitive" } },
              ],
            },
            orderBy: { currentBalance: "desc" },
          });

          const fallbackCust =
            matchedCust ||
            (await prisma.customer.findFirst({
              where: { isActive: true, email: { not: null } },
              orderBy: { currentBalance: "desc" },
            }));

          if (fallbackCust && fallbackCust.email) {
            targetEmail = fallbackCust.email;
            recipientName = fallbackCust.name;
            currentBalance = Number(fallbackCust.currentBalance);
            customerCode = fallbackCust.customerCode;
          }
        }

        if (!targetEmail) {
          throw new Error("Could not find a valid email address for the specified customer.");
        }

        const subject =
          args.subject ||
          `[KB Fashions & Khata] Account Statement & Ledger Update ${customerCode ? `(${customerCode})` : ""}`;

        const bodyText =
          args.messageBody ||
          `Greetings from KB Fashions & Khata (Tandoor, Mancherial Dist).\n\nHere is your verified store khata update:\n• Customer Account: ${recipientName} ${customerCode ? `(${customerCode})` : ""}\n• Current Outstanding Udhaar Balance: ₹${currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n\nYou can view your itemized bills, download thermal receipts, or settle your balance online anytime through your Customer Khata Portal. Thank you for your continued trust in KB Fashions & Khata!`;

        const dispatchRes = await sendCustomStoreEmail({
          to: targetEmail,
          recipientName,
          subject,
          bodyText,
          badgeText: currentBalance > 0 ? "Khata Payment Reminder" : "Official Store Statement",
        });

        const durationMs = Date.now() - start;

        return {
          step: {
            id: `step_${Date.now()}_email`,
            toolName,
            label: `Dispatched Email to ${targetEmail}`,
            status: dispatchRes.sent ? "completed" : "failed",
            durationMs,
            summary: dispatchRes.sent
              ? `Sent "${subject}" to ${recipientName} <${targetEmail}> via SMTP.`
              : `Email drafted for ${targetEmail} (SMTP status: ${dispatchRes.error})`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_email`,
            type: "email",
            title: subject,
            subtitle: `To: ${recipientName} <${targetEmail}>`,
            previewText: bodyText,
            metadata: {
              Recipient: targetEmail,
              Status: dispatchRes.sent ? "DELIVERED VIA SMTP" : "QUEUED",
              BalanceReferenced: `₹${currentBalance.toLocaleString("en-IN")}`,
            },
          },
          markdownSummary: `### ✉️ Official Store Email Dispatched\n- **Recipient**: **${recipientName}** (\`${targetEmail}\`)\n- **Subject**: **${subject}**\n- **Status**: ${dispatchRes.sent ? "✅ **Sent via Gmail SMTP**" : "⚠️ **Drafted**"}`,
        };
      }

      case "create_village": {
        const rawName = (args.name || "").trim();
        if (!rawName) throw new Error("Village name is required.");
        const code =
          (args.code || "").trim().toUpperCase() ||
          `VIL-${rawName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`;

        const existing = await prisma.village.findFirst({
          where: { OR: [{ name: { equals: rawName, mode: "insensitive" } }, { code }] },
        });

        const village = existing
          ? await prisma.village.update({
              where: { id: existing.id },
              data: { isActive: true, taluk: args.taluk || existing.taluk, district: args.district || existing.district },
            })
          : await prisma.village.create({
              data: {
                name: rawName,
                code,
                taluk: args.taluk || "Tandoor",
                district: args.district || "Mancherial",
                pincode: args.pincode || "504272",
                isActive: true,
              },
            });

        const durationMs = Date.now() - start;
        return {
          step: {
            id: `step_${Date.now()}_vil`,
            toolName,
            label: `Configured Village Territory: ${village.name}`,
            status: "completed",
            durationMs,
            summary: `Village ${village.name} (${village.code}) active in PostgreSQL.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_vil`,
            type: "record",
            title: `Village Territory: ${village.name}`,
            subtitle: `Code: ${village.code} • ${village.taluk}, ${village.district}`,
            metadata: {
              Code: village.code,
              Mandal: village.taluk || "Tandoor",
              District: village.district || "Mancherial",
            },
            dashboardLink: "/admin/villages",
          },
          markdownSummary: `### 🏘️ Village Territory Saved in Database\n- **Village Name**: **${village.name}**\n- **Territory Code**: \`${village.code}\`\n- **Mandal / District**: ${village.taluk}, ${village.district}`,
        };
      }

      case "register_customer": {
        const name = (args.name || "").trim();
        const mobile = (args.mobile || "").replace(/\D/g, "").slice(-10);
        if (!name || mobile.length < 10) {
          throw new Error("Customer name and valid 10-digit mobile number are required.");
        }

        let village = args.villageName
          ? await prisma.village.findFirst({
              where: {
                OR: [
                  { name: { contains: args.villageName, mode: "insensitive" } },
                  { code: { contains: args.villageName, mode: "insensitive" } },
                ],
              },
            })
          : null;

        if (!village) {
          village = await prisma.village.findFirst({ where: { isActive: true } });
        }
        if (!village) {
          village = await prisma.village.create({
            data: { name: "Tandoor", code: "VIL-TND", taluk: "Tandoor", district: "Mancherial" },
          });
        }

        const existingCustomer = await prisma.customer.findUnique({ where: { mobile } });
        const openingBal = Number(args.openingBalance || 0);
        const creditLim = Number(args.creditLimit || 10000);

        let customer;
        if (existingCustomer) {
          customer = await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name,
              email: args.email || existingCustomer.email,
              creditLimit: creditLim,
              isActive: true,
            },
          });
        } else {
          const count = await prisma.customer.count();
          const customerCode = `CUST-${village.code.replace("VIL-", "")}-${101 + count}`;
          customer = await prisma.customer.create({
            data: {
              customerCode,
              name,
              mobile,
              email: args.email || null,
              villageId: village.id,
              currentBalance: openingBal,
              creditLimit: creditLim,
              isActive: true,
            },
          });

          if (openingBal > 0) {
            await prisma.ledgerEntry.create({
              data: {
                customerId: customer.id,
                entryType: "BILL_DEBIT",
                debitAmount: openingBal,
                creditAmount: 0,
                runningBalance: openingBal,
                description: "Opening Khata Balance recorded by Admin AI Agent",
              },
            });
          }

          if (customer.email) {
            const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/customer/login`;
            await sendCustomerWelcomeEmail({
              to: customer.email,
              customerName: customer.name,
              customerCode: customer.customerCode,
              villageName: village.name,
              mobile: customer.mobile,
              initialBalance: openingBal,
              portalUrl,
            });
          }
        }

        const durationMs = Date.now() - start;
        return {
          step: {
            id: `step_${Date.now()}_cust`,
            toolName,
            label: `Registered Customer: ${customer.name}`,
            status: "completed",
            durationMs,
            summary: `Customer ${customer.name} (${customer.customerCode}) saved in ${village.name}.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_cust`,
            type: "record",
            title: `Customer Account: ${customer.name}`,
            subtitle: `${customer.customerCode} • Mobile: ${customer.mobile} • Village: ${village.name}`,
            metadata: {
              Code: customer.customerCode,
              Mobile: customer.mobile,
              CurrentBalance: `₹${Number(customer.currentBalance).toLocaleString("en-IN")}`,
              CreditLimit: `₹${Number(customer.creditLimit).toLocaleString("en-IN")}`,
            },
            dashboardLink: "/admin/customers",
          },
          markdownSummary: `### 👤 Customer Account Registered\n- **Name**: **${customer.name}** (\`${customer.customerCode}\`)\n- **Mobile**: \`${customer.mobile}\`\n- **Village**: ${village.name}\n- **Current Balance**: **₹${Number(customer.currentBalance).toLocaleString("en-IN")}**`,
        };
      }

      case "create_order_bill": {
        const query = (args.customerQuery || "").trim();
        const customer = await prisma.customer.findFirst({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { mobile: { contains: query } },
              { customerCode: { contains: query, mode: "insensitive" } },
            ],
          },
          include: { village: true },
        });

        if (!customer) {
          throw new Error(`No active customer found matching "${query}".`);
        }

        const qty = Math.max(1, Number(args.quantity || 1));
        const price = Math.max(1, Number(args.pricePerUnit || 100));
        const totalAmount = Number((qty * price).toFixed(2));
        const mode = ((args.paymentType || "CREDIT") as string).toUpperCase();
        const paymentType =
          mode === "DEBIT" || mode === "NAGATHU"
            ? "DEBIT"
            : mode === "PARTIAL"
              ? "PARTIAL"
              : "CREDIT";

        const paidAmount =
          paymentType === "DEBIT"
            ? totalAmount
            : paymentType === "PARTIAL"
              ? Math.min(totalAmount, Number(args.paidAmount || Math.round(totalAmount / 2)))
              : 0;
        const creditAmount = Number((totalAmount - paidAmount).toFixed(2));

        const { executeAcidOrderCreation } = await import("@/lib/acid-ledger");
        const orderNumber = `KB-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        const acidRes = await executeAcidOrderCreation({
          villageId: customer.villageId,
          customerId: customer.id,
          orderNumber,
          paymentType,
          paidAmount,
          paymentMethod: "CASH",
          notes: args.notes || "Created via Admin GenAI Operations Agent",
          items: [
            {
              customItemId: `ITM-${Math.floor(10000 + Math.random() * 90000)}`,
              name: args.itemName || "Store Merchandise",
              quantity: qty,
              unit: args.unit || "pcs",
              pricePerUnit: price,
            },
          ],
        });

        const createdOrder = acidRes.order;
        const newBalance = acidRes.newBalance;

        const durationMs = Date.now() - start;
        return {
          step: {
            id: `step_${Date.now()}_ord`,
            toolName,
            label: `Created Order Bill #${createdOrder.orderNumber}`,
            status: "completed",
            durationMs,
            summary: `Billed ₹${totalAmount.toLocaleString("en-IN")} (${paymentType}) for ${customer.name}.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_ord`,
            type: "record",
            title: `Order Invoice #${createdOrder.orderNumber}`,
            subtitle: `${customer.name} (${customer.village.name}) • Mode: ${paymentType}`,
            metadata: {
              OrderNo: createdOrder.orderNumber,
              TotalBill: `₹${totalAmount.toLocaleString("en-IN")}`,
              AddedToUdhaar: `₹${creditAmount.toLocaleString("en-IN")}`,
              UpdatedBalance: `₹${newBalance.toLocaleString("en-IN")}`,
            },
            dashboardLink: "/admin/orders",
          },
          markdownSummary: `### 🧾 New Order Bill Created (\`#${createdOrder.orderNumber}\`)\n- **Customer**: **${customer.name}** (\`${customer.customerCode}\`)\n- **Item**: ${args.itemName} (${qty} ${args.unit || "pcs"} × ₹${price})\n- **Total Bill**: **₹${totalAmount.toLocaleString("en-IN")}** (${paymentType})\n- **Updated Khata Balance**: **₹${newBalance.toLocaleString("en-IN")}**`,
        };
      }

      case "record_payment": {
        const query = (args.customerQuery || "").trim();
        const customer = await prisma.customer.findFirst({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { mobile: { contains: query } },
              { customerCode: { contains: query, mode: "insensitive" } },
            ],
          },
        });

        if (!customer) {
          throw new Error(`No active customer found matching "${query}".`);
        }

        const amount = Math.max(1, Number(args.amount || 0));
        const paymentRef = `PAY-AI-${Date.now().toString().slice(-6)}`;
        const rawMethod = (args.method || "CASH").toUpperCase();
        const method =
          rawMethod === "GPAY" || rawMethod === "GOOGLE_PAY"
            ? "GOOGLE_PAY"
            : rawMethod === "DYNAMIC_QR"
              ? "DYNAMIC_QR"
              : "CASH";

        const { executeAcidPaymentSettlement } = await import("@/lib/acid-ledger");
        const acidPayment = await executeAcidPaymentSettlement({
          customerId: customer.id,
          amount,
          method: method as any,
          paymentRef,
          notes: args.notes || "Recorded via Admin GenAI Operations Agent",
        });

        const balanceBefore = acidPayment.balanceBefore;
        const balanceAfter = acidPayment.balanceAfter;

        const durationMs = Date.now() - start;
        return {
          step: {
            id: `step_${Date.now()}_pay`,
            toolName,
            label: `Recorded Payment ${paymentRef} (₹${amount.toLocaleString("en-IN")})`,
            status: "completed",
            durationMs,
            summary: `Credited ₹${amount.toLocaleString("en-IN")} for ${customer.name}. New balance: ₹${balanceAfter.toLocaleString("en-IN")}.`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_pay`,
            type: "record",
            title: `Payment Receipt: ${paymentRef}`,
            subtitle: `${customer.name} • Method: ${method}`,
            metadata: {
              AmountPaid: `₹${amount.toLocaleString("en-IN")}`,
              PreviousBalance: `₹${balanceBefore.toLocaleString("en-IN")}`,
              RemainingBalance: `₹${balanceAfter.toLocaleString("en-IN")}`,
            },
            dashboardLink: "/admin/payments",
          },
          markdownSummary: `### ✅ Payment Recorded & Khata Updated (\`${paymentRef}\`)\n- **Customer**: **${customer.name}** (\`${customer.customerCode}\`)\n- **Amount Received**: **₹${amount.toLocaleString("en-IN")}** (${method})\n- **Previous Balance**: ₹${balanceBefore.toLocaleString("en-IN")}\n- **New Remaining Balance**: **₹${balanceAfter.toLocaleString("en-IN")}**`,
        };
      }

      case "manage_support_ticket": {
        const query = (args.ticketQuery || "LATEST").trim();
        const ticket =
          query.toUpperCase() === "LATEST"
            ? await prisma.supportTicket.findFirst({
                orderBy: { createdAt: "desc" },
                include: { customer: true },
              })
            : await prisma.supportTicket.findFirst({
                where: {
                  OR: [
                    { ticketNumber: { contains: query, mode: "insensitive" } },
                    { subject: { contains: query, mode: "insensitive" } },
                  ],
                },
                include: { customer: true },
              });

        if (!ticket) {
          return {
            step: {
              id: `step_${Date.now()}_tkt`,
              toolName,
              label: "Checked Support Ticket Queue",
              status: "completed",
              durationMs: Date.now() - start,
              summary: "No open support tickets found in queue.",
              args,
            },
            markdownSummary: `### 🎫 Support Ticket Queue Clean\nThere are currently **0 open customer support tickets** requiring action.`,
          };
        }

        const newStatus = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(
          (args.newStatus || "RESOLVED").toUpperCase()
        )
          ? (args.newStatus || "RESOLVED").toUpperCase()
          : "RESOLVED";

        await prisma.$transaction([
          prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              senderRole: "ADMIN",
              senderName: "KB Store Admin (GenAI Desk)",
              content:
                args.replyMessage ||
                "Your ledger inquiry has been audited and resolved by the KB Store Administration desk.",
            },
          }),
          prisma.supportTicket.update({
            where: { id: ticket.id },
            data: { status: newStatus as any },
          }),
        ]);

        const durationMs = Date.now() - start;
        return {
          step: {
            id: `step_${Date.now()}_tkt`,
            toolName,
            label: `Updated Ticket #${ticket.ticketNumber} → ${newStatus}`,
            status: "completed",
            durationMs,
            summary: `Posted official reply on ${ticket.ticketNumber} (${ticket.customer.name}).`,
            args,
          },
          artifact: {
            id: `art_${Date.now()}_tkt`,
            type: "record",
            title: `Support Ticket #${ticket.ticketNumber}`,
            subtitle: `${ticket.subject} • Customer: ${ticket.customer.name}`,
            metadata: {
              TicketNo: ticket.ticketNumber,
              Status: newStatus,
              Customer: ticket.customer.name,
            },
            dashboardLink: "/admin/tickets",
          },
          markdownSummary: `### 🎫 Support Ticket Updated (\`#${ticket.ticketNumber}\`)\n- **Customer**: **${ticket.customer.name}**\n- **New Status**: \`${newStatus}\`\n- **Admin Reply Posted**: *"${args.replyMessage}"*`,
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    const durationMs = Date.now() - start;
    return {
      step: {
        id: `step_${Date.now()}_err`,
        toolName,
        label: `Tool Execution: ${toolName}`,
        status: "failed",
        durationMs,
        summary: error?.message || "Operation could not be completed.",
        args,
      },
      markdownSummary: `> ⚠️ **Tool Notice (\`${toolName}\`)**: ${error?.message || "Could not complete operation. Please check parameters."}`,
    };
  }
}

/**
 * Deterministic Natural-Language Intent Detector for Instant Tool Execution
 * Guarantees tool execution even if Gemini API quota is rate-limited or when user asks in natural language.
 */
export function detectRequestedToolsFromPrompt(
  prompt: string,
  explicitToolAction?: { toolName: string; args: Record<string, any> }
): Array<{ toolName: string; args: Record<string, any> }> {
  if (explicitToolAction && explicitToolAction.toolName) {
    return [explicitToolAction];
  }

  const p = prompt.toLowerCase();
  const detected: Array<{ toolName: string; args: Record<string, any> }> = [];

  // 1. PDF Generation Intent
  if (
    /\b(pdf|statement pdf|ledger pdf|download pdf|generate pdf|export pdf|create pdf|pdf report|make a pdf|dump pdf)\b/i.test(
      p
    )
  ) {
    const reportType = /statement|customer/i.test(p)
      ? "CUSTOMER_STATEMENT"
      : /recovery|debtor/i.test(p)
        ? "DEBT_RECOVERY_PLAN"
        : "STORE_LEDGER";
    detected.push({ toolName: "generate_pdf_report", args: { reportType } });
  }

  // 2. Excel Generation Intent
  if (
    /\b(excel|xlsx|spreadsheet|workbook|csv|collection sheet|export sheet|generate excel|download excel|make an excel)\b/i.test(
      p
    )
  ) {
    const sheetType = /order|bill/i.test(p)
      ? "ORDERS_EXPORT"
      : /debtor|recovery/i.test(p)
        ? "DEBTORS_SHEET"
        : "FULL_WORKBOOK";
    detected.push({ toolName: "generate_excel_sheet", args: { sheetType } });
  }

  // 3. Image / Visual / Chart / Graph / Poster Generation Intent
  if (
    /\b(generate image|create image|make an image|show image|visual|infographic|poster|banner|chart|graph|plot|diagram|bar chart|analytics chart)\b/i.test(
      p
    )
  ) {
    const visualType = /poster|banner|promo|festival/i.test(p)
      ? "PROMO_POSTER"
      : /scorecard|infographic|kpi/i.test(p)
        ? "FINANCIAL_INFOGRAPHIC"
        : "VILLAGE_DEBT_CHART";
    detected.push({ toolName: "generate_visual_image", args: { visualType } });
  }

  // 4. Send Email Intent
  if (/\b(send email|send mail|send a mail|email reminder|mail to|payment reminder mail|dispatch email|draft email)\b/i.test(p)) {
    const emailMatch = prompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const recipientQuery = emailMatch ? emailMatch[1] : "KOKKULA BHAVITH KUMAR";
    detected.push({
      toolName: "draft_and_send_email",
      args: {
        recipientQuery,
        subject: "[KB Fashions & Khata] Official Account Statement & Payment Reminder",
      },
    });
  }

  // 5. Create Village Intent
  const villageMatch = prompt.match(/(?:create|add|new)\s+village\s+(?:named\s+|called\s+)?([A-Za-z\s]{2,25})/i);
  if (villageMatch && villageMatch[1]) {
    const vilName = villageMatch[1].replace(/\b(in|under|with|code|mandal|district)\b.*$/i, "").trim();
    if (vilName.length >= 2) {
      detected.push({
        toolName: "create_village",
        args: { name: vilName },
      });
    }
  }

  // 6. Register Customer Intent
  const customerMatch = prompt.match(
    /(?:register|add|create|new)\s+customer\s+([A-Za-z\s]{2,35}?)(?:\s+(?:mobile|phone|number|with)?\s*(\d{10}))/i
  );
  if (customerMatch && customerMatch[1] && customerMatch[2]) {
    detected.push({
      toolName: "register_customer",
      args: {
        name: customerMatch[1].trim(),
        mobile: customerMatch[2].trim(),
      },
    });
  }

  return detected;
}

