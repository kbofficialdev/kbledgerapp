"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Smartphone,
  Receipt,
  BookOpen,
  CreditCard,
  QrCode,
  Printer,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import GPayCheckoutModal from "@/components/GPayCheckoutModal";

interface PortalData {
  customer: {
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    altMobile?: string;
    email?: string;
    address?: string;
    villageId: string;
    villageName: string;
    villageCode: string;
    villageTaluk?: string;
    villageDistrict?: string;
    creditLimit: number;
    currentBalance: number;
    notes?: string;
    createdAt: string;
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
    notes?: string;
    items: Array<{
      id: string;
      customItemId: string;
      name: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      lineTotal: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    paymentRef: string;
    amount: number;
    method: string;
    status: string;
    merchantTxnId?: string;
    upiRefId?: string;
    bankRrn?: string;
    payerVpa?: string;
    paidAt: string;
    notes?: string;
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

function CustomerPortalDetailContent() {
  const params = useParams();
  const customerId = params?.customerId as string;
  const router = useRouter();

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "ledger" | "payments">("orders");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Google Pay Modal
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);

  const fetchPortalData = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/${customerId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setPayAmount(json.customer.currentBalance > 0 ? json.customer.currentBalance : 100);
      } else {
        setFeedback({ type: "error", message: json.error || "Could not load customer portal." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Network error loading portal." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [customerId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-xs font-medium">Opening Customer Khata Portal...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="kb-card-elevated p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900">Account Not Found</h3>
        <p className="text-xs text-slate-500">The requested customer portal does not exist.</p>
        <Link href="/portal" className="kb-btn-primary inline-flex text-xs py-2 px-4">
          Return to Portal Directory
        </Link>
      </div>
    );
  }

  const { customer, orders, payments, ledgerEntries } = data;
  const totalBilled = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPaid = payments.filter((p) => p.status === "SUCCESS").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Back Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Accounts</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-400">
          Account ID: {customer.customerCode}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Customer Hero Glass Profile Card */}
      <div className="kb-card-elevated p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Profile Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Customer Khata
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {customer.customerCode}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {customer.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{customer.villageName} ({customer.villageCode})</span>
              </span>

              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.mobile}</span>
              </span>

              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.email}</span>
                </span>
              )}
            </div>
          </div>

          {/* Outstanding Balance & Pay Button */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-white border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Outstanding Udhaar Balance
              </span>
              <p
                className={`text-3xl font-black font-mono tracking-tight mt-0.5 ${
                  customer.currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(customer.currentBalance)}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {customer.currentBalance > 0 ? "Pending Payment Owed" : "Fully Settled • Zero Dues"}
              </span>
            </div>

            <button
              onClick={() => {
                setPayAmount(customer.currentBalance > 0 ? customer.currentBalance : 100);
                setIsGPayModalOpen(true);
              }}
              className="kb-btn-gpay px-5 py-3 text-xs font-bold shadow-md hover:shadow-lg self-stretch sm:self-auto text-center"
            >
              <QrCode className="w-4 h-4" />
              <span>
                {customer.currentBalance > 0
                  ? `Pay ${formatCurrency(customer.currentBalance)} via G-Pay`
                  : "Pay via Google Pay"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Billed Goods
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatCurrency(totalBilled)}
          </p>
          <span className="text-xs text-slate-500 font-medium mt-1 block">
            Across {orders.length} offline counter slips
          </span>
        </div>

        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Total Payments Made (Jama)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {formatCurrency(totalPaid)}
          </p>
          <span className="text-xs text-slate-500 font-medium mt-1 block">
            {payments.length} verified payment settlements
          </span>
        </div>

        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Credit Limit Assigned
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatCurrency(customer.creditLimit)}
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${
                customer.currentBalance > customer.creditLimit && customer.creditLimit > 0
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
              style={{
                width: `${
                  customer.creditLimit > 0
                    ? Math.min(100, Math.round((customer.currentBalance / customer.creditLimit) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "orders"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Counter Bills &amp; Slips ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "ledger"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bahi-Khata Ledger Statement ({ledgerEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "payments"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Receipts ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Orders / Counter Slips */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="kb-card-elevated p-10 text-center text-slate-400 text-xs">
              No bills recorded for this customer yet.
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="kb-card-elevated p-5 space-y-4">
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold text-xs">
                      #{ord.orderNumber.slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{ord.orderNumber}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            ord.paymentType === "DEBIT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ord.paymentType === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {ord.paymentType === "DEBIT"
                            ? "Paid (Debit)"
                            : ord.paymentType === "PARTIAL"
                            ? "Partial Paid"
                            : "Udhaar (Credit)"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(ord.orderDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Bill Total
                      </span>
                      <span className="text-lg font-black font-mono text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                    </div>

                    <Link
                      href={`/reports/print/${ord.id}`}
                      target="_blank"
                      className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all"
                      title="Print Carbon Receipt (80mm)"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                        <th className="py-1.5 px-2">Item ID</th>
                        <th className="py-1.5 px-2">Item Description</th>
                        <th className="py-1.5 px-2 text-center">Qty</th>
                        <th className="py-1.5 px-2 text-right">Rate</th>
                        <th className="py-1.5 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono">
                      {ord.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2 text-slate-400 text-[11px]">{item.customItemId}</td>
                          <td className="py-2 px-2 font-sans font-medium text-slate-800">{item.name}</td>
                          <td className="py-2 px-2 text-center">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">
                            {formatCurrency(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Settlement Breakdown Summary */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
                  <div className="flex items-center gap-4">
                    <span>
                      Paid at Counter:{" "}
                      <strong className="text-emerald-700">{formatCurrency(ord.paidAmount)}</strong>
                    </span>
                    <span>
                      Added to Udhaar:{" "}
                      <strong className="text-rose-600">{formatCurrency(ord.creditAmount)}</strong>
                    </span>
                  </div>
                  {ord.notes && <span className="font-sans italic text-slate-400">Note: {ord.notes}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Ledger Statement */}
      {activeTab === "ledger" && (
        <div className="kb-card-elevated overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Chronological Bahi-Khata Ledger</h3>
            <span className="text-xs text-slate-500 font-mono">{ledgerEntries.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No ledger entries yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Bill Debit (Naave)</th>
                    <th className="py-2.5 px-3 text-right">Payment Credit (Jama)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerEntries.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-sans text-slate-600 whitespace-nowrap">
                        {formatDateTime(l.entryDate)}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-800">
                        {l.description}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-bold">
                        {l.debitAmount > 0 ? formatCurrency(l.debitAmount) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                        {l.creditAmount > 0 ? formatCurrency(l.creditAmount) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(l.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Payments */}
      {activeTab === "payments" && (
        <div className="kb-card-elevated overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recorded Payments &amp; UPI Settlements</h3>
            <span className="text-xs text-slate-500 font-mono">{payments.length} receipts</span>
          </div>

          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No payments recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Receipt Ref</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Bank RRN / UTR</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-sans text-slate-600 whitespace-nowrap">
                        {formatDateTime(p.paidAt)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{p.paymentRef}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.bankRrn ? <span className="font-bold text-emerald-700">{p.bankRrn}</span> : "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Google Pay Checkout Modal */}
      <GPayCheckoutModal
        isOpen={isGPayModalOpen}
        onClose={() => setIsGPayModalOpen(false)}
        amount={payAmount}
        customerName={customer.name}
        customerMobile={customer.mobile}
        customerId={customer.id}
        onPaymentSuccess={(payData) => {
          setFeedback({
            type: "success",
            message: `Google Pay payment of ${formatCurrency(payAmount)} received successfully! (Ref: ${payData.merchantTxnId})`,
          });
          fetchPortalData();
        }}
      />
    </div>
  );
}

export default function CustomerPortalDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading customer portal...</div>}>
      <CustomerPortalDetailContent />
    </Suspense>
  );
}

