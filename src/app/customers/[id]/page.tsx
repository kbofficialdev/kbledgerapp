"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Receipt,
  BookOpen,
  IndianRupee,
  Plus,
  ArrowLeft,
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface OrderItem {
  id: string;
  customItemId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  lineTotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: "CREDIT" | "DEBIT" | "PARTIAL";
  paymentStatus: string;
  items: OrderItem[];
}

interface LedgerEntry {
  id: string;
  entryDate: string;
  entryType: "BILL_DEBIT" | "PAYMENT_CREDIT" | "ADJUSTMENT";
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
}

interface PaymentRecord {
  id: string;
  paymentRef: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  notes?: string;
}

interface CustomerDetail {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  address?: string;
  villageId: string;
  village: { id: string; name: string; code: string };
  creditLimit: number;
  currentBalance: number;
  notes?: string;
  createdAt: string;
  orders: Order[];
  ledgerEntries: LedgerEntry[];
  payments: PaymentRecord[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "orders" | "payments">("ledger");

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "PHONEPE_UPI" | "PHONEPE_QR">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.customer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) return;

    try {
      setSubmittingPay(true);
      setPayFeedback(null);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          amount: amountNum,
          method: payMethod,
          notes: payNotes || "Counter Khata Jama payment",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPayFeedback({ type: "success", message: `Payment of ${formatCurrency(amountNum)} recorded successfully!` });
        setPayAmount("");
        setPayNotes("");
        setIsPayModalOpen(false);
        fetchCustomer();
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to record payment" });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmittingPay(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <div className="kb-card p-6 h-48 animate-pulse bg-slate-100"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="kb-card p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Customer Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">The requested customer account does not exist or was archived.</p>
        <Link href="/customers" className="kb-btn-primary inline-flex">
          Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                {customer.customerCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Village: <strong>{customer.village.name}</strong> ({customer.village.code})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => window.print()}
            className="kb-btn-secondary text-xs sm:text-sm py-2 px-3"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Khata</span>
          </button>

          <button
            onClick={() => {
              setPayAmount(customer.currentBalance > 0 ? customer.currentBalance.toString() : "");
              setIsPayModalOpen(true);
            }}
            className="kb-btn-secondary text-xs sm:text-sm py-2 px-3 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <span>Record Payment (Jama)</span>
          </button>

          <Link
            href={`/orders/new?customerId=${customer.id}&villageId=${customer.villageId}`}
            className="kb-btn-primary text-xs sm:text-sm py-2 px-3"
          >
            <Plus className="w-4 h-4" />
            <span>New Counter Bill</span>
          </Link>
        </div>
      </div>

      {payFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            payFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{payFeedback.message}</span>
          </div>
          <button onClick={() => setPayFeedback(null)} className="text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="kb-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Outstanding Balance Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Khata Balance (Udhaar)
              </span>
              <p
                className={`text-3xl font-extrabold font-mono mt-1 ${
                  customer.currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(customer.currentBalance)}
              </p>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span>Credit Limit:</span>
              <span className="font-mono font-semibold text-slate-700">
                {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : "No Limit"}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-mono font-medium text-slate-900">{customer.mobile}</span>
              {customer.altMobile && (
                <span className="text-slate-400 font-mono text-xs">/ {customer.altMobile}</span>
              )}
            </div>

            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700">{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 text-xs">{customer.address}</span>
              </div>
            )}
          </div>

          {/* Metadata & Summary */}
          <div className="space-y-2 text-xs text-slate-500 border-t md:border-t-0 md:border-l border-slate-200/80 md:pl-6 pt-3 md:pt-0">
            <p>
              Account Registered: <strong className="text-slate-700">{formatDate(customer.createdAt)}</strong>
            </p>
            <p>
              Total Bills Recorded: <strong className="text-slate-700">{customer.orders.length}</strong>
            </p>
            <p>
              Total Payments (Jama): <strong className="text-slate-700">{customer.payments.length}</strong>
            </p>
            {customer.notes && (
              <div className="mt-2 p-2 bg-slate-100 rounded-lg text-slate-600 italic">
                &ldquo;{customer.notes}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Ledger Statement | Orders | Payments */}
      <div className="kb-card overflow-hidden">
        <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 gap-2 no-print">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bahi-Khata Ledger Statement ({customer.ledgerEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Counter Bills ({customer.orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "payments"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Receipts ({customer.payments.length})</span>
          </button>
        </div>

        {/* Tab 1: Khata Ledger Statement */}
        {activeTab === "ledger" && (
          <div className="p-4 overflow-x-auto">
            {customer.ledgerEntries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No ledger transactions recorded yet. Record a bill or payment.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Particulars / Description</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Debit (Bill / Udhaar)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">Credit (Payment / Jama)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-800">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {customer.ledgerEntries.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-sans">
                        {formatDateTime(l.entryDate)}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-sans font-medium">
                        {l.description}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-bold tabular-nums">
                        {l.debitAmount > 0 ? formatCurrency(l.debitAmount) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold tabular-nums">
                        {l.creditAmount > 0 ? formatCurrency(l.creditAmount) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900">
                        {formatCurrency(l.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Orders / Counter Bills */}
        {activeTab === "orders" && (
          <div className="p-4 space-y-3">
            {customer.orders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No counter bills recorded for this customer yet.
              </div>
            ) : (
              customer.orders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-900">{o.orderNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            o.paymentType === "DEBIT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : o.paymentType === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {o.paymentType === "DEBIT" ? "Fully Paid (Debit)" : o.paymentType === "PARTIAL" ? "Partial Paid" : "Unpaid (Credit)"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(o.orderDate)}</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs text-slate-400">Total Bill: </span>
                      <span className="text-base font-bold text-slate-900">{formatCurrency(o.totalAmount)}</span>
                      {o.paymentType === "PARTIAL" && (
                        <p className="text-xs text-amber-700">
                          Paid: {formatCurrency(o.paidAmount)} | Udhaar: {formatCurrency(o.creditAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Itemized Line Items */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 font-semibold border-b border-slate-100">
                          <th className="py-1">Item Code</th>
                          <th className="py-1">Description</th>
                          <th className="py-1 text-center">Qty</th>
                          <th className="py-1 text-right">Rate</th>
                          <th className="py-1 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {o.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-slate-500">{item.customItemId}</td>
                            <td className="py-1.5 text-slate-900 font-sans font-medium">{item.name}</td>
                            <td className="py-1.5 text-center text-slate-700">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-1.5 text-right text-slate-700">{formatCurrency(item.pricePerUnit)}</td>
                            <td className="py-1.5 text-right font-bold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Payments */}
        {activeTab === "payments" && (
          <div className="p-4 overflow-x-auto">
            {customer.payments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No payment receipts recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Receipt Ref</th>
                    <th className="py-2.5 px-3">Payment Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Amount Paid (Jama)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {customer.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{p.paymentRef}</td>
                      <td className="py-3 px-3 text-slate-600 font-sans">{formatDateTime(p.paidAt)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[10px]">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-sans">{p.notes || "—"}</td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Record Payment (Jama) Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <span>Record Khata Jama / Payment</span>
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Customer Current Udhaar:</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {formatCurrency(customer.currentBalance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="kb-input font-mono text-base font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod("CASH")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      payMethod === "CASH"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <IndianRupee className="w-4 h-4" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod("PHONEPE_UPI")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      payMethod === "PHONEPE_UPI"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                    <span>PhonePe UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod("PHONEPE_QR")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      payMethod === "PHONEPE_QR"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <span>Store QR</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Receipt Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at weekly market"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="kb-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="kb-btn-secondary"
                  disabled={submittingPay}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay || !payAmount}
                  className="kb-btn-primary"
                >
                  {submittingPay ? "Saving..." : "Record Jama (Credit)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
