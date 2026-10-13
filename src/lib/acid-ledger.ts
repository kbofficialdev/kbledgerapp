import { Prisma, PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { generateCustomItemId, generateOrderNumber } from "@/lib/utils";

/**
 * Exact 2-decimal paise rounding to prevent IEEE-754 floating-point drift
 */
export function roundCurrency(value: number | string | Decimal): number {
  const num = typeof value === "object" && value !== null ? Number(value) : Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(roundCurrency(value).toFixed(2));
}

export function normalizePaymentMethod(raw?: string | null): PaymentMethod {
  const upper = (raw || "CASH").trim().toUpperCase();
  const validMethods: Record<string, PaymentMethod> = {
    CASH: "CASH",
    CASHFREE_ELEMENTS: "CASHFREE_ELEMENTS",
    CASHFREE_UPI: "CASHFREE_UPI",
    CASHFREE_CARD: "CASHFREE_CARD",
    CASHFREE_NETBANKING: "CASHFREE_NETBANKING",
    GOOGLE_PAY_UPI: "GOOGLE_PAY_UPI",
    GOOGLE_PAY_QR: "GOOGLE_PAY_QR",
    GOOGLE_PAY: "GOOGLE_PAY_UPI",
    GPAY: "GOOGLE_PAY_UPI",
    DYNAMIC_QR: "GOOGLE_PAY_QR",
    UPI_INTENT: "UPI_INTENT",
    NETBANKING: "NETBANKING",
    MANUAL_TRANSFER: "MANUAL_TRANSFER",
    CASHFREE_PG: "CASHFREE_PG",
  };
  return validMethods[upper] || "CASH";
}

export interface AcidOrderLineInput {
  customItemId?: string;
  name: string;
  quantity: number;
  unit?: string;
  pricePerUnit: number;
}

export interface AcidOrderInput {
  villageId: string;
  customerId: string;
  items: AcidOrderLineInput[];
  paymentType: "CREDIT" | "DEBIT" | "PARTIAL";
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string | null;
  orderNumber?: string;
  cashfreeOrderId?: string | null;
  cashfreePaymentId?: string | null;
  paymentSessionId?: string | null;
  merchantTxnId?: string | null;
  gpayTransactionId?: string | null;
  upiRefId?: string | null;
  bankRrn?: string | null;
  payerVpa?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface OrderAllocationRecord {
  orderId: string;
  orderNumber: string;
  amountAllocated: number;
  previousCredit: number;
  remainingCredit: number;
  status: string;
}

export interface AcidPaymentInput {
  customerId: string;
  amount: number;
  method?: string;
  orderId?: string | null;
  orderIds?: string[];
  paymentRef?: string;
  notes?: string | null;
  cashfreeOrderId?: string | null;
  cashfreePaymentId?: string | null;
  paymentSessionId?: string | null;
  merchantTxnId?: string | null;
  gpayTransactionId?: string | null;
  upiRefId?: string | null;
  bankRrn?: string | null;
  payerVpa?: string | null;
  rawGatewayResponse?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  strictOrderCap?: boolean;
}

/**
 * Helper: Execute a Prisma transaction with Serializable isolation level and automatic retry on serialization conflict
 */
export async function runSerializableTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error: any) {
      lastError = error;
      const isSerializationConflict =
        error?.code === "P2034" ||
        error?.message?.includes("could not serialize access") ||
        error?.message?.includes("deadlock detected");
      if (isSerializationConflict && attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 50 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * ACID Transaction Engine: Create Order + Line Items + Optional Payment + Ledger Entries + Customer Balance + Audit
 * Uses Serializable isolation and explicit SQL SAVEPOINT / ROLLBACK TO SAVEPOINT / RELEASE SAVEPOINT checkpoints.
 */
export async function executeAcidOrderCreation(input: AcidOrderInput) {
  if (!input.villageId || !input.customerId) {
    throw new Error("Both Village and Customer are required.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order must contain at least one line item.");
  }

  // 1. Pre-validate and compute exact line totals in paise
  let calculatedTotal = 0;
  const sanitizedItems = input.items.map((item) => {
    const name = (item.name || "Item").trim();
    const quantity = Math.max(0.001, Number(item.quantity) || 1);
    const unit = (item.unit || "pcs").trim();
    const pricePerUnit = Math.max(0, roundCurrency(item.pricePerUnit));
    const lineTotal = roundCurrency(quantity * pricePerUnit);
    calculatedTotal = roundCurrency(calculatedTotal + lineTotal);

    return {
      customItemId: item.customItemId?.trim() || generateCustomItemId(),
      name,
      quantity,
      unit,
      pricePerUnit,
      lineTotal,
    };
  });

  if (calculatedTotal <= 0) {
    throw new Error("Order total amount must be greater than zero.");
  }

  let finalPaidAmount = 0;
  let finalCreditAmount = 0;

  if (input.paymentType === "CREDIT") {
    finalPaidAmount = 0;
    finalCreditAmount = calculatedTotal;
  } else if (input.paymentType === "DEBIT") {
    finalPaidAmount = calculatedTotal;
    finalCreditAmount = 0;
  } else if (input.paymentType === "PARTIAL") {
    finalPaidAmount = Math.min(calculatedTotal, Math.max(0, roundCurrency(input.paidAmount || 0)));
    finalCreditAmount = roundCurrency(calculatedTotal - finalPaidAmount);
  } else {
    throw new Error("Invalid payment settlement type.");
  }

  // Mathematical Invariant 1: Total === Paid + Credit
  if (roundCurrency(finalPaidAmount + finalCreditAmount) !== calculatedTotal) {
    throw new Error("Financial invariant violation: Paid + Credit does not equal Order Total.");
  }

  const orderNumber = input.orderNumber || generateOrderNumber();
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);

  return runSerializableTransaction(async (tx) => {
    // Checkpoint 1: Customer & Village Verification Savepoint
    await tx.$executeRawUnsafe(`SAVEPOINT sp_order_init`);

    try {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new Error("Customer not found.");
      }

      // Idempotency guard: if Cashfree webhook already created the counter bill for this cashfreeOrderId
      if (input.cashfreeOrderId) {
        const existingCfPayment = await tx.payment.findUnique({
          where: { cashfreeOrderId: input.cashfreeOrderId },
        });
        if (existingCfPayment && existingCfPayment.orderId && existingCfPayment.status === "SUCCESS") {
          const existingOrder = await tx.order.findUnique({
            where: { id: existingCfPayment.orderId },
            include: { items: true },
          });
          if (existingOrder) {
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_order_init`);
            const currentBal = roundCurrency(customer.currentBalance);
            return {
              order: existingOrder,
              payment: existingCfPayment,
              previousBalance: roundCurrency(currentBal - roundCurrency(existingOrder.creditAmount)),
              newBalance: currentBal,
              idempotent: true,
            };
          }
        }
      }

      const balanceBefore = roundCurrency(customer.currentBalance);
      const balanceAfterDebit = roundCurrency(balanceBefore + calculatedTotal);
      const balanceAfterFinal = roundCurrency(balanceBefore + finalCreditAmount);

      // Checkpoint 2: Order & Line Items Creation Savepoint
      await tx.$executeRawUnsafe(`SAVEPOINT sp_order_records`);

      const order = await tx.order.create({
        data: {
          orderNumber,
          villageId: input.villageId,
          customerId: input.customerId,
          totalAmount: toDecimal(calculatedTotal),
          paidAmount: toDecimal(finalPaidAmount),
          creditAmount: toDecimal(finalCreditAmount),
          paymentType:
            finalCreditAmount === 0
              ? "DEBIT"
              : finalPaidAmount > 0
                ? "PARTIAL"
                : "CREDIT",
          paymentStatus: "SUCCESS",
          notes: input.notes?.trim() || null,
          items: {
            create: sanitizedItems.map((i) => ({
              customItemId: i.customItemId,
              name: i.name,
              quantity: new Decimal(i.quantity.toFixed(3)),
              unit: i.unit,
              pricePerUnit: toDecimal(i.pricePerUnit),
              lineTotal: toDecimal(i.lineTotal),
            })),
          },
        },
        include: { items: true },
      });

      // Checkpoint 3: Payment & Ledger Entries Savepoint
      await tx.$executeRawUnsafe(`SAVEPOINT sp_order_ledger`);

      let paymentRecord = null;
      if (finalPaidAmount > 0) {
        if (input.cashfreeOrderId) {
          const existingPayment = await tx.payment.findUnique({
            where: { cashfreeOrderId: input.cashfreeOrderId },
          });
          if (existingPayment) {
            paymentRecord = await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                orderId: order.id,
                amount: toDecimal(finalPaidAmount),
                status: "SUCCESS",
                method: paymentMethod,
                cashfreePaymentId: input.cashfreePaymentId || existingPayment.cashfreePaymentId,
                paymentSessionId: input.paymentSessionId || existingPayment.paymentSessionId,
                paidAt: new Date(),
                notes: input.notes
                  ? `Counter bill payment for ${orderNumber} - ${input.notes}`
                  : `Counter bill payment for ${orderNumber}`,
              },
            });
          }
        }

        if (!paymentRecord) {
          paymentRecord = await tx.payment.create({
            data: {
              paymentRef: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
              orderId: order.id,
              customerId: input.customerId,
              amount: toDecimal(finalPaidAmount),
              method: paymentMethod,
              status: "SUCCESS",
              cashfreeOrderId: input.cashfreeOrderId || null,
              cashfreePaymentId: input.cashfreePaymentId || null,
              paymentSessionId: input.paymentSessionId || null,
              merchantTxnId: input.merchantTxnId || null,
              gpayTransactionId: input.gpayTransactionId || null,
              upiRefId: input.upiRefId || null,
              bankRrn: input.bankRrn || null,
              payerVpa: input.payerVpa || null,
              notes: input.notes
                ? `Counter bill payment for ${orderNumber} - ${input.notes}`
                : `Counter bill payment for ${orderNumber}`,
            },
          });
        }
      }

      // Update Customer Current Balance atomically
      const updatedCustomer = await tx.customer.update({
        where: { id: input.customerId },
        data: {
          currentBalance: toDecimal(balanceAfterFinal),
        },
      });

      // Verify post-update customer balance invariant
      if (roundCurrency(updatedCustomer.currentBalance) !== balanceAfterFinal) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT sp_order_ledger`);
        throw new Error("Customer balance verification failed after order creation.");
      }

      // Record Bahi-Khata Ledger Entry 1: BILL_DEBIT
      const itemsSummary = sanitizedItems
        .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
        .join(", ");

      await tx.ledgerEntry.create({
        data: {
          customerId: input.customerId,
          orderId: order.id,
          entryType: "BILL_DEBIT",
          debitAmount: toDecimal(calculatedTotal),
          creditAmount: toDecimal(0),
          runningBalance: toDecimal(balanceAfterDebit),
          description: `Bill #${orderNumber} [${itemsSummary.slice(0, 80)}]`,
        },
      });

      // Record Bahi-Khata Ledger Entry 2: PAYMENT_CREDIT (if paid in part or full)
      if (finalPaidAmount > 0) {
        await tx.ledgerEntry.create({
          data: {
            customerId: input.customerId,
            orderId: order.id,
            entryType: "PAYMENT_CREDIT",
            debitAmount: toDecimal(0),
            creditAmount: toDecimal(finalPaidAmount),
            runningBalance: toDecimal(balanceAfterFinal),
            description: `Payment received (${paymentMethod}) against Bill #${orderNumber}`,
          },
        });
      }

      // Record Immutable TransactionAudit
      await tx.transactionAudit.create({
        data: {
          transactionRef: `TXN-ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
          customerId: input.customerId,
          amount: toDecimal(calculatedTotal),
          method: paymentMethod,
          status: "SUCCESS",
          balanceBefore: toDecimal(balanceBefore),
          balanceAfter: toDecimal(balanceAfterFinal),
          orderAllocations: [
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              totalAmount: calculatedTotal,
              paidAmount: finalPaidAmount,
              creditAmount: finalCreditAmount,
              status: order.paymentType,
            },
          ],
          cashfreeOrderId: input.cashfreeOrderId || null,
          cashfreePaymentId: input.cashfreePaymentId || null,
          paymentSessionId: input.paymentSessionId || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          notes: `ACID Order #${orderNumber} (${input.paymentType})`,
        },
      });

      // Release all checkpoints on verified completion
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_order_ledger`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_order_records`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_order_init`);

      return {
        order,
        paymentRecord,
        balanceBefore,
        newBalance: balanceAfterFinal,
      };
    } catch (err) {
      await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT sp_order_init`).catch(() => {});
      throw err;
    }
  });
}

/**
 * ACID Transaction Engine: Record Payment / Multi-Order Settlement with FIFO Order Allocation & Savepoints
 * Guarantees that every payment reduces both Customer.currentBalance AND open Order.creditAmount (FIFO),
 * and writes synchronized Payment, LedgerEntry, and TransactionAudit records.
 */
export async function executeAcidPaymentSettlement(input: AcidPaymentInput) {
  const requestedAmount = roundCurrency(input.amount);
  if (!input.customerId) {
    throw new Error("Customer ID is required.");
  }
  if (requestedAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const method = normalizePaymentMethod(input.method);

  return runSerializableTransaction(async (tx) => {
    await tx.$executeRawUnsafe(`SAVEPOINT sp_payment_init`);

    try {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new Error("Customer profile not found.");
      }

      // Idempotency check if cashfreeOrderId is already marked SUCCESS
      if (input.cashfreeOrderId) {
        const existingCf = await tx.payment.findUnique({
          where: { cashfreeOrderId: input.cashfreeOrderId },
        });
        if (existingCf && existingCf.status === "SUCCESS") {
          const latestLedger = await tx.ledgerEntry.findFirst({
            where: { customerId: customer.id },
            orderBy: { entryDate: "desc" },
          });
          await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_payment_init`);
          return {
            alreadyProcessed: true,
            payment: existingCf,
            paymentRef: existingCf.paymentRef,
            transactionRef: `IDEMPOTENT-${existingCf.paymentRef}`,
            amountPaid: roundCurrency(existingCf.amount),
            balanceBefore: roundCurrency(customer.currentBalance),
            balanceAfter: roundCurrency(customer.currentBalance),
            allocations: [] as OrderAllocationRecord[],
            updatedCustomer: customer,
            ledger: latestLedger,
          };
        }
      }

      // Fetch candidate orders for FIFO credit reduction
      const targetOrderIds =
        input.orderIds && input.orderIds.length > 0
          ? input.orderIds
          : input.orderId
            ? [input.orderId]
            : [];

      let priorityOrders =
        targetOrderIds.length > 0
          ? await tx.order.findMany({
              where: {
                id: { in: targetOrderIds },
                customerId: customer.id,
              },
              orderBy: { orderDate: "asc" },
            })
          : [];

      if (input.strictOrderCap && targetOrderIds.length > 0) {
        if (priorityOrders.length !== targetOrderIds.length) {
          throw new Error(
            "One or more selected orders could not be verified or do not belong to this customer."
          );
        }
        const totalSelectedDebt = roundCurrency(
          priorityOrders.reduce((sum, o) => sum + roundCurrency(o.creditAmount), 0)
        );
        if (requestedAmount > totalSelectedDebt + 0.01) {
          throw new Error(
            `Payment amount (₹${requestedAmount}) cannot exceed total debt owed on selected orders (₹${totalSelectedDebt.toFixed(2)}).`
          );
        }
      }

      // Also fetch any other unpaid credit orders for FIFO allocation if payment exceeds priorityOrders
      const otherOpenOrders = await tx.order.findMany({
        where: {
          customerId: customer.id,
          creditAmount: { gt: 0 },
          ...(targetOrderIds.length > 0 ? { id: { notIn: targetOrderIds } } : {}),
        },
        orderBy: { orderDate: "asc" },
      });

      const candidateOrders = [...priorityOrders, ...otherOpenOrders];

      await tx.$executeRawUnsafe(`SAVEPOINT sp_payment_fifo_allocation`);

      let remainingToAllocate = requestedAmount;
      const allocations: OrderAllocationRecord[] = [];

      for (const order of candidateOrders) {
        if (remainingToAllocate <= 0) break;

        const orderCredit = roundCurrency(order.creditAmount);
        if (orderCredit <= 0) continue;

        const orderPaid = roundCurrency(order.paidAmount);
        const orderTotal = roundCurrency(order.totalAmount);

        const allocate = roundCurrency(Math.min(remainingToAllocate, orderCredit));
        remainingToAllocate = roundCurrency(remainingToAllocate - allocate);

        const newPaid = roundCurrency(Math.min(orderTotal, orderPaid + allocate));
        const newCredit = roundCurrency(Math.max(0, orderTotal - newPaid));
        const newPaymentType = newCredit <= 0 ? "DEBIT" : "PARTIAL";

        allocations.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountAllocated: allocate,
          previousCredit: orderCredit,
          remainingCredit: newCredit,
          status: newPaymentType,
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: toDecimal(newPaid),
            creditAmount: toDecimal(newCredit),
            paymentType: newPaymentType,
            paymentStatus: "SUCCESS",
            updatedAt: new Date(),
          },
        });
      }

      // Checkpoint 2: Customer Balance & Ledger Update
      await tx.$executeRawUnsafe(`SAVEPOINT sp_payment_ledger`);

      const balanceBefore = roundCurrency(customer.currentBalance);
      const balanceAfter = roundCurrency(Math.max(0, balanceBefore - requestedAmount));

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: toDecimal(balanceAfter),
        },
      });

      if (roundCurrency(updatedCustomer.currentBalance) !== balanceAfter) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT sp_payment_ledger`);
        throw new Error("Customer balance invariant check failed during payment settlement.");
      }

      const paymentRef =
        input.paymentRef ||
        `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      let payment = null;
      if (input.cashfreeOrderId) {
        const existingPayment = await tx.payment.findUnique({
          where: { cashfreeOrderId: input.cashfreeOrderId },
        });
        if (existingPayment) {
          payment = await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount: toDecimal(requestedAmount),
              status: "SUCCESS",
              cashfreePaymentId: input.cashfreePaymentId || existingPayment.cashfreePaymentId,
              paymentSessionId: input.paymentSessionId || existingPayment.paymentSessionId,
              bankRrn: input.bankRrn || existingPayment.bankRrn,
              gatewayResponseCode: "SUCCESS",
              rawGatewayResponse: input.rawGatewayResponse || existingPayment.rawGatewayResponse,
              notes: input.notes || existingPayment.notes,
              paidAt: new Date(),
            },
          });
        }
      }

      const primaryOrderId =
        input.orderId || (allocations.length === 1 ? allocations[0].orderId : null);

      if (!payment) {
        payment = await tx.payment.create({
          data: {
            paymentRef,
            customerId: customer.id,
            orderId: primaryOrderId,
            amount: toDecimal(requestedAmount),
            method,
            status: "SUCCESS",
            cashfreeOrderId: input.cashfreeOrderId || null,
            cashfreePaymentId: input.cashfreePaymentId || null,
            paymentSessionId: input.paymentSessionId || null,
            merchantTxnId: input.merchantTxnId || null,
            gpayTransactionId: input.gpayTransactionId || null,
            upiRefId: input.upiRefId || null,
            bankRrn: input.bankRrn || null,
            payerVpa: input.payerVpa || null,
            gatewayResponseCode: input.cashfreeOrderId ? "SUCCESS" : null,
            rawGatewayResponse: input.rawGatewayResponse || undefined,
            notes:
              input.notes?.trim() ||
              (allocations.length > 0
                ? `Settled against ${allocations.map((a) => a.orderNumber).join(", ")}`
                : "Khata payment received"),
            paidAt: new Date(),
          },
        });
      }

      const allocatedDesc =
        allocations.length > 0
          ? ` — Applied to ${allocations.map((a) => a.orderNumber).join(", ")}`
          : "";

      const ledger = await tx.ledgerEntry.create({
        data: {
          customerId: customer.id,
          orderId: primaryOrderId,
          entryType: "PAYMENT_CREDIT",
          debitAmount: toDecimal(0),
          creditAmount: toDecimal(requestedAmount),
          runningBalance: toDecimal(balanceAfter),
          description: `Payment received via ${method} [Ref: ${payment.paymentRef}]${allocatedDesc}`,
          entryDate: new Date(),
        },
      });

      const transactionRef = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const audit = await tx.transactionAudit.create({
        data: {
          transactionRef,
          customerId: customer.id,
          amount: toDecimal(requestedAmount),
          method,
          status: "SUCCESS",
          balanceBefore: toDecimal(balanceBefore),
          balanceAfter: toDecimal(balanceAfter),
          orderAllocations: allocations as any,
          cashfreeOrderId: input.cashfreeOrderId || null,
          cashfreePaymentId: input.cashfreePaymentId || null,
          paymentSessionId: input.paymentSessionId || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          notes: input.notes || `ACID Payment Settlement (${payment.paymentRef})`,
        },
      });

      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_payment_ledger`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_payment_fifo_allocation`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT sp_payment_init`);

      return {
        alreadyProcessed: false,
        payment,
        paymentRef: payment.paymentRef,
        transactionRef: audit.transactionRef,
        amountPaid: requestedAmount,
        balanceBefore,
        balanceAfter,
        allocations,
        updatedCustomer,
        ledger,
      };
    } catch (err) {
      await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT sp_payment_init`).catch(() => {});
      throw err;
    }
  });
}

