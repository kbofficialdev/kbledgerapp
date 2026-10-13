"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Banknote,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  IndianRupee,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import CashfreeCheckoutModal from "@/components/payments/CashfreeCheckoutModal";

interface BillingSlipDraft {
  villageId: string;
  villageName: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  currentBalance: number;
  creditLimit: number;
  items: Array<{
    id: string;
    customItemId: string;
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    lineTotal: number;
  }>;
  subtotal: number;
  grandTotal: number;
  notes?: string;
}

export default function BillingPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [draft, setDraft] = useState<BillingSlipDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);

  // Dedicated Step Tabs:
  // "SELECT_MODE" -> Tab 1: Choose Cash / Credit / Cashfree
  // "CASHFREE_OPTIONS" -> Tab 2: Dedicated Cashfree Custom Elements Payment Options Tab
  const [activePaymentTab, setActivePaymentTab] = useState<
    "SELECT_MODE" | "CASHFREE_OPTIONS"
  >("SELECT_MODE");

  // Settlement Mode Selection:
  // "CASH_FULL" | "CREDIT_FULL" | "CASH_PARTIAL" | "CASHFREE_GATEWAY" | "CASHFREE_PARTIAL"
  const [settlementOption, setSettlementOption] = useState<
    "CASH_FULL" | "CREDIT_FULL" | "CASH_PARTIAL" | "CASHFREE_GATEWAY" | "CASHFREE_PARTIAL"
  >("CASH_FULL");

  const [partialCashAmount, setPartialCashAmount] = useState<string>("");
  const [partialCashfreeAmount, setPartialCashfreeAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Cashfree Session State
  const [cashfreeSessionId, setCashfreeSessionId] = useState<string | null>(null);
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);
  const [cashfreeEnv, setCashfreeEnv] = useState<"sandbox" | "production">("sandbox");
  const completingOrderRef = useRef(false);

  useEffect(() => {
    fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});
    try {
      const stored = sessionStorage.getItem("kb_active_billing_slip");
      if (!stored) {
        toast.authError("No active billing draft found. Please start from Step 1.", "Draft Missing");
        router.replace("/admin/billing");
        return;
      }

      const parsed: BillingSlipDraft = JSON.parse(stored);
      if (!parsed.customerId || !parsed.items || parsed.items.length === 0 || parsed.grandTotal <= 0) {
        toast.authError("Invalid or empty billing slip. Please add items.", "Invalid Draft");
        router.replace("/admin/billing");
        return;
      }

      setDraft(parsed);
      const half = String(Math.floor(parsed.grandTotal / 2));
      setPartialCashAmount(half);
      setPartialCashfreeAmount(half);

      // If redirected back from Cashfree bank page with ?cf_order_id=...
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const returnedCfOrder = params.get("cf_order_id") || params.get("order_id");
        if (returnedCfOrder) {
          setSettlementOption("CASHFREE_GATEWAY");
          setCashfreeOrderId(returnedCfOrder);
          setActivePaymentTab("CASHFREE_OPTIONS");
        }
      }
    } catch {
      router.replace("/admin/billing");
    } finally {
      setLoadingDraft(false);
    }
  }, [router, toast]);

  if (loadingDraft || !draft) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying active billing slip...</p>
        </div>
      </div>
    );
  }

  // Calculate payment breakdown based on chosen option
  let paymentType: "DEBIT" | "CREDIT" | "PARTIAL" = "DEBIT";
  let paidAmount = draft.grandTotal;
  let creditAmount = 0;
  let paymentMethod = "CASH";

  if (settlementOption === "CASH_FULL") {
    paymentType = "DEBIT";
    paidAmount = draft.grandTotal;
    creditAmount = 0;
    paymentMethod = "CASH";
  } else if (settlementOption === "CREDIT_FULL") {
    paymentType = "CREDIT";
    paidAmount = 0;
    creditAmount = draft.grandTotal;
    paymentMethod = "CREDIT_UDHAAR";
  } else if (settlementOption === "CASH_PARTIAL") {
    paymentType = "PARTIAL";
    const parsedPartial = Math.max(0, parseFloat(partialCashAmount) || 0);
    paidAmount = Math.min(draft.grandTotal, parsedPartial);
    creditAmount = Math.round((draft.grandTotal - paidAmount) * 100) / 100;
    paymentMethod = "CASH";
  } else if (settlementOption === "CASHFREE_GATEWAY") {
    paymentType = "DEBIT";
    paidAmount = draft.grandTotal;
    creditAmount = 0;
    paymentMethod = "CASHFREE_ELEMENTS";
  } else if (settlementOption === "CASHFREE_PARTIAL") {
    paymentType = "PARTIAL";
    const parsedPartial = Math.max(1, parseFloat(partialCashfreeAmount) || 1);
    paidAmount = Math.min(draft.grandTotal, parsedPartial);
    creditAmount = Math.round((draft.grandTotal - paidAmount) * 100) / 100;
    paymentMethod = "CASHFREE_ELEMENTS";
  }

  const newProjectedBalance = draft.currentBalance + creditAmount;

  // Handle Standard Cash/Credit settlement
  const handleConfirmCashOrCredit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);

      const payload = {
        villageId: draft.villageId,
        customerId: draft.customerId,
        items: draft.items,
        paymentType,
        paidAmount,
        paymentMethod,
        notes: draft.notes,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to record bill");
      }

      const receiptData = {
        orderId: data.order.id,
        orderNumber: data.orderNumber || data.order.orderNumber,
        orderDate: data.order.orderDate || new Date().toISOString(),
        customerName: draft.customerName,
        customerCode: draft.customerCode,
        customerMobile: draft.customerMobile,
        villageName: draft.villageName,
        items: draft.items,
        subtotal: draft.subtotal,
        totalAmount: draft.grandTotal,
        paidAmount,
        creditAmount,
        paymentType,
        paymentMethod,
        previousBalance: draft.currentBalance,
        newBalance: data.newBalance !== undefined ? data.newBalance : newProjectedBalance,
        notes: draft.notes,
      };

      sessionStorage.setItem("kb_last_receipt", JSON.stringify(receiptData));
      sessionStorage.removeItem("kb_active_billing_slip");

      toast.authSuccess(`Bill #${receiptData.orderNumber} generated successfully!`, "Bill Recorded");
      router.push("/admin/billing/receipt");
    } catch (err: any) {
      toast.authError(err.message || "Failed to process settlement", "Settlement Error");
    } finally {
      setSubmitting(false);
    }
  };

  // Create or refresh Cashfree Order session for the Dedicated Cashfree Payment Options Tab
  const createCashfreeOrderSession = async (): Promise<{
    paymentSessionId: string;
    orderId: string;
  } | null> => {
    if (cashfreeSessionId && cashfreeOrderId) {
      return {
        paymentSessionId: cashfreeSessionId,
        orderId: cashfreeOrderId,
      };
    }

    try {
      setSubmitting(true);

      const targetAmount = settlementOption === "CASHFREE_PARTIAL" ? paidAmount : draft.grandTotal;
      if (targetAmount <= 0) {
        throw new Error("Online payment amount must be greater than zero.");
      }

      const orderPayload = {
        orderAmount: targetAmount,
        orderCurrency: "INR",
        customerDetails: {
          customerId: draft.customerId,
          customerName: draft.customerName,
          customerPhone: draft.customerMobile,
        },
        billingDraft: {
          villageId: draft.villageId,
          customerId: draft.customerId,
          items: draft.items,
          paymentType: settlementOption === "CASHFREE_PARTIAL" ? "PARTIAL" : "DEBIT",
          paidAmount: targetAmount,
          notes: draft.notes,
        },
        orderMeta: {
          orderType: "COUNTER_BILL",
          billingDraft: {
            villageId: draft.villageId,
            customerId: draft.customerId,
            items: draft.items,
            paymentType: settlementOption === "CASHFREE_PARTIAL" ? "PARTIAL" : "DEBIT",
            paidAmount: targetAmount,
            notes: draft.notes,
          },
          notes: `Counter bill for ${draft.customerName} - ${draft.items.length} items (${settlementOption === "CASHFREE_PARTIAL" ? "Partial" : "Full"})`,
        },
      };

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!data.success || !data.payment_session_id) {
        throw new Error(data.error || "Failed to initialize Cashfree checkout");
      }

      if (data.environment === "production" || data.environment === "sandbox") {
        setCashfreeEnv(data.environment);
      }
      setCashfreeSessionId(data.payment_session_id);
      setCashfreeOrderId(data.order_id);
      return {
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id,
      };
    } catch (err: any) {
      toast.authError(err.message || "Failed to connect to Cashfree Gateway", "Gateway Error");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Switch to the Dedicated Next Tab (Cashfree Payment Options Tab)
  const handleOpenCashfreeTab = async () => {
    const created = await createCashfreeOrderSession();
    if (created) {
      setActivePaymentTab("CASHFREE_OPTIONS");
    }
  };

  // Navigate to Dedicated Secure Checkout Page (/checkout/pay) with cryptographic token
  const handleProceedToSecureCheckout = async () => {
    try {
      setSubmitting(true);
      const targetAmount = settlementOption === "CASHFREE_PARTIAL" ? paidAmount : draft.grandTotal;
      if (targetAmount <= 0) {
        throw new Error("Online payment amount must be greater than zero.");
      }

      const orderPayload = {
        orderAmount: targetAmount,
        orderCurrency: "INR",
        customerDetails: {
          customerId: draft.customerId,
          customerName: draft.customerName,
          customerPhone: draft.customerMobile,
        },
        billingDraft: {
          villageId: draft.villageId,
          customerId: draft.customerId,
          items: draft.items,
          paymentType: settlementOption === "CASHFREE_PARTIAL" ? "PARTIAL" : "DEBIT",
          paidAmount: targetAmount,
          notes: draft.notes,
        },
        orderMeta: {
          orderType: "COUNTER_BILL",
          billingDraft: {
            villageId: draft.villageId,
            customerId: draft.customerId,
            items: draft.items,
            paymentType: settlementOption === "CASHFREE_PARTIAL" ? "PARTIAL" : "DEBIT",
            paidAmount: targetAmount,
            notes: draft.notes,
          },
          notes: `Counter bill for ${draft.customerName} - ${draft.items.length} items (${settlementOption === "CASHFREE_PARTIAL" ? "Partial" : "Full"})`,
        },
      };

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!data.success || (!data.checkoutUrl && !data.token)) {
        throw new Error(data.error || "Failed to initialize secure checkout session");
      }

      const checkoutUrl = data.checkoutUrl || `/checkout/pay?token=${encodeURIComponent(data.token)}`;
      router.push(checkoutUrl);
    } catch (err: any) {
      toast.authError(err.message || "Failed to initialize checkout session", "Checkout Error");
    } finally {
      setSubmitting(false);
    }
  };

  // Called once when Cashfree Payment succeeds (via webhook or verify)
  const handleCashfreePaymentSuccess = async (
    cfOrderId: string,
    cfPaymentId?: string,
    verifiedOrder?: any
  ) => {
    if (completingOrderRef.current) return;
    completingOrderRef.current = true;

    try {
      setSubmitting(true);
      const isPartial = settlementOption === "CASHFREE_PARTIAL";
      const actualPaid = isPartial ? paidAmount : draft.grandTotal;

      let finalOrder = verifiedOrder || null;
      let finalNewBalance: number | undefined = undefined;

      // If webhook/verify already created the Order from billingDraft, use it directly;
      // otherwise call /api/orders idempotently with cashfreeOrderId
      if (!finalOrder) {
        const payload = {
          villageId: draft.villageId,
          customerId: draft.customerId,
          items: draft.items,
          paymentType: isPartial ? "PARTIAL" : "DEBIT",
          paidAmount: actualPaid,
          paymentMethod: "CASHFREE_ELEMENTS",
          cashfreeOrderId: cfOrderId,
          cashfreePaymentId: cfPaymentId || null,
          paymentSessionId: cashfreeSessionId,
          notes: draft.notes,
        };

        const ordRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const ordData = await ordRes.json();
        if (!ordData.success) {
          throw new Error(ordData.error || "Order saving failed after Cashfree payment");
        }
        finalOrder = ordData.order;
        finalNewBalance = ordData.newBalance;
      }

      const receiptData = {
        orderId: finalOrder.id,
        orderNumber: finalOrder.orderNumber,
        orderDate: finalOrder.orderDate || new Date().toISOString(),
        customerName: draft.customerName,
        customerCode: draft.customerCode,
        customerMobile: draft.customerMobile,
        villageName: draft.villageName,
        items: draft.items,
        subtotal: draft.subtotal,
        totalAmount: draft.grandTotal,
        paidAmount: actualPaid,
        creditAmount: isPartial ? creditAmount : 0,
        paymentType: isPartial ? "PARTIAL" : "DEBIT",
        paymentMethod: "CASHFREE_ELEMENTS",
        previousBalance: draft.currentBalance,
        newBalance: finalNewBalance !== undefined ? finalNewBalance : newProjectedBalance,
        notes: draft.notes,
      };

      sessionStorage.setItem("kb_last_receipt", JSON.stringify(receiptData));
      sessionStorage.removeItem("kb_active_billing_slip");

      toast.authSuccess(`Bill #${receiptData.orderNumber} recorded via Cashfree!`, "Payment Approved");
      router.push("/admin/billing/receipt");
    } catch (err: any) {
      completingOrderRef.current = false;
      toast.authError(err.message || "Failed to record Cashfree settlement", "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. STEP & DEDICATED TAB BAR */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/billing"
            className="flex items-center gap-2 text-slate-600 hover:text-black transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
              ✓
            </span>
            <span className="text-xs sm:text-sm font-semibold">1. Items</span>
          </Link>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <button
            type="button"
            onClick={() => setActivePaymentTab("SELECT_MODE")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activePaymentTab === "SELECT_MODE"
                ? "bg-black text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activePaymentTab === "SELECT_MODE"
                  ? "bg-white text-black"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {activePaymentTab === "CASHFREE_OPTIONS" ? "✓" : "2"}
            </span>
            <span>Payment Selection</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <button
            type="button"
            onClick={() => {
              if (
                settlementOption === "CASHFREE_GATEWAY" ||
                settlementOption === "CASHFREE_PARTIAL"
              ) {
                handleOpenCashfreeTab();
              } else {
                setSettlementOption("CASHFREE_GATEWAY");
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activePaymentTab === "CASHFREE_OPTIONS"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-slate-900"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activePaymentTab === "CASHFREE_OPTIONS"
                  ? "bg-slate-950 text-amber-400"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              3
            </span>
            <span>Cashfree Payment Options Tab</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 opacity-50">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-semibold text-slate-600">Carbon Slip</span>
          </div>
        </div>

        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Edit Items</span>
        </Link>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN (7 cols): EITHER TAB 1 (SELECT SETTLEMENT MODE) OR TAB 2 (DEDICATED CASHFREE PAYMENT OPTIONS TAB) */}
        <div className="lg:col-span-7 space-y-5">
          {activePaymentTab === "SELECT_MODE" ? (
            <>
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  Step 2: Select Settlement &amp; Payment Method
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose cash, village Udhaar credit, or proceed to the dedicated Cashfree Payment Options tab.
                </p>
              </div>

              <div className="space-y-3">
                {/* OPTION 1: 100% Cash Paid */}
                <div
                  onClick={() => setSettlementOption("CASH_FULL")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settlementOption === "CASH_FULL"
                      ? "border-black bg-slate-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Full Cash Payment</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Customer pays the full amount in cash immediately. No balance added to Udhaar.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-emerald-700">
                        {formatCurrency(draft.grandTotal)}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Paid</span>
                    </div>
                  </div>
                </div>

                {/* OPTION 2: 100% Udhaar Credit */}
                <div
                  onClick={() => setSettlementOption("CREDIT_FULL")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settlementOption === "CREDIT_FULL"
                      ? "border-black bg-slate-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-800">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">100% Khata Udhaar (Credit)</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Entire bill added to customer&apos;s ledger. No cash paid right now.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-rose-600">
                        {formatCurrency(draft.grandTotal)}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-rose-500">Udhaar</span>
                    </div>
                  </div>
                </div>

                {/* OPTION 3: Partial Cash + Balance Udhaar */}
                <div
                  onClick={() => setSettlementOption("CASH_PARTIAL")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settlementOption === "CASH_PARTIAL"
                      ? "border-black bg-slate-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                        <IndianRupee className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Partial Cash + Udhaar Remainder</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Customer pays a portion in cash; remaining balance is placed on Udhaar debt.
                        </p>
                      </div>
                    </div>
                  </div>

                  {settlementOption === "CASH_PARTIAL" && (
                    <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Cash Amount Paid (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={draft.grandTotal}
                          step="any"
                          value={partialCashAmount}
                          onChange={(e) => setPartialCashAmount(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Remaining Udhaar Balance (₹)
                        </label>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-mono font-bold text-rose-600">
                          {formatCurrency(creditAmount)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* OPTION 4: CASHFREE PAYMENT GATEWAY (Opens Dedicated Payment Options Tab) */}
                <div
                  onClick={() => setSettlementOption("CASHFREE_GATEWAY")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settlementOption === "CASHFREE_GATEWAY"
                      ? "border-amber-500 bg-amber-50/30 shadow-sm"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500 text-white">
                        <BrandCashfreeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            Cashfree Payment Gateway (100% Online)
                          </h3>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                            UPI / QR / CARDS / NB / WALLETS
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Opens the dedicated Cashfree Payment Options tab with customized elements &amp; auto-webhook ledger sync.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-amber-700">
                        {formatCurrency(draft.grandTotal)}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-emerald-600">Next Tab →</span>
                    </div>
                  </div>

                  {settlementOption === "CASHFREE_GATEWAY" && (
                    <div className="mt-3 pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <span className="text-xs text-amber-900 font-medium">
                        Instant digital settlement via UPI QR, GPay/PhonePe, Cards or NetBanking
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProceedToSecureCheckout();
                          }}
                          disabled={submitting}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {submitting ? "Securing Session..." : "Open Dedicated Checkout Page →"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCashfreeTab();
                          }}
                          disabled={submitting}
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                        >
                          <span>Pay in Tab Below</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* OPTION 5: CASHFREE PARTIAL PAYMENT GATEWAY + Udhaar Remainder */}
                <div
                  onClick={() => setSettlementOption("CASHFREE_PARTIAL")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settlementOption === "CASHFREE_PARTIAL"
                      ? "border-amber-600 bg-amber-50/40 shadow-sm"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-600 text-white">
                        <BrandCashfreeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            Partial Cashfree Online + Udhaar
                          </h3>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                            PARTIAL ONLINE
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Pay custom portion online in the next tab via Cashfree Elements; remaining balance placed on customer Udhaar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {settlementOption === "CASHFREE_PARTIAL" && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Online Amount to Pay (₹)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={draft.grandTotal}
                            step="any"
                            value={partialCashfreeAmount}
                            onChange={(e) => {
                              setPartialCashfreeAmount(e.target.value);
                              setCashfreeSessionId(null);
                              setCashfreeOrderId(null);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Remaining Udhaar Balance (₹)
                          </label>
                          <div className="px-3 py-1.5 rounded-lg bg-amber-100/60 text-sm font-mono font-bold text-rose-600">
                            {formatCurrency(creditAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProceedToSecureCheckout();
                          }}
                          disabled={submitting}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {submitting
                              ? "Securing Session..."
                              : `Open Dedicated Checkout Page (${formatCurrency(paidAmount)}) →`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCashfreeTab();
                          }}
                          disabled={submitting}
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                        >
                          <span>Pay in Tab Below</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* DEDICATED TAB 2: CASHFREE CUSTOM ELEMENTS PAYMENT OPTIONS TAB */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Step 3: Cashfree Payment Options Tab
                  </h2>
                  <p className="text-xs text-slate-500">
                    Complete {formatCurrency(paidAmount)} online using customized Cashfree Elements below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab("SELECT_MODE")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Settlement Mode</span>
                </button>
              </div>

              <CashfreeCheckoutModal
                isOpen={true}
                onBackToSelection={() => setActivePaymentTab("SELECT_MODE")}
                paymentSessionId={cashfreeSessionId || ""}
                orderId={cashfreeOrderId || ""}
                environment={cashfreeEnv}
                amount={settlementOption === "CASHFREE_PARTIAL" ? paidAmount : draft.grandTotal}
                customerName={draft.customerName}
                customerMobile={draft.customerMobile}
                onCreateSession={createCashfreeOrderSession}
                onSuccess={(orderId, paymentId, verifiedOrder) =>
                  handleCashfreePaymentSuccess(orderId, paymentId, verifiedOrder)
                }
                onFailure={(error) => {
                  toast.authError(String(error), "Payment Failed");
                }}
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SLIP RECAP & CONFIRM BUTTON (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Billing Slip Review</h3>
              <p className="text-xs text-slate-500">Summary before recording ledger entry.</p>
            </div>

            {/* Customer Details */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CustomerAvatar name={draft.customerName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{draft.customerName}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {draft.customerCode} • {draft.villageName}
                </div>
              </div>
            </div>

            {/* Line Items Mini Table */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {draft.items.map((it, idx) => (
                <div key={idx} className="pt-1.5 flex items-center justify-between">
                  <div className="text-slate-800">
                    <span className="font-semibold">{it.name}</span>
                    <span className="text-slate-400 font-mono ml-1.5">
                      ({it.quantity} {it.unit} @ ₹{it.pricePerUnit})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(it.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Bill Total:</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(draft.grandTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-900">{paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span>Paid Now:</span>
                <span className="font-mono font-bold">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 font-semibold">
                <span>Added to Udhaar:</span>
                <span className="font-mono font-bold">{formatCurrency(creditAmount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-800 font-bold">
                <span>Customer Balance After Bill:</span>
                <span className="font-mono text-sm text-rose-700">
                  {formatCurrency(newProjectedBalance)}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-3 space-y-2.5">
              {settlementOption === "CASHFREE_GATEWAY" || settlementOption === "CASHFREE_PARTIAL" ? (
                activePaymentTab === "SELECT_MODE" ? (
                  <button
                    type="button"
                    onClick={handleOpenCashfreeTab}
                    disabled={submitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <BrandCashfreeIcon className="w-4 h-4" />
                    <span>
                      {submitting
                        ? "Initializing Cashfree Gateway..."
                        : `Proceed to Cashfree Payment Options Tab (${formatCurrency(paidAmount)})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cashfree Payment Options Tab Active</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Select UPI ID, Scan QR, UPI App, Card, Net Banking, or Wallet in the Payment Options tab to pay {formatCurrency(paidAmount)}.
                    </p>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmCashOrCredit}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? "Recording Bill..." : "Confirm & Generate Receipt"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/admin/billing"
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Items Entry</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
