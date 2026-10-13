import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { requireAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

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
    return NextResponse.json(
      { error: sanitizeApiError(error, "Failed to resend credentials. Please verify store email settings.") },
      { status: 500 }
    );
  }
}

