/**
 * ACID LEDGER & ACCOUNTING DOMAIN MODULE: SERVICE IMPLEMENTATION
 */

import { prisma } from "@/lib/prisma";
import {
  roundCurrency,
  executeAcidOrderCreation,
  executeAcidPaymentSettlement,
  AcidOrderInput,
  AcidPaymentInput,
} from "@/lib/acid-ledger";
import {
  LedgerFilterOptions,
  FormattedLedgerEntry,
  LedgerSummaryResult,
  LedgerInvariantCheckResult,
} from "./types";

export class LedgerService {
  private static instance: LedgerService;

  static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  /**
   * Retrieves audit ledger entries with active account isolation by default
   */
  async getLedgerEntries(options: LedgerFilterOptions = {}): Promise<LedgerSummaryResult> {
    const whereClause: any = {};

    // By default, exclude deactivated/blacklisted accounts from running business ledgers
    if (!options.includeInactive) {
      whereClause.customer = { isActive: true };
    }

    if (options.villageId) {
      whereClause.customer = {
        ...(whereClause.customer || {}),
        villageId: options.villageId,
      };
    }

    if (options.customerId) {
      whereClause.customerId = options.customerId;
    }

    if (options.entryType && ["BILL_DEBIT", "PAYMENT_CREDIT", "OPENING_BALANCE", "ADJUSTMENT"].includes(options.entryType)) {
      whereClause.entryType = options.entryType;
    }

    if (options.startDate || options.endDate) {
      whereClause.entryDate = {};
      if (options.startDate) whereClause.entryDate.gte = new Date(options.startDate);
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.entryDate.lte = end;
      }
    }

    if (options.search) {
      const q = options.search.trim();
      whereClause.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { mobile: { contains: q } } },
        { customer: { customerCode: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rawEntries = await prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerCode: true,
            mobile: true,
            isActive: true,
            village: { select: { name: true } },
          },
        },
        order: { select: { orderNumber: true } },
      },
      orderBy: { entryDate: "desc" },
      take: options.limit,
      skip: options.offset,
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const entries: FormattedLedgerEntry[] = rawEntries.map((e) => {
      const debit = roundCurrency(e.debitAmount);
      const credit = roundCurrency(e.creditAmount);

      totalDebits = roundCurrency(totalDebits + debit);
      totalCredits = roundCurrency(totalCredits + credit);

      return {
        id: e.id,
        customerId: e.customerId,
        customerName: e.customer?.name || "Unknown Customer",
        customerCode: e.customer?.customerCode || "",
        mobile: e.customer?.mobile || "",
        villageName: e.customer?.village?.name,
        entryType: e.entryType,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: roundCurrency(e.runningBalance),
        entryDate: e.entryDate,
        referenceType: e.orderId ? "ORDER" : "MANUAL",
        referenceId: e.orderId || null,
        orderNumber: e.order?.orderNumber || null,
        paymentRef: null,
        notes: e.description,
        customerIsActive: e.customer?.isActive ?? true,
      };
    });

    return {
      totalDebits,
      totalCredits,
      netOutstanding: roundCurrency(totalDebits - totalCredits),
      activeRecordsCount: entries.length,
      entries,
    };
  }

  /**
   * Performs mathematical invariant verification on a customer's ledger:
   * sum(debits) - sum(credits) MUST equal currentBalance
   */
  async verifyCustomerLedgerInvariant(
    customerId: string
  ): Promise<LedgerInvariantCheckResult> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        ledgerEntries: true,
      },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found.`);
    }

    let calculated = 0;
    for (const e of customer.ledgerEntries) {
      calculated = roundCurrency(calculated + Number(e.debitAmount) - Number(e.creditAmount));
    }

    const stored = roundCurrency(customer.currentBalance);
    const drift = roundCurrency(Math.abs(calculated - stored));

    return {
      customerId,
      customerName: customer.name,
      calculatedBalance: calculated,
      storedBalance: stored,
      isInvariantSatisfied: drift < 0.01,
      drift,
    };
  }

  /**
   * Wraps ACID order creation
   */
  async executeOrder(input: AcidOrderInput) {
    return executeAcidOrderCreation(input);
  }

  /**
   * Wraps ACID payment settlement
   */
  async executeSettlement(input: AcidPaymentInput) {
    return executeAcidPaymentSettlement(input);
  }
}
