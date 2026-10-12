import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { askGeminiAssistant } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalVillages,
      totalCustomers,
      allCustomers,
      totalOrders,
      openTickets,
    ] = await Promise.all([
      prisma.village.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: { currentBalance: true },
      }),
      prisma.order.count(),
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
    ]);

    let totalOutstandingUdhaar = 0;
    for (const c of allCustomers) {
      totalOutstandingUdhaar += Number(c.currentBalance);
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalVillages,
        totalCustomers,
        totalOutstandingUdhaar,
        totalOrders,
        openTickets,
      },
    });
  } catch (error: any) {
    const { sanitizeApiError } = await import("@/lib/api-error");
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load store metrics.") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { prompt = "", conversationHistory = [], image } = body;

    if ((!prompt || typeof prompt !== "string" || !prompt.trim()) && !image) {
      return NextResponse.json({ error: "A valid prompt or image upload is required." }, { status: 400 });
    }

    if (!prompt.trim() && image) {
      prompt = "Please inspect and analyze this uploaded store document/receipt/collection sheet.";
    }

    // 1. Fetch live database summary for grounded AI reasoning
    const [
      totalVillages,
      villagesList,
      totalCustomers,
      topDebtors,
      allCustomers,
      recentOrders,
      recentPayments,
      totalOrders,
      openTickets,
    ] = await Promise.all([
      prisma.village.count({ where: { isActive: true } }),
      prisma.village.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, taluk: true, district: true },
        take: 20,
      }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.findMany({
        where: { isActive: true, currentBalance: { gt: 0 } },
        orderBy: { currentBalance: "desc" },
        take: 5,
        include: { village: { select: { name: true } } },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: { currentBalance: true, creditLimit: true, villageId: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          customer: { select: { name: true } },
          village: { select: { name: true } },
          items: { select: { name: true, quantity: true, unit: true, lineTotal: true } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
      prisma.order.count(),
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
    ]);

    // Aggregate statistics
    let totalOutstandingUdhaar = 0;
    for (const c of allCustomers) {
      totalOutstandingUdhaar += Number(c.currentBalance);
    }

    // Village-wise debt calculation
    const villageDebtMap = new Map<string, number>();
    for (const c of allCustomers) {
      const current = villageDebtMap.get(c.villageId) || 0;
      villageDebtMap.set(c.villageId, current + Number(c.currentBalance));
    }

    const villageSummary = villagesList.map((v) => {
      const debt = villageDebtMap.get(v.id) || 0;
      return `${v.name} (${v.code}, ${v.taluk || "Mandal"}): Total Udhaar ₹${debt.toFixed(2)}`;
    });

    const debtorSummary = topDebtors.map(
      (d) =>
        `- ${d.name} (${d.customerCode}, ${d.village.name}): Owed ₹${Number(d.currentBalance).toFixed(2)} (Mobile: ${d.mobile})`
    );

    const recentOrderSummary = recentOrders.map(
      (o) =>
        `- #${o.orderNumber} for ${o.customer.name} (${o.village.name}): ₹${Number(o.totalAmount).toFixed(2)} [${o.paymentType}] Items: ${o.items.map((i) => `${i.name} (${Number(i.quantity)} ${i.unit})`).join(", ")}`
    );

    const recentPaymentSummary = recentPayments.map(
      (p) =>
        `- Ref ${p.paymentRef} from ${p.customer.name}: ₹${Number(p.amount).toFixed(2)} via ${p.method} [Status: ${p.status}, RRN: ${p.bankRrn || "N/A"}]`
    );

    const dbContextSummary = `
STORE OVERVIEW:
- Total Active Villages: ${totalVillages}
- Total Active Customers: ${totalCustomers}
- Total Lifetime Orders: ${totalOrders}
- Open Support Enquiries/Tickets: ${openTickets}
- Total Outstanding Udhaar Across All Village Ledgers: ₹${totalOutstandingUdhaar.toFixed(2)}

TOP DEBTOR CUSTOMERS:
${debtorSummary.join("\n") || "None currently in debt."}

VILLAGE TERRITORIES & EXPOSURE:
${villageSummary.join("\n")}

RECENT STORE ORDERS:
${recentOrderSummary.join("\n") || "No recent orders."}

RECENT CASHFREE PAYMENTS & RECONCILIATION:
${recentPaymentSummary.join("\n") || "No recent payments recorded."}
`;

    const adminSystemPrompt = `
You are the dedicated Executive AI Business Advisor for "KB Fashions & Khata", an offline village store ledger and retail platform in Telangana.
Merchant: KB Fashions & Khata (Tandoor, Mancherial Dist, TS • Ph: 6303185141).
Payment Gateway: Cashfree Payments (UPI, PhonePe, Cards, NetBanking, Dynamic QR).

Your Core Responsibilities:
1. Provide accurate, executive-level financial analysis and actionable store management advice based directly on the live PostgreSQL store database context provided.
2. Structure answers with clean headings, bold figures, rupee symbols (₹), bullet points, and markdown tables where suitable.
3. If queried in Telugu, respond fluently and politely in Telugu (తెలుగు) with clear numerical breakdowns.
4. If queried in English or Hinglish, respond with crisp executive bullet points and clear recommendations.
5. Offer strategic guidance on recovering pending Udhaar, monitoring debtor concentration by village, auditing Cashfree payments, and managing customer support tickets.
6. Always ground every metric in the live database figures provided below.

=== MULTIMODAL STORE DOCUMENT & RECEIPT OCR ===
Store administrators may upload photos of handwritten village collection sheets, customer passbooks, supplier invoices, wholesale purchase bills, or paper receipts.
- When an image is provided: Accurately transcribe and OCR all names, numbers, dates, and amounts.
- Cross-reference with the live store ledger context provided.
- Format all summaries with clean tables, bold numbers, and rupee signs (₹) like ChatGPT.
`;

    // 2. Query Google Gemini AI
    const answer = await askGeminiAssistant({
      prompt,
      conversationHistory: conversationHistory.map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        text: m.content || m.text || "",
      })),
      dbContextSummary,
      systemInstruction: adminSystemPrompt,
      temperature: 0.5,
      image,
    });

    return NextResponse.json({
      success: true,
      answer,
      metrics: {
        totalVillages,
        totalCustomers,
        totalOutstandingUdhaar,
        totalOrders,
        openTickets,
      },
    });
  } catch (error: any) {
    console.error("[Admin AI Route Error]:", error);
    const { sanitizeApiError } = await import("@/lib/api-error");
    return NextResponse.json(
      {
        success: false,
        error: sanitizeApiError(error, "The AI Advisor is temporarily unavailable. Please try again shortly."),
      },
      { status: 500 }
    );
  }
}

