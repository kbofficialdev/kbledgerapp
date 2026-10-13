import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/utils";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { requireAdminSession } from "@/lib/auth-session";
import { reconcilePendingCashfreePayments } from "@/lib/cashfree-reconcile";
import { sanitizeApiError } from "@/lib/api-error";
import { CustomerService } from "@/modules/customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    await reconcilePendingCashfreePayments();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const villageId = searchParams.get("villageId")?.trim() || "";
    const status = (searchParams.get("status") || searchParams.get("filter") || "all").toLowerCase().trim();

    const formattedCustomers = await CustomerService.getInstance().getCustomers({
      status,
      villageId,
      search,
    });

    return NextResponse.json({ success: true, customers: formattedCustomers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to fetch customers.") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const {
      villageId,
      name,
      mobile,
      altMobile,
      email,
      address,
      creditLimit,
      initialBalance,
      notes,
    } = body;

    if (!villageId) {
      return NextResponse.json(
        { success: false, error: "Village selection is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    const cleanMobile = mobile.trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
      return NextResponse.json(
        { success: false, error: "Valid 10-digit mobile number is required" },
        { status: 400 }
      );
    }

    // Check unique mobile constraint
    const existingMobile = await prisma.customer.findFirst({
      where: { mobile: cleanMobile },
    });
    if (existingMobile) {
      return NextResponse.json(
        {
          success: false,
          error: `Mobile number ${cleanMobile} is already registered with customer "${existingMobile.name}" (${existingMobile.customerCode}). Duplicate mobile numbers are not allowed.`,
        },
        { status: 409 }
      );
    }

    // Check unique email constraint if email provided
    let cleanEmail: string | null = null;
    if (email && typeof email === "string" && email.trim()) {
      const parsedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsedEmail)) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid email address format (e.g. name@domain.com)" },
          { status: 400 }
        );
      }

      const existingEmail = await prisma.customer.findFirst({
        where: { email: parsedEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: `Email address "${parsedEmail}" is already registered with customer "${existingEmail.name}" (${existingEmail.customerCode}). Duplicate email addresses are not allowed.`,
          },
          { status: 409 }
        );
      }
      cleanEmail = parsedEmail;
    }

    // Verify village exists
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    });

    if (!village) {
      return NextResponse.json(
        { success: false, error: "Specified village does not exist" },
        { status: 404 }
      );
    }

    // Generate unique customer code
    let customerCode = body.customerCode?.trim();
    if (!customerCode) {
      customerCode = generateCustomerCode(village.code);
      const exists = await prisma.customer.findUnique({
        where: { customerCode },
      });
      if (exists) {
        customerCode = `${customerCode}-${Math.floor(10 + Math.random() * 90)}`;
      }
    }

    const initBal = Number(initialBalance || 0);

    const customer = await prisma.$transaction(async (tx) => {
      const newCust = await tx.customer.create({
        data: {
          customerCode,
          name: name.trim(),
          mobile: cleanMobile,
          altMobile: altMobile?.trim() || null,
          email: cleanEmail,
          address: address?.trim() || null,
          villageId,
          creditLimit: Number(creditLimit || 0),
          currentBalance: initBal,
          notes: notes?.trim() || null,
        },
      });

      if (initBal > 0) {
        await tx.ledgerEntry.create({
          data: {
            customerId: newCust.id,
            entryType: "ADJUSTMENT",
            debitAmount: initBal,
            creditAmount: 0,
            runningBalance: initBal,
            description: "Opening balance migrated from physical bahi-khata book",
          },
        });
      }

      return newCust;
    });

    if (customer.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const portalUrl = `${appUrl}/portal/${customer.id}`;
      sendCustomerWelcomeEmail({
        to: customer.email,
        customerName: customer.name,
        customerCode: customer.customerCode,
        villageName: village.name,
        mobile: customer.mobile,
        initialBalance: initBal,
        portalUrl,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to create customer. Please ensure mobile/email are valid and unique.") },
      { status: 500 }
    );
  }
}
