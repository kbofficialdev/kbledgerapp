"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  Printer,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  Search,
  Receipt,
  X,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import CashfreeCheckoutModal from "@/components/payments/CashfreeCheckoutModal";
import KbVerifiedSeal from "@/components/brand/KbVerifiedSeal";

interface KhataData {
  customer: {
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    email?: string;
    villageName: string;
    creditLimit: number;
    currentBalance: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    totalAmount: number;
    paidAmount: number;
    creditAmount: number;
    paymentType: string;
    paymentStatus: string;
    items?: Array<{ name: string; quantity: number }>;
  }>;
  ledgerEntries: Array<{
    id: string;
    entryDate: string;
    entryType: string;
    debitAmount: number;
    creditAmount: number;
    runningBalance: number;
    description: string;
  }>;
}

export default function CustomerKhataPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<KhataData | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "DEBIT" | "CREDIT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Multi-Order Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<"FULL" | "PARTIAL">("FULL");
  const [customPartialAmount, setCustomPartialAmount] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Cashfree Dedicated Tab State
  const [cashfreeTabActive, setCashfreeTabActive] = useState(false);
  const [cashfreeSessionId, setCashfreeSessionId] = useState<string | null>(null);
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState<number>(0);

  // Statement Print Modal State
  const [statementPrintModalOpen, setStatementPrintModalOpen] = useState(false);
  const [statementPrintMode, setStatementPrintMode] = useState<"SLIP" | "CARBON">("SLIP");

  const fetchKhata = async () => {
    try {
      setLoading(true);
      await fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});
      const res = await fetch("/api/customer/me");
      if (res.status === 401) {
        toast.authError("Session expired. Please log in.", "Session Closed");
        router.replace("/customer/login");
        return;
      }
      const json = await res.json();
      if (json.success && json.customer) {
        setData(json);
      }
    } catch {
      toast.authError("Failed to load Khata statement.", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKhata();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">Loading your verified Khata ledger...</p>
      </div>
    );
  }

  if (!data || !data.customer) {
    return null;
  }

  const { customer, orders = [], ledgerEntries = [] } = data;

  // Unpaid/Partially paid orders available for settlement
  const outstandingOrders = orders.filter((o) => o.creditAmount > 0.01);

  // Calculate selected debt sum
  const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
  const totalSelectedDebt = selectedOrders.reduce((sum, o) => sum + o.creditAmount, 0);

  const effectivePaymentAmount =
    paymentMode === "FULL"
      ? totalSelectedDebt
      : Math.min(totalSelectedDebt, Math.max(1, Number(customPartialAmount) || 0));

  const projectedBalance = Math.max(0, customer.currentBalance - effectivePaymentAmount);

  // Toggle order checkbox
  const toggleOrderSelection = (id: string) => {
    setCashfreeSessionId(null);
    setCashfreeOrderId(null);
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const selectAllOutstanding = () => {
    setCashfreeSessionId(null);
    setCashfreeOrderId(null);
    if (selectedOrderIds.length === outstandingOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(outstandingOrders.map((o) => o.id));
    }
  };

  const createCashfreeSession = async (): Promise<{
    paymentSessionId: string;
    orderId: string;
  } | null> => {
    if (selectedOrderIds.length === 0) {
      toast.authError("Please select at least one order to pay.", "No Order Selected");
      return null;
    }

    if (effectivePaymentAmount <= 0) {
      toast.authError("Payment amount must be greater than zero.", "Invalid Amount");
      return null;
    }

    try {
      setSubmittingPayment(true);

      const orderPayload = {
        orderAmount: effectivePaymentAmount,
        orderCurrency: "INR",
        customerDetails: {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.mobile,
          customerEmail: customer.email || undefined,
        },
        orderMeta: {
          orderType: "KHATA_SETTLEMENT",
          orderIds: selectedOrderIds,
          notes: `Khata settlement of ${selectedOrderIds.length} orders by ${customer.name}`,
        },
      };

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await res.json();
      if (!orderData.success || !orderData.payment_session_id) {
        throw new Error(orderData.error || "Failed to initialize Cashfree payment gateway.");
      }

      setPendingPaymentAmount(effectivePaymentAmount);
      setCashfreeSessionId(orderData.payment_session_id);
      setCashfreeOrderId(orderData.order_id);
      setCashfreeTabActive(true);
      return {
        paymentSessionId: orderData.payment_session_id,
        orderId: orderData.order_id,
      };
    } catch (err: any) {
      toast.authError(err.message || "Could not connect to Cashfree Gateway.", "Gateway Error");
      return null;
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleProceedToSecureCheckout = async () => {
    if (!customer || effectivePaymentAmount <= 0) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderAmount: effectivePaymentAmount,
          orderCurrency: "INR",
          orderIds: selectedOrderIds,
          customerDetails: {
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.mobile,
          },
          orderMeta: {
            orderType: "KHATA_SETTLEMENT",
            orderIds: selectedOrderIds,
            notes: `Khata settlement of ${selectedOrderIds.length} orders by ${customer.name}`,
          },
        }),
      });

      const orderData = await res.json();
      if (!orderData.success || (!orderData.checkoutUrl && !orderData.token)) {
        throw new Error(orderData.error || "Failed to initialize dedicated checkout session.");
      }

      const checkoutUrl =
        orderData.checkoutUrl || `/checkout/pay?token=${encodeURIComponent(orderData.token)}`;
      router.push(checkoutUrl);
    } catch (err: any) {
      toast.authError(err.message || "Could not connect to Cashfree Gateway.", "Gateway Error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Cashfree Success Callback
  const handleCashfreeSuccess = async (cfOrderId: string, cfPaymentId?: string) => {
    setCashfreeTabActive(false);
    try {
      setSubmittingPayment(true);
      const settledAmount = pendingPaymentAmount || effectivePaymentAmount;

      const settleRes = await fetch("/api/customer/khata/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          amount: settledAmount,
          cashfreeOrderId: cfOrderId,
          cashfreePaymentId: cfPaymentId,
          paymentSessionId: cashfreeSessionId,
          notes: `Self-service settlement for ${selectedOrderIds.length} orders via Cashfree Elements`,
        }),
      });

      const settleData = await settleRes.json();
      if (settleData.success) {
        toast.authSuccess(
          `Payment of ${formatCurrency(settledAmount)} received and reconciled!`,
          "Settlement Complete"
        );
        setSelectedOrderIds([]);
        setCustomPartialAmount("");
        setCashfreeSessionId(null);
        setCashfreeOrderId(null);
        fetchKhata();
      } else {
        toast.authError(settleData.error || "Failed to record settlement.", "Ledger Error");
      }
    } catch {
      toast.authError("Settlement update error.", "Network Error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filtered Ledger Entries
  const filteredLedger = ledgerEntries.filter((entry) => {
    if (ledgerFilter === "DEBIT" && entry.entryType !== "BILL_DEBIT") return false;
    if (ledgerFilter === "CREDIT" && entry.entryType !== "PAYMENT_CREDIT") return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        entry.description.toLowerCase().includes(q) ||
        formatCurrency(entry.debitAmount).includes(q) ||
        formatCurrency(entry.creditAmount).includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 bg-white">
      {/* Background UI is completely hidden during printing */}
      <div className="no-print space-y-8">
        {/* 1. TOP HEADER & ACTION CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Customer Khata & Multi-Order Settlement
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-mono font-bold border border-emerald-200">
                Audited
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete transparent village ledger. Every bill and payment is cryptographically recorded for legal audit.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setStatementPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          <button
            onClick={fetchKhata}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. LEDGER BALANCE OVERVIEW BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
            Current Outstanding Udhaar
          </span>
          <div className="text-3xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(customer.currentBalance)}
          </div>
          <p className="text-xs text-rose-800 mt-2 font-medium">
            Credit Limit: {formatCurrency(customer.creditLimit || 25000)}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Pending Orders Count
          </span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-1">
            {outstandingOrders.length}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Total lifetime bills: {orders.length}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
            Online Payment Clearance
          </span>
          <div className="text-lg font-bold text-emerald-900 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Cashfree Instant Settlement
          </div>
          <p className="text-xs text-emerald-700 mt-2 font-medium">
            UPI, QR, Debit/Credit Cards & NetBanking supported.
          </p>
        </div>
      </div>

      {/* 3. MULTI-ORDER PAYMENT SECTION */}
      {outstandingOrders.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/30 p-5 sm:p-6 space-y-5">
          {/* Stepper Tabs */}
          <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
            <button
              type="button"
              onClick={() => setCashfreeTabActive(false)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                !cashfreeTabActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              1. Select Unpaid Bills ({selectedOrderIds.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedOrderIds.length === 0) {
                  toast.authError("Select at least one unpaid bill first.", "Selection Required");
                  return;
                }
                setCashfreeTabActive(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                cashfreeTabActive
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <BrandCashfreeIcon className="w-3.5 h-3.5" />
              <span>2. Cashfree Payment Options Tab</span>
            </button>
          </div>

          {!cashfreeTabActive ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                      <BrandCashfreeIcon className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Multi-Order Online Payment (Step 1: Select Bills)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Select one or multiple bills below, then advance to the dedicated Cashfree Payment Options tab.
                  </p>
                </div>

                <button
                  onClick={selectAllOutstanding}
                  className="text-xs font-bold text-amber-900 hover:text-amber-950 underline self-start sm:self-auto"
                >
                  {selectedOrderIds.length === outstandingOrders.length ? "Deselect All" : "Select All Unpaid"}
                </button>
              </div>

              {/* Orders Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outstandingOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-amber-500 bg-white shadow-sm"
                          : "border-slate-200 bg-white/70 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 font-mono">
                              {order.orderNumber}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatDateTime(order.orderDate)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-rose-600">
                            {formatCurrency(order.creditAmount)}
                          </div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Due</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>Total Bill: {formatCurrency(order.totalAmount)}</span>
                        <span className="font-medium text-emerald-700">
                          Paid: {formatCurrency(order.paidAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Orders Settlement Controls Bar */}
              {selectedOrderIds.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-amber-300 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="text-xs font-bold text-slate-900">
                      Selected <span className="text-amber-700 font-mono">{selectedOrderIds.length}</span> orders • Total Due:{" "}
                      <span className="font-mono text-rose-600 text-sm font-black">
                        {formatCurrency(totalSelectedDebt)}
                      </span>
                    </div>

                    {/* Settlement Mode Switcher */}
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="FULL"
                          checked={paymentMode === "FULL"}
                          onChange={() => {
                            setPaymentMode("FULL");
                            setCashfreeSessionId(null);
                            setCashfreeOrderId(null);
                          }}
                          className="text-amber-600"
                        />
                        <span className="font-semibold text-slate-800">Pay Full Selected</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="PARTIAL"
                          checked={paymentMode === "PARTIAL"}
                          onChange={() => {
                            setPaymentMode("PARTIAL");
                            setCashfreeSessionId(null);
                            setCashfreeOrderId(null);
                            if (!customPartialAmount) {
                              setCustomPartialAmount(String(Math.floor(totalSelectedDebt / 2)));
                            }
                          }}
                          className="text-amber-600"
                        />
                        <span className="font-semibold text-slate-800">Custom Partial Payment</span>
                      </label>
                    </div>
                  </div>

                  {/* Partial Amount Input if selected */}
                  {paymentMode === "PARTIAL" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Online Amount to Pay Now (₹)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={totalSelectedDebt}
                          step="any"
                          value={customPartialAmount}
                          onChange={(e) => {
                            setCustomPartialAmount(e.target.value);
                            setCashfreeSessionId(null);
                            setCashfreeOrderId(null);
                          }}
                          placeholder="e.g. 1000"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Remaining Balance after Payment (₹)
                        </label>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-mono font-bold text-rose-600">
                          {formatCurrency(projectedBalance)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleProceedToSecureCheckout}
                      disabled={submittingPayment || effectivePaymentAmount <= 0}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {submittingPayment
                          ? "Securing Checkout Session..."
                          : `Dedicated Checkout Page (${formatCurrency(effectivePaymentAmount)}) →`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashfreeTabActive(true)}
                      disabled={submittingPayment || effectivePaymentAmount <= 0}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <BrandCashfreeIcon className="w-4 h-4" />
                      <span>Pay via In-Page Tab →</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* DEDICATED TAB 2: CASHFREE PAYMENT OPTIONS TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Step 2 of 2 • Dedicated Cashfree Payment Options Tab
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    Settling {selectedOrderIds.length} bill(s) • Amount:{" "}
                    <span className="font-mono text-emerald-700">{formatCurrency(effectivePaymentAmount)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCashfreeTabActive(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  ← Change Bill Selection
                </button>
              </div>

              <CashfreeCheckoutModal
                isOpen={true}
                paymentSessionId={cashfreeSessionId || ""}
                orderId={cashfreeOrderId || ""}
                amount={effectivePaymentAmount}
                customerName={customer.name}
                customerMobile={customer.mobile}
                onBackToSelection={() => setCashfreeTabActive(false)}
                onCreateSession={createCashfreeSession}
                onSuccess={handleCashfreeSuccess}
                onFailure={(err) => toast.authError(String(err), "Payment Failed")}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. COMPLETE ITEMIZED AUDIT LEDGER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Audit Ledger Entries (Debits & Credits)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredLedger.length} records)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLedgerFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  ledgerFilter === "ALL" ? "bg-white text-black shadow-xs" : "text-slate-600"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLedgerFilter("DEBIT")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  ledgerFilter === "DEBIT" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Debits (Bills)
              </button>
              <button
                onClick={() => setLedgerFilter("CREDIT")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  ledgerFilter === "CREDIT" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Credits (Payments)
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger..."
                className="pl-8 pr-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit (Bill)</th>
                  <th className="py-3 px-4 text-right">Credit (Jama)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-sans">
                        {formatDateTime(entry.entryDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-sans font-medium max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {entry.entryType === "BILL_DEBIT" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" /> DEBIT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> CREDIT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-bold">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No matching ledger records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

      {/* 5. MODAL: STATEMENT & AUDIT REPORT PRINT */}
      {statementPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:m-0">
            {/* Header controls (Hidden during print) */}
            <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-900">Statement Format:</span>
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setStatementPrintMode("SLIP")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statementPrintMode === "SLIP" ? "bg-black text-white" : "text-slate-600"
                    }`}
                  >
                    80mm Thermal Slip
                  </button>
                  <button
                    onClick={() => setStatementPrintMode("CARBON")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      statementPrintMode === "CARBON" ? "bg-black text-white" : "text-slate-600"
                    }`}
                  >
                    Carbon Voucher (A4/A5)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setStatementPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Canvas */}
            <div className="p-6 overflow-y-auto print:p-0 print:m-0">
              {statementPrintMode === "SLIP" ? (
                /* === 80mm THERMAL SLIP STATEMENT === */
                <div className="max-w-[340px] mx-auto p-4 bg-white border border-slate-300 font-mono text-[11px] text-black shadow-xs leading-tight">
                  <div className="text-center pb-2 border-b border-dashed border-black space-y-1">
                    <div className="text-base font-black tracking-wider uppercase">KB FASHIONS</div>
                    <div className="text-[10px] uppercase">Smart Shop & Village Khata</div>
                    <div className="text-[9px] text-slate-600">Tandoor, Mancherial Dist, TS</div>
                    <div className="text-[9px] text-slate-600">Ph: 6303185141</div>
                    <div className="text-[10px] font-bold uppercase pt-1">*** MINI LEDGER STATEMENT ***</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>CUSTOMER:</span>
                      <span className="font-bold">{customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CODE:</span>
                      <span>{customer.customerCode} ({customer.villageName})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MOBILE:</span>
                      <span>{customer.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DATE:</span>
                      <span>{new Date().toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Balance Summary */}
                  <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                    <div className="flex justify-between font-bold text-rose-700 text-xs">
                      <span>CURRENT OUTSTANDING:</span>
                      <span>{formatCurrency(customer.currentBalance)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SANCTIONED LIMIT:</span>
                      <span>{formatCurrency(customer.creditLimit || 25000)}</span>
                    </div>
                  </div>

                  {/* Transactions summary */}
                  <div className="py-2 border-b border-dashed border-black">
                    <div className="text-[9px] uppercase font-bold pb-1">RECENT TRANSACTIONS ({Math.min(8, ledgerEntries.length)}):</div>
                    <table className="w-full text-left text-[9px]">
                      <thead>
                        <tr className="border-b border-black uppercase text-[8px]">
                          <th className="py-0.5">DATE</th>
                          <th className="py-0.5">TYPE</th>
                          <th className="text-right py-0.5">AMT (₹)</th>
                          <th className="text-right py-0.5">BAL (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dotted divide-slate-300">
                        {ledgerEntries.slice(0, 8).map((entry, idx) => (
                          <tr key={idx} className="py-0.5">
                            <td className="py-0.5">{new Date(entry.entryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                            <td>{entry.entryType === "BILL_DEBIT" ? "BILL" : "JAMA"}</td>
                            <td className="text-right font-bold">
                              {entry.entryType === "BILL_DEBIT" ? `+${entry.debitAmount}` : `-${entry.creditAmount}`}
                            </td>
                            <td className="text-right">{entry.runningBalance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Official Verified Seal */}
                  <div className="pt-2 flex justify-center">
                    <KbVerifiedSeal size="sm" sealNumber={customer.customerCode} />
                  </div>

                  <div className="pt-2 text-center space-y-0.5 text-[9px]">
                    <div className="font-bold uppercase">OFFICIAL AUDIT STATEMENT</div>
                    <div className="text-slate-500">Subject to local village jurisdiction</div>
                    <div className="text-[8px] text-slate-400">Generated by KB KHATA Platform</div>
                  </div>
                </div>
              ) : (
                /* === STANDARD CARBON VOUCHER AUDIT STATEMENT === */
                <div className="p-6 bg-white border-2 border-slate-900 font-sans text-xs text-slate-900 space-y-4">
                  <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                    <div>
                      <div className="text-xl font-black tracking-tight text-slate-900">KB KHATA & FASHIONS</div>
                      <div className="text-xs text-slate-600">Main Road, Tandoor, Dist: Mancherial, Telangana</div>
                      <div className="text-xs text-slate-600">Support: kb.official.admin@gmail.com • +91 6303185141</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-black px-2 py-0.5 bg-slate-100 border border-slate-300 inline-block uppercase">
                        CUSTOMER KHATA STATEMENT
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Generated: {new Date().toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CUSTOMER</span>
                      <span className="font-bold text-slate-900">{customer.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">MEMBER CODE</span>
                      <span className="font-mono font-bold text-emerald-800">{customer.customerCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">VILLAGE TERRITORY</span>
                      <span>{customer.villageName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CURRENT BALANCE</span>
                      <span className="font-mono font-black text-rose-600">{formatCurrency(customer.currentBalance)}</span>
                    </div>
                  </div>

                  {/* Table of Ledger Entries */}
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Description / Order Reference</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Debit (₹)</th>
                        <th className="py-2 px-3 text-right">Credit (₹)</th>
                        <th className="py-2 px-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {ledgerEntries.slice(0, 15).map((entry, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-sans">{formatDateTime(entry.entryDate)}</td>
                          <td className="py-2 px-3 font-sans truncate max-w-xs">{entry.description}</td>
                          <td className="py-2 px-3 font-sans">{entry.entryType === "BILL_DEBIT" ? "DEBIT" : "CREDIT"}</td>
                          <td className="py-2 px-3 text-right text-rose-600 font-semibold">{entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "—"}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "—"}</td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(entry.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures & Brand Verified Seal */}
                  <div className="pt-6 flex items-center justify-between border-t border-slate-300">
                    <div className="text-center text-xs w-44">
                      <div className="border-t border-slate-400 pt-1 text-slate-500">Customer Signature</div>
                    </div>
                    <div className="flex justify-center">
                      <KbVerifiedSeal size="md" sealNumber={customer.customerCode} />
                    </div>
                    <div className="text-center text-xs w-44">
                      <div className="border-t border-slate-400 pt-1 text-slate-500">Authorized Signatory (KB Khata)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

