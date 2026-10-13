/**
 * BILLING & INVOICING DOMAIN MODULE: SERVICE IMPLEMENTATION
 */

import { prisma } from "@/lib/prisma";
import { roundCurrency, executeAcidOrderCreation } from "@/lib/acid-ledger";
import { BillingDraft, BillingLineItem, InvoiceReceipt } from "./types";

export class BillingService {
  private static instance: BillingService;

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  /**
   * Calculates itemized line totals and overall order amount with exact currency precision
   */
  calculateTotals(items: Array<{ quantity: number; pricePerUnit: number }>): {
    totalAmount: number;
    itemCount: number;
  } {
    let total = 0;
    for (const item of items) {
      const q = Math.max(1, Number(item.quantity) || 1);
      const p = Math.max(0, Number(item.pricePerUnit) || 0);
      total = roundCurrency(total + q * p);
    }
    return {
      totalAmount: total,
      itemCount: items.length,
    };
  }

  /**
   * Validates billing draft rules
   */
  async validateDraft(draft: Partial<BillingDraft>): Promise<{ valid: boolean; error?: string }> {
    if (!draft.villageId) {
      return { valid: false, error: "Village selection is required." };
    }
    if (!draft.customerId) {
      return { valid: false, error: "Customer selection is required." };
    }
    if (!draft.items || !Array.isArray(draft.items) || draft.items.length === 0) {
      return { valid: false, error: "Bill must contain at least one line item." };
    }

    // Verify customer is active and not blacklisted
    const customer = await prisma.customer.findUnique({
      where: { id: draft.customerId },
      select: { id: true, name: true, isActive: true },
    });

    if (!customer) {
      return { valid: false, error: "Customer account not found." };
    }

    if (!customer.isActive) {
      return {
        valid: false,
        error: `Customer "${customer.name}" is blacklisted/deactivated. Cannot issue new bills.`,
      };
    }

    return { valid: true };
  }

  /**
   * Submits a confirmed counter bill draft into PostgreSQL ACID ledger
   */
  async executeCounterBill(
    draft: BillingDraft,
    paymentDetails?: {
      paymentMethod?: string;
      cashfreeOrderId?: string;
      cashfreePaymentId?: string;
      paymentSessionId?: string;
    }
  ) {
    const validation = await this.validateDraft(draft);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return executeAcidOrderCreation({
      villageId: draft.villageId,
      customerId: draft.customerId,
      items: draft.items.map((i) => ({
        customItemId: i.customItemId,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        pricePerUnit: i.pricePerUnit,
      })),
      paymentType: draft.paymentType,
      paidAmount: draft.paidAmount,
      paymentMethod: paymentDetails?.paymentMethod || "CASH",
      notes: draft.notes,
      cashfreeOrderId: paymentDetails?.cashfreeOrderId,
      cashfreePaymentId: paymentDetails?.cashfreePaymentId,
      paymentSessionId: paymentDetails?.paymentSessionId,
    });
  }

  /**
   * Retrieves full invoice and receipt data by order ID
   */
  async getInvoiceReceipt(orderId: string): Promise<InvoiceReceipt | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            customerCode: true,
            mobile: true,
            village: { select: { name: true } },
          },
        },
        items: true,
        payments: {
          where: { status: "SUCCESS" },
          select: {
            paymentRef: true,
            amount: true,
            method: true,
            paidAt: true,
          },
        },
      },
    });

    if (!order) return null;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customer: {
        name: order.customer.name,
        customerCode: order.customer.customerCode,
        mobile: order.customer.mobile,
        villageName: order.customer.village?.name,
      },
      items: order.items.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        pricePerUnit: Number(i.pricePerUnit),
        lineTotal: Number(i.lineTotal),
      })),
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      creditAmount: Number(order.creditAmount),
      paymentType: order.paymentType,
      paymentStatus: order.paymentStatus,
      payments: order.payments.map((p) => ({
        paymentRef: p.paymentRef,
        amount: Number(p.amount),
        method: p.method,
        paidAt: p.paidAt,
      })),
    };
  }
}

