"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  ArrowRight,
  IndianRupee,
  Smartphone,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import GPayCheckoutModal from "@/components/GPayCheckoutModal";

interface PaymentTransaction {
  id: string;
  paymentRef: string;
  customerName: string;
  customerCode: string;
  villageName: string;
  amount: number;
  method: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  paidAt: string;
  merchantTxnId?: string;
  upiRefId?: string;
  bankRrn?: string;
  payerVpa?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  customerCode: string;
  mobile: string;
  currentBalance: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Collection Form
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Google Pay Modal trigger
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.customers);
          if (data.customers.length > 0) {
            setSelectedCustomerId(data.customers[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const handleLaunchGPayCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!selectedCustomerId || !numAmount || numAmount <= 0) {
      setFeedback({ type: "error", message: "Please select customer and enter valid collection amount." });
      return;
    }
    setFeedback(null);
    setIsGPayModalOpen(true);
  };

  const handleManualRrnVerification = async (payment: PaymentTransaction) => {
    const rrn = prompt(`Enter 12-digit Bank RRN / UTR for Payment ${payment.paymentRef}:`);
    if (!rrn) return;

    if (!/^\d{12}$/.test(rrn.trim())) {
      alert("Invalid RRN. Must be exactly 12 numeric digits.");
      return;
    }

    try {
      const res = await fetch("/api/payments/gpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentRef: payment.paymentRef,
          merchantTxnId: payment.merchantTxnId,
          bankRrn: rrn.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Payment ${payment.paymentRef} successfully confirmed with Bank RRN: ${rrn}!`,
        });
        fetchPayments();
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err: any) {
      alert(err.message || "Failed to verify payment");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
              G
            </div>
            <span>Google Pay for Business India Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            NPCI UPI Intent, Dynamic QR generation with 15-min TTL, Bank RRN verification, and Bahi-Khata ledger credit.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="kb-btn-secondary text-xs py-2 px-3 self-start sm:self-auto hover:bg-slate-100"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Journal</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Gateway Configuration & Quick Initiate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant VPA & Security Policy Card */}
        <div className="kb-card-elevated p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Google Pay Merchant Profile</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 font-mono">
              <div className="text-slate-500 font-sans text-[11px]">Merchant UPI VPA (pa)</div>
              <div className="font-bold text-blue-600 text-sm">kbfashions@okaxis</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 font-mono">
              <div className="text-slate-500 font-sans text-[11px]">Merchant Name &amp; MCC Code</div>
              <div className="font-bold text-slate-900">KB Khata Store (MCC: 5411)</div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 font-mono">
              <div className="text-blue-900 font-sans font-bold text-xs flex items-center justify-between">
                <span>Webhook &amp; Verification Policies</span>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                  HMAC-SHA256
                </span>
              </div>
              <div className="text-[11px] text-slate-700 font-sans space-y-1">
                <div>
                  • <strong>Endpoint:</strong>{" "}
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">
                    /api/payments/gpay/webhook
                  </code>
                </div>
                <div>• <strong>Request Freshness:</strong> 300s TTL (Replay Protection)</div>
                <div>• <strong>Bank RRN Format:</strong> 12-Digit Numeric Regex Checked</div>
                <div>• <strong>Double-Entry Ledger:</strong> Auto-credited upon SUCCESS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Dynamic QR Generator Form */}
        <div className="kb-card-elevated p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span>Counter Dynamic QR &amp; Instant UPI Collector</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              Ready for Billing
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Select customer account to collect Jama against outstanding balance. Generates a live QR code with instant reconciliation.
          </p>

          <form onSubmit={handleLaunchGPayCollection} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Khata Account
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust && cust.currentBalance > 0) {
                      setAmount(cust.currentBalance.toString());
                    }
                  }}
                  className="kb-input"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) — Udhaar: {formatCurrency(c.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Collection Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="kb-input font-mono font-bold text-base"
                />
              </div>
            </div>

            {selectedCustomerObj && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Current Udhaar for <strong>{selectedCustomerObj.name}</strong>:
                </span>
                <span className="font-mono font-bold text-sm text-rose-600">
                  {formatCurrency(selectedCustomerObj.currentBalance)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0}
                className="kb-btn-gpay w-full sm:w-auto px-6 py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                <span>Generate Google Pay Dynamic QR</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Transactions History */}
      <div className="kb-card-elevated overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Google Pay &amp; Counter UPI Transactions Journal</h3>
            <p className="text-xs text-slate-500">Live payment settlements recorded into Bahi-Khata ledger.</p>
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-full">
            {payments.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Loading transaction journal...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No transactions recorded in database yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Receipt / Txn ID</th>
                  <th className="py-2.5 px-3">Customer &amp; Village</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Bank RRN / UTR</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-slate-600 font-sans whitespace-nowrap">
                      {formatDateTime(p.paidAt)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.paymentRef}</div>
                      {p.merchantTxnId && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={p.merchantTxnId}>
                          {p.merchantTxnId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-800">{p.customerName}</div>
                      <div className="text-[11px] text-slate-400">
                        {p.villageName} ({p.customerCode})
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {p.bankRrn ? (
                        <span className="text-emerald-700 font-bold">{p.bankRrn}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          p.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.status === "PENDING" ? (
                        <button
                          onClick={() => handleManualRrnVerification(p)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition-all"
                          title="Enter Bank RRN to reconcile"
                        >
                          Verify RRN
                        </button>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Google Pay Checkout Modal */}
      <GPayCheckoutModal
        isOpen={isGPayModalOpen}
        onClose={() => setIsGPayModalOpen(false)}
        amount={parseFloat(amount) || 0}
        customerName={selectedCustomerObj?.name || "Counter Customer"}
        customerMobile={selectedCustomerObj?.mobile}
        customerId={selectedCustomerId}
        onPaymentSuccess={(data) => {
          setFeedback({
            type: "success",
            message: `Payment of ${formatCurrency(parseFloat(amount))} successfully verified and credited to ${selectedCustomerObj?.name}'s ledger! (RRN: ${data.bankRrn || "Instant"})`,
          });
          setAmount("");
          fetchPayments();
        }}
      />
    </div>
  );
}
