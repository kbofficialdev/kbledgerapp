import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendCustomerWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { village: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: "Customer does not have a registered email address. Please update their profile with an email." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = `${appUrl}/portal/${customer.id}`;

    const sent = await sendCustomerWelcomeEmail({
      to: customer.email,
      customerName: customer.name,
      customerCode: customer.customerCode,
      villageName: customer.village.name,
      mobile: customer.mobile,
      initialBalance: Number(customer.currentBalance),
      portalUrl,
    });

    if (!sent) {
      return NextResponse.json({ error: "Failed to dispatch email via SMTP." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Account credentials sent successfully to ${customer.email}`,
    });
  } catch (error: any) {
    console.error("[Resend Credentials Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend credentials." },
      { status: 500 }
    );
  }
}

