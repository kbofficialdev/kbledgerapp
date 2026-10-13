/**
 * BILLING & INVOICING DOMAIN MODULE: TYPE DEFINITIONS
 */

export interface BillingLineItem {
  id: string;
  customItemId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  lineTotal: number;
}

export interface BillingDraft {
  villageId: string;
  villageName?: string;
  customerId: string;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  items: BillingLineItem[];
  totalAmount: number;
  paymentType: "CREDIT" | "DEBIT" | "PARTIAL";
  paidAmount: number;
  creditAmount: number;
  notes?: string;
}

export interface InvoiceReceipt {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  customer: {
    name: string;
    customerCode: string;
    mobile: string;
    villageName?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: string;
  paymentStatus: string;
  payments: Array<{
    paymentRef: string;
    amount: number;
    method: string;
    paidAt: Date;
  }>;
}

