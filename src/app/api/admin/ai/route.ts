import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { askGeminiAssistant } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, conversationHistory = [] } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A valid prompt is required." }, { status: 400 });
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
- Total Active Villages: ${totalVillages}
- Total Active Customers: ${totalCustomers}
- Total Outstanding Udhaar Across All Customers: ₹${totalOutstandingUdhaar.toFixed(2)}
- Top Indebted Customers:
${debtorSummary.join("\n") || "None currently in debt."}

- Village Overview & Dues:
${villageSummary.join("\n")}

- Most Recent Orders Recorded:
${recentOrderSummary.join("\n") || "No recent orders."}

- Recent Payments & Settlements:
${recentPaymentSummary.join("\n") || "No recent payments."}
`;

    // 2. Query Google Gemini AI
    const answer = await askGeminiAssistant({
      prompt,
      conversationHistory,
      dbContextSummary,
    });

    return NextResponse.json({
      success: true,
      answer,
      metrics: {
        totalVillages,
        totalCustomers,
        totalOutstandingUdhaar,
      },
    });
  } catch (error: any) {
    console.error("[Admin AI Route Error]:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process AI assistant request.",
      },
      { status: 500 }
    );
  }
}
