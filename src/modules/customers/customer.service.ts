/**
 * CUSTOMER & VILLAGE DOMAIN MODULE: SERVICE IMPLEMENTATION
 *
 * Implements business logic for:
 * - Customer directory queries (active, blacklisted, balance filtering)
 * - Safe account deactivation & blacklisting (NO database deletion, preserves ledger history)
 * - Account reactivation
 * - Profile & Village directory management
 */

import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/utils";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import {
  CustomerQueryOptions,
  CustomerSummary,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  VillageDTO,
} from "./types";

export class CustomerService {
  private static instance: CustomerService;

  static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  /**
   * Retrieves customers according to query options.
   * By default, returns ALL customers (with active and blacklisted identified)
   * if status is 'all' or not specified.
   */
  async getCustomers(options: CustomerQueryOptions = {}): Promise<CustomerSummary[]> {
    const rawStatus = (options.status || options.filter || "all").toLowerCase().trim();
    const search = options.search?.trim() || "";
    const villageId = options.villageId?.trim() || "";

    const whereClause: any = {};

    if (rawStatus === "blacklisted" || rawStatus === "inactive") {
      whereClause.isActive = false;
    } else if (rawStatus === "active") {
      whereClause.isActive = true;
    } else if (rawStatus === "with_balance") {
      whereClause.isActive = true;
      whereClause.currentBalance = { gt: 0 };
    } else if (rawStatus === "zero_balance") {
      whereClause.isActive = true;
      whereClause.currentBalance = { lte: 0 };
    }
    // If rawStatus === "all", no isActive filter is applied so both active and blacklisted return!

    if (villageId) {
      whereClause.villageId = villageId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { customerCode: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { altMobile: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        village: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { orders: true, payments: true, ledgerEntries: true },
        },
      },
      orderBy: { name: "asc" },
      take: options.limit,
      skip: options.offset,
    });

    return customers.map((c) => ({
      id: c.id,
      customerCode: c.customerCode,
      name: c.name,
      mobile: c.mobile,
      altMobile: c.altMobile,
      email: c.email,
      address: c.address,
      villageId: c.villageId,
      villageName: c.village.name,
      villageCode: c.village.code,
      creditLimit: Number(c.creditLimit),
      currentBalance: Number(c.currentBalance),
      notes: c.notes,
      isActive: c.isActive,
      orderCount: c._count.orders,
      paymentCount: c._count.payments,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Retrieves single customer by ID with related village and recent records
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        village: true,
        orders: {
          orderBy: { orderDate: "desc" },
          take: 50,
          include: { items: true },
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

    return customer;
  }

  /**
   * Creates a new Customer account with validation & welcome email dispatch
   */
  async createCustomer(data: CreateCustomerDTO): Promise<CustomerSummary> {
    const cleanMobile = data.mobile.trim().replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      throw new Error("Valid 10-digit customer mobile number is required.");
    }

    const existingMobile = await prisma.customer.findFirst({
      where: { mobile: cleanMobile },
    });
    if (existingMobile) {
      throw new Error(
        `Mobile ${cleanMobile} is already in use by customer "${existingMobile.name}" (${existingMobile.customerCode}).`
      );
    }

    let cleanEmail: string | null = null;
    if (data.email?.trim()) {
      cleanEmail = data.email.trim().toLowerCase();
      const existingEmail = await prisma.customer.findFirst({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        throw new Error(
          `Email address "${cleanEmail}" is already registered with customer "${existingEmail.name}".`
        );
      }
    }

    const village = await prisma.village.findUnique({
      where: { id: data.villageId },
    });
    if (!village) {
      throw new Error("Specified village does not exist.");
    }

    const customerCode = await generateCustomerCode(village.code);
    const initialBalance = data.initialBalance ? Number(data.initialBalance) : 0;
    const creditLimit = data.creditLimit !== undefined ? Number(data.creditLimit) : 5000;

    const newCustomer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: data.name.trim(),
          customerCode,
          mobile: cleanMobile,
          altMobile: data.altMobile?.trim() || null,
          email: cleanEmail,
          address: data.address?.trim() || null,
          villageId: data.villageId,
          creditLimit,
          currentBalance: initialBalance,
          notes: data.notes?.trim() || null,
          isActive: true,
        },
        include: {
          village: { select: { id: true, name: true, code: true } },
        },
      });

      if (initialBalance > 0) {
        await tx.ledgerEntry.create({
          data: {
            customerId: created.id,
            entryType: "ADJUSTMENT",
            description: "Initial balance brought forward at account registration",
            debitAmount: initialBalance,
            creditAmount: 0,
            runningBalance: initialBalance,
          },
        });
      }

      return created;
    });

    if (cleanEmail) {
      sendCustomerWelcomeEmail({
        to: cleanEmail,
        customerName: newCustomer.name,
        customerCode: newCustomer.customerCode,
        mobile: newCustomer.mobile,
        villageName: village.name,
        initialBalance: initialBalance,
        portalUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      }).catch(() => {});
    }

    return {
      id: newCustomer.id,
      customerCode: newCustomer.customerCode,
      name: newCustomer.name,
      mobile: newCustomer.mobile,
      altMobile: newCustomer.altMobile,
      email: newCustomer.email,
      address: newCustomer.address,
      villageId: newCustomer.villageId,
      villageName: newCustomer.village.name,
      villageCode: newCustomer.village.code,
      creditLimit: Number(newCustomer.creditLimit),
      currentBalance: Number(newCustomer.currentBalance),
      notes: newCustomer.notes,
      isActive: newCustomer.isActive,
      createdAt: newCustomer.createdAt,
    };
  }

  /**
   * Updates an existing customer profile
   */
  async updateCustomer(id: string, data: UpdateCustomerDTO) {
    let cleanMobile: string | undefined = undefined;
    if (data.mobile) {
      cleanMobile = data.mobile.trim().replace(/\D/g, "").slice(-10);
      if (cleanMobile.length !== 10) {
        throw new Error("Valid 10-digit mobile number is required.");
      }
      const existing = await prisma.customer.findFirst({
        where: { mobile: cleanMobile, id: { not: id } },
      });
      if (existing) {
        throw new Error(
          `Mobile ${cleanMobile} is already in use by customer "${existing.name}" (${existing.customerCode}).`
        );
      }
    }

    let cleanEmail: string | null | undefined = undefined;
    if (data.email !== undefined) {
      if (data.email?.trim()) {
        cleanEmail = data.email.trim().toLowerCase();
        const existing = await prisma.customer.findFirst({
          where: { email: cleanEmail, id: { not: id } },
        });
        if (existing) {
          throw new Error(
            `Email "${cleanEmail}" is already in use by customer "${existing.name}".`
          );
        }
      } else {
        cleanEmail = null;
      }
    }

    let nextActiveState: boolean | undefined =
      typeof data.isActive === "boolean" ? data.isActive : undefined;

    if (data.action === "BLACKLIST" || data.action === "DISABLE") {
      nextActiveState = false;
    } else if (data.action === "ACTIVATE" || data.action === "ENABLE") {
      nextActiveState = true;
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(cleanMobile ? { mobile: cleanMobile } : {}),
          altMobile: data.altMobile !== undefined ? data.altMobile?.trim() || null : undefined,
          ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
          address: data.address !== undefined ? data.address?.trim() || null : undefined,
          villageId: data.villageId || undefined,
          creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : undefined,
          notes: data.notes !== undefined ? data.notes?.trim() || null : undefined,
          ...(nextActiveState !== undefined ? { isActive: nextActiveState } : {}),
        },
        include: {
          village: { select: { id: true, name: true, code: true } },
        },
      });

      // If blacklisted or disabled, revoke all active sessions immediately
      if (nextActiveState === false) {
        await tx.activeSession.updateMany({
          where: { role: "CUSTOMER", identifier: id, isActive: true },
          data: { isActive: false },
        });
      }

      return updated;
    });
  }

  /**
   * Safely deactivates & blacklists an account WITHOUT deleting any database records!
   * Preserves all foreign keys, past invoices, ledger entries, and audit logs.
   * Bans the user from logging in or performing checkout actions.
   */
  async deactivateCustomer(id: string, reason?: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error("Customer not found.");

    const timestamp = new Date().toISOString();
    const reasonTag = reason || "Administrative action";
    const appendedNotes = customer.notes
      ? `${customer.notes} [BLACKLISTED: ${reasonTag} on ${timestamp}]`
      : `[BLACKLISTED: ${reasonTag} on ${timestamp}]`;

    return await prisma.$transaction(async (tx) => {
      // 1. Mark inactive in DB
      const updated = await tx.customer.update({
        where: { id },
        data: {
          isActive: false,
          notes: appendedNotes,
        },
        include: {
          village: { select: { id: true, name: true, code: true } },
        },
      });

      // 2. Revoke all active login sessions immediately
      await tx.activeSession.updateMany({
        where: { role: "CUSTOMER", identifier: id, isActive: true },
        data: { isActive: false },
      });

      return updated;
    });
  }

  /**
   * Reactivates a previously blacklisted/disabled account
   */
  async reactivateCustomer(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error("Customer not found.");

    const timestamp = new Date().toISOString();
    const appendedNotes = customer.notes
      ? `${customer.notes} [REACTIVATED on ${timestamp}]`
      : `[REACTIVATED on ${timestamp}]`;

    return await prisma.customer.update({
      where: { id },
      data: {
        isActive: true,
        notes: appendedNotes,
      },
      include: {
        village: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Villages management
   */
  async getVillages(): Promise<VillageDTO[]> {
    const villages = await prisma.village.findMany({
      orderBy: { name: "asc" },
      include: {
        customers: {
          select: { id: true, isActive: true, currentBalance: true },
        },
      },
    });

    return villages.map((v) => {
      // Only count active customers for the active village count
      const activeCusts = v.customers.filter((c) => c.isActive);
      const totalBalance = activeCusts.reduce(
        (sum, c) => sum + Number(c.currentBalance || 0),
        0
      );

      return {
        id: v.id,
        code: v.code,
        name: v.name,
        taluk: v.taluk,
        district: v.district,
        pincode: v.pincode,
        notes: v.notes,
        isActive: v.isActive,
        customerCount: activeCusts.length,
        totalBalance,
      };
    });
  }
}
