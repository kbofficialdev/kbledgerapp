import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, requireCustomerSession } from "@/lib/auth-session";
import { reconcilePendingCashfreePayments } from "@/lib/cashfree-reconcile";
import { sanitizeApiError } from "@/lib/api-error";
import { CustomerService } from "@/modules/customers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCustomerSession(req, params.id);
    if (!auth.authorized) return auth.response!;

    await reconcilePendingCashfreePayments();

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        village: true,
        orders: {
          orderBy: { orderDate: "desc" },
          take: 50,
          include: {
            items: true,
          },
        },
        ledgerEntries: {
          orderBy: { entryDate: "desc" },
          take: 100,
        },
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Block disabled/blacklisted customers if accessed by a customer session
    if (!customer.isActive && auth.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been disabled by the administrator.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        creditLimit: Number(customer.creditLimit),
        currentBalance: Number(customer.currentBalance),
        orders: customer.orders.map((o) => ({
          ...o,
          totalAmount: Number(o.totalAmount),
          paidAmount: Number(o.paidAmount),
          creditAmount: Number(o.creditAmount),
          items: o.items.map((i) => ({
            ...i,
            quantity: Number(i.quantity),
            pricePerUnit: Number(i.pricePerUnit),
            lineTotal: Number(i.lineTotal),
          })),
        })),
        ledgerEntries: customer.ledgerEntries.map((l) => ({
          ...l,
          debitAmount: Number(l.debitAmount),
          creditAmount: Number(l.creditAmount),
          runningBalance: Number(l.runningBalance),
        })),
        payments: customer.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to load customer profile.") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const {
      name,
      mobile,
      altMobile,
      email,
      address,
      creditLimit,
      notes,
      villageId,
      isActive,
      action, // Optional: "BLACKLIST" | "DISABLE" | "ACTIVATE"
    } = body;

    let cleanMobile: string | undefined = undefined;
    if (mobile && typeof mobile === "string") {
      const sanitized = mobile.trim().replace(/\D/g, "").slice(-10);
      if (sanitized.length !== 10) {
        return NextResponse.json(
          { success: false, error: "Valid 10-digit mobile number is required" },
          { status: 400 }
        );
      }
      const existing = await prisma.customer.findFirst({
        where: { mobile: sanitized, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Mobile number ${sanitized} is already in use by customer "${existing.name}" (${existing.customerCode}).`,
          },
          { status: 409 }
        );
      }
      cleanMobile = sanitized;
    }

    let cleanEmail: string | null | undefined = undefined;
    if (email !== undefined) {
      if (email && typeof email === "string" && email.trim()) {
        const sanitizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
          return NextResponse.json(
            { success: false, error: "Please provide a valid email format" },
            { status: 400 }
          );
        }
        const existing = await prisma.customer.findFirst({
          where: { email: sanitizedEmail, id: { not: params.id } },
        });
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              error: `Email address "${sanitizedEmail}" is already in use by customer "${existing.name}" (${existing.customerCode}).`,
            },
            { status: 409 }
          );
        }
        cleanEmail = sanitizedEmail;
      } else {
        cleanEmail = null;
      }
    }

    let nextActiveState: boolean | undefined =
      typeof isActive === "boolean" ? isActive : undefined;
    if (action === "BLACKLIST" || action === "DISABLE") {
      nextActiveState = false;
    } else if (action === "ACTIVATE" || action === "ENABLE") {
      nextActiveState = true;
    }

    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: params.id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(cleanMobile ? { mobile: cleanMobile } : {}),
          altMobile: altMobile !== undefined ? altMobile?.trim() || null : undefined,
          ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
          address: address !== undefined ? address?.trim() || null : undefined,
          villageId: villageId || undefined,
          creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
          notes: notes !== undefined ? notes?.trim() || null : undefined,
          ...(nextActiveState !== undefined ? { isActive: nextActiveState } : {}),
        },
        include: {
          village: { select: { id: true, name: true, code: true } },
        },
      });

      // If blacklisted/disabled, immediately revoke all active customer sessions
      if (nextActiveState === false) {
        await tx.activeSession.updateMany({
          where: {
            role: "CUSTOMER",
            identifier: params.id,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        creditLimit: Number(customer.creditLimit),
        currentBalance: Number(customer.currentBalance),
      },
      message:
        nextActiveState === false
          ? "Customer account blacklisted & disabled. Active sessions revoked."
          : nextActiveState === true
            ? "Customer account re-activated."
            : "Customer profile updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to update customer details.") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return PUT(req, context);
}

/**
 * DELETE /api/customers/[id]
 * Safely deactivates & blacklists the customer without wiping historical orders or ledgers.
 * Immediately revokes active login sessions and bans login and checkout actions.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.authorized) return auth.response!;

    const deactivated = await CustomerService.getInstance().deactivateCustomer(
      params.id,
      "Administrative deactivation/blacklisting"
    );

    return NextResponse.json({
      success: true,
      deactivatedId: params.id,
      customer: deactivated,
      message: `Customer "${deactivated.name}" has been safely deactivated & blacklisted. Database history and audit ledgers preserved.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to deactivate customer account.") },
      { status: 500 }
    );
  }
}
