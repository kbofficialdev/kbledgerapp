"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Search,
  ExternalLink,
  Lock,
  Smartphone,
  Banknote,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import CashfreeCheckoutModal from "@/components/payments/CashfreeCheckoutModal";

interface PaymentTransaction {
  id: string;
  paymentRef: string;
  customerName: string;
  customerCode: string;
  villageName?: string;
  amount: number;
  method: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  paidAt: string;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  merchantTxnId?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  customerCode: string;
  mobile: string;
  currentBalance: number;
}

export default function AdminPaymentsHubPage() {
  const { toast } = useToast();

  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Collection Form
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [initiating, setInitiating] = useState(false);

  // Cashfree Modal
  const [cashfreeModalOpen, setCashfreeModalOpen] = useState(false);
  const [cashfreeSessionId, setCashfreeSessionId] = useState<string | null>(null);
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      await fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});
      const [pRes, cRes] = await Promise.all([
        fetch("/api/payments").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
      ]);

      if (pRes.success) setPayments(pRes.payments || []);
      if (cRes.success) {
        setCustomers(cRes.customers || []);
        if (cRes.customers && cRes.customers.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(cRes.customers[0].id);
          setCollectionAmount(String(Math.min(1000, cRes.customers[0].currentBalance || 500)));
        }
      }
    } catch {
      toast.authError("Failed to fetch payments data", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const createCashfreeCollectionSession = async (): Promise<{
    paymentSessionId: string;
    orderId: string;
  } | null> => {
    if (!selectedCustomerObj) {
      toast.authError("Please select a customer.", "Missing Customer");
      return null;
    }
    const amt = parseFloat(collectionAmount);
    if (!amt || amt <= 0) {
      toast.authError("Enter a valid payment amount greater than ₹0.", "Invalid Amount");
      return null;
    }

    try {
      setInitiating(true);

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderAmount: amt,
          orderCurrency: "INR",
          customerDetails: {
            customerId: selectedCustomerObj.id,
            customerName: selectedCustomerObj.name,
            customerPhone: selectedCustomerObj.mobile,
          },
          orderMeta: {
            orderType: "KHATA_SETTLEMENT",
            notes: `Udhaar collection payment for ${selectedCustomerObj.name}`,
          },
        }),
      });

      const data = await res.json();
      if (!data.success || !data.payment_session_id) {
        throw new Error(data.error || "Could not generate Cashfree session ID");
      }

      setCashfreeSessionId(data.payment_session_id);
      setCashfreeOrderId(data.order_id);
      setCashfreeModalOpen(true);
      return {
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id,
      };
    } catch (err: any) {
      toast.authError(err.message, "Cashfree Error");
      return null;
    } finally {
      setInitiating(false);
    }
  };

  // Quick Collection Trigger
  const handleLaunchCashfreeCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCashfreeCollectionSession();
    const el = document.getElementById("kb-admin-payments-inline-cashfree");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handlePaymentSuccess = async (cfOrderId: string, cfPaymentId?: string) => {
    setCashfreeModalOpen(false);
    toast.info("Verifying transaction with bank network...", "Payment Captured");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerObj?.id,
          amount: parseFloat(collectionAmount) || 0,
          method: "CASHFREE_ELEMENTS",
          cashfreeOrderId: cfOrderId,
          cashfreePaymentId: cfPaymentId,
          paymentSessionId: cashfreeSessionId,
          notes: `Admin digital Udhaar collection via Cashfree Elements`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.authSuccess(
          `Payment of ₹${collectionAmount} captured via Cashfree! Customer Udhaar updated.`,
          "Approved"
        );
        fetchPayments();
      } else {
        toast.authError(data.error || "Gateway verification failed", "Verification Warning");
      }
    } catch (err: any) {
      toast.authError(err.message, "Sync Error");
    }
  };

  // KPI calculations
  const totalVolume = payments.reduce((sum, p) => sum + p.amount, 0);
  const cashfreeVolume = payments
    .filter((p) => p.method.includes("CASHFREE"))
    .reduce((sum, p) => sum + p.amount, 0);
  const successfulCount = payments.filter((p) => p.status === "SUCCESS").length;

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. TOP CASHFREE GATEWAY BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-neutral-900 to-slate-900 text-white p-6 sm:p-7 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <BrandCashfreeIcon className="w-3.5 h-3.5 text-amber-400" />
              Cashfree Customized Elements &amp; Webhook Terminal
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Digital Payment Gateway &amp; Audit Hub
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              PCI-DSS Level 1 Customized Cashfree.js Elements with 100% Webhook-Driven ACID Ledger Reconciliation for UPI, Dynamic QR, and Cards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPayments}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Webhooks &amp; Refresh</span>
            </button>
          </div>
        </div>

        {/* Gateway Architecture & Status pill */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Gateway Mode</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Custom Elements + Webhook
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Midway Drop Recovery</span>
            <span className="font-mono font-semibold text-slate-200">Active (Auto-Sync)</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Volume Collected</span>
            <span className="font-bold text-amber-300">{formatCurrency(totalVolume)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Cashfree PG Transactions</span>
            <span className="font-bold text-slate-200">
              {payments.filter((p) => p.method.includes("CASHFREE")).length} Orders
            </span>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN SPLIT: QUICK COLLECTION ON LEFT, GATEWAY STATS ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: QUICK DIGITAL COLLECTION (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-600" />
                Quick Digital Udhaar Collection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Collect outstanding Khata balance online via Cashfree modal.
              </p>
            </div>

            <form onSubmit={handleLaunchCashfreeCollection} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Debtor Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const matched = customers.find((c) => c.id === e.target.value);
                    if (matched && matched.currentBalance > 0) {
                      setCollectionAmount(String(matched.currentBalance));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) — Due: {formatCurrency(c.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerObj && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block">Outstanding Udhaar</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        selectedCustomerObj.currentBalance > 0
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(selectedCustomerObj.currentBalance)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Registered Phone</span>
                    <span className="font-mono text-slate-700">{selectedCustomerObj.mobile}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Collection Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="500.00"
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={initiating || !selectedCustomerObj}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                <BrandCashfreeIcon className="w-4 h-4 text-white" />
                <span>
                  {initiating ? "Connecting..." : `Launch Cashfree Checkout (₹${collectionAmount || 0})`}
                </span>
              </button>

              <div className="text-center text-[11px] text-slate-400">
                Payer can scan UPI QR or use any Debit/Credit Card
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: GATEWAY STATS & AUDIT LOG (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800">Payment Gateway Compliance</span>
              <p className="text-[11px] text-slate-500">
                All credentials encrypted with zero local card data retention.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Level 1
              </span>
            </div>
          </div>

          {/* Transactions Audit Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">
                Gateway Transaction Log ({payments.length})
              </h3>
              <span className="text-xs text-slate-500 font-mono">Real-time sync</span>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Ref / Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length > 0 ? (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {p.cashfreeOrderId || p.paymentRef}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{p.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.customerCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.method.includes("CASHFREE")
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {p.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[10px]">
                          {formatDateTime(p.paidAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {loading ? "Loading transactions..." : "No payment records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. IN-PAGE BOOKMYSHOW-STYLE CASHFREE CUSTOM ELEMENTS PANEL */}
        {selectedCustomerObj && (parseFloat(collectionAmount) || 0) > 0 && (
          <div id="kb-admin-payments-inline-cashfree" className="lg:col-span-12 pt-2">
            <CashfreeCheckoutModal
              isOpen={true}
              paymentSessionId={cashfreeSessionId || ""}
              orderId={cashfreeOrderId || ""}
              amount={parseFloat(collectionAmount) || 0}
              customerName={selectedCustomerObj.name || "Customer"}
              customerMobile={selectedCustomerObj.mobile || "9999999999"}
              onCreateSession={createCashfreeCollectionSession}
              onSuccess={(orderId, paymentId) => handlePaymentSuccess(orderId, paymentId)}
              onFailure={(error) => {
                toast.authError(String(error), "Payment Failed");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

