/**
 * ACID LEDGER & ACCOUNTING DOMAIN MODULE: TYPE DEFINITIONS
 */

export type LedgerEntryType =
  | "OPENING_BALANCE"
  | "BILL_DEBIT"
  | "PAYMENT_CREDIT"
  | "ADJUSTMENT";

export interface LedgerFilterOptions {
  villageId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  entryType?: string;
  search?: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

export interface FormattedLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  mobile: string;
  villageName?: string;
  entryType: LedgerEntryType | string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  entryDate: Date;
  referenceType?: string | null;
  referenceId?: string | null;
  orderNumber?: string | null;
  paymentRef?: string | null;
  notes?: string | null;
  customerIsActive: boolean;
}

export interface LedgerSummaryResult {
  totalDebits: number;
  totalCredits: number;
  netOutstanding: number;
  activeRecordsCount: number;
  entries: FormattedLedgerEntry[];
}

export interface LedgerInvariantCheckResult {
  customerId: string;
  customerName: string;
  calculatedBalance: number;
  storedBalance: number;
  isInvariantSatisfied: boolean;
  drift: number;
}

