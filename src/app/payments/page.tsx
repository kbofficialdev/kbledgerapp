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
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

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
  phonePeTransactionId?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/payments/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: parseFloat(amount),
        }),
      });

      const data = await res.json();
      if (data.success && data.redirectUrl) {
        setFeedback({
          type: "success",
          message: `PhonePe Checkout initiated (Txn #${data.merchantTxnId})! Redirecting...`,
        });
        // Open redirect URL in new tab or navigate
        window.open(data.redirectUrl, "_blank");
        fetchPayments();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to initiate payment" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const syncStatus = async (merchantTxnId: string) => {
    try {
      const res = await fetch(`/api/payments/phonepe/status/${merchantTxnId}`);
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <span>PhonePe Payment Gateway &amp; Webhook Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            UPI QR, Standard Checkout website integration, and real-time webhook settlement.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="kb-btn-secondary text-xs py-2 px-3 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Transactions</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400">
            ×
          </button>
        </div>
      )}

      {/* Gateway Configuration & Quick Initiate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gateway Specification Card */}
        <div className="kb-card p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Gateway Credentials &amp; Webhook Setup</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 font-mono">
              <div className="text-slate-500 font-sans text-[11px]">Client / Merchant ID</div>
              <div className="font-bold text-slate-900 break-all">KBFASHIONSONLINE_2601171</div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 font-mono">
              <div className="text-slate-500 font-sans text-[11px]">API Key (Salt Key) &amp; Version</div>
              <div className="font-bold text-slate-900 break-all text-[11px]">NjM0Y2VhOGEtNjBhOC... (v1)</div>
            </div>

            <div className="p-2.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5 font-mono">
              <div className="text-purple-900 font-sans font-bold text-xs">PhonePe Dashboard Webhook Fields</div>
              <div className="text-[11px] text-slate-700 font-sans space-y-1">
                <div>• <strong>Webhook URL:</strong> <code className="text-purple-700 bg-white px-1 py-0.5 rounded border border-purple-200">https://&lt;domain&gt;/api/payments/phonepe/webhook</code></div>
                <div>• <strong>Auth Type:</strong> Select <span className="font-semibold text-slate-900">SHA</span></div>
                <div>• <strong>Username:</strong> <code className="bg-white px-1 py-0.5 rounded border border-purple-200">kbadmin</code></div>
                <div>• <strong>Password:</strong> <code className="bg-white px-1 py-0.5 rounded border border-purple-200">kbkhata2026</code></div>
                <div>• <strong>Events:</strong> <span className="font-semibold text-slate-900">PAYMENT.SUCCESS</span></div>
              </div>
            </div>
          </div>
        </div>


        {/* Live Initiate Form */}
        <div className="kb-card p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>Generate PhonePe Online Payment Link / UPI Request</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Initiates an official PhonePe Standard Checkout session and dispatches payment request to customer.
          </p>

          <form onSubmit={handleInitiatePayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Khata Account
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                  className="kb-input font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !amount}
                className="kb-btn-primary"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? "Initiating Checkout..." : "Launch PhonePe Checkout"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Transactions History */}
      <div className="kb-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Gateway &amp; Counter Payments</h3>
          <span className="text-xs text-slate-500 font-mono">{payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading transactions...</div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No gateway transactions found yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Receipt Ref / Merchant Txn</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-center">Gateway Status</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center">Reconcile</th>
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
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
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
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">
                        {p.method}
                      </span>
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
                      {p.merchantTxnId && (
                        <button
                          onClick={() => syncStatus(p.merchantTxnId!)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                          title="Check status with PhonePe"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

