"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Receipt,
  BookOpen,
  CreditCard,
  Printer,
  AlertCircle,
  IndianRupee,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  ArrowDownLeft,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/ui/Table";

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

function CustomerDetailContent() {
  const params = useParams();
  const customerId = (params?.customerId as string) || (params?.id as string);

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "ledger" | "payments">("orders");
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/${customerId}`);
      const json = await res.json();
      if (json.success && json.customer) {
        setData(json);
        setPayAmount(json.customer.currentBalance > 0 ? json.customer.currentBalance : 100);
      } else {
        setFeedback({ type: "error", message: json.error || "Could not load customer account details." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Network error loading customer portal." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchPortalData();
  }, [customerId]);

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      if (!data?.customer.id) return;
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: data.customer.id,
          amount: payAmount,
          method: paymentData.method || "GOOGLE_PAY",
          notes: "Customer portal online settlement via Google Pay UPI",
          merchantTxnId: paymentData.merchantTxnId,
          upiRefId: paymentData.upiRefId,
          bankRrn: paymentData.bankRrn,
          payerVpa: paymentData.payerVpa,
          gpayTransactionId: paymentData.gpayTransactionId,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setFeedback({
          type: "success",
          message: `Payment of ${formatCurrency(payAmount)} received and credited successfully!`,
        });
        setIsGPayModalOpen(false);
        fetchPortalData();
      } else {
        setFeedback({ type: "error", message: resJson.error || "Could not record payment." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to confirm payment." });
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">Loading customer account details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="max-w-md mx-auto my-12 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Customer Account Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {feedback?.message || "Please return to your personal Khata account."}
        </p>
        <Link href="/customer" className="block w-full">
          <Button variant="primary" size="md" className="w-full justify-center">
            Return to My Khata
          </Button>
        </Link>
      </Card>
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
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to My Khata</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
          Account ID: {customer.customerCode}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Customer Hero Profile Card */}
      <Card className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">Customer Khata</Badge>
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400">
              {customer.customerCode}
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            {customer.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600 dark:text-zinc-400">
            <span className="flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{customer.villageName} ({customer.villageCode})</span>
            </span>

            <span className="flex items-center gap-1 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.mobile}</span>
            </span>

            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Outstanding Balance & Pay Button */}
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
              Outstanding Udhaar Balance
            </span>
            <p
              className={`text-2xl font-bold font-mono tracking-tight mt-0.5 tabular-nums ${
                customer.currentBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(customer.currentBalance)}
            </p>
          </div>

          {customer.currentBalance > 0 && (
            <Link href="/customer/pay">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors active:scale-98"
              >
                <BrandCashfreeIcon className="w-3.5 h-3.5 text-white" />
                <span>Pay via Cashfree</span>
              </button>
            </Link>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Total Purchases"
          value={formatCurrency(totalBilled)}
          icon={Receipt}
          variant="slate"
          description={`${orders.length} slips recorded`}
        />
        <MetricCard
          label="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={ArrowDownLeft}
          variant="emerald"
          description={`${payments.length} verified receipts`}
        />
        <MetricCard
          label="Approved Credit Limit"
          value={formatCurrency(customer.creditLimit)}
          icon={ShieldCheck}
          variant="indigo"
          description="Assigned safety ceiling"
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "orders"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Bills &amp; Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "ledger"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Bahi-Khata ({ledgerEntries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "payments"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments ({payments.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 space-y-2">
              <Receipt className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No Counter Slips Recorded</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Itemized bills will appear here once entered at the counter.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-slate-900 dark:text-zinc-100">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant={
                            order.paymentType === "DEBIT"
                              ? "success"
                              : order.paymentType === "PARTIAL"
                              ? "warning"
                              : "error"
                          }
                        >
                          {order.paymentType === "DEBIT"
                            ? "Cash / Nagath"
                            : order.paymentType === "CREDIT"
                            ? "Credit / Udhaar"
                            : "Partial Settlement"}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(order.orderDate)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      {order.creditAmount > 0 && (
                        <span className="block text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                          Due: {formatCurrency(order.creditAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-md border border-slate-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-0.5">
                      Purchased Items
                    </span>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-zinc-300"
                      >
                        <span>
                          {item.name} × {item.quantity} {item.unit}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px] tabular-nums">
                      Paid: {formatCurrency(order.paidAmount)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Printer}
                      onClick={() => window.print()}
                    >
                      Print Slip
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BAHI-KHATA */}
      {activeTab === "ledger" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Bahi-Khata Statement</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Statement of transactions and progressive balance.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print Ledger
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction Details</TableHead>
                <TableHead className="text-right text-rose-600 dark:text-rose-400 font-bold">Debit / Billed (+)</TableHead>
                <TableHead className="text-right text-emerald-600 dark:text-emerald-400 font-bold">Credit / Paid (-)</TableHead>
                <TableHead className="text-right">Running Udhaar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-slate-500 dark:text-zinc-400 whitespace-nowrap text-xs">
                    {formatDateTime(entry.entryDate)}
                  </TableCell>
                  <TableCell className="font-sans text-slate-800 dark:text-zinc-200 text-xs max-w-xs break-words">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums text-xs font-mono">
                    {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs font-mono">
                    {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums text-xs font-mono">
                    {formatCurrency(entry.runningBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No Payment Records</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Payments made through Google Pay UPI or cash will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payments.map((p) => (
                <Card
                  key={p.id}
                  className="p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 block">
                        {p.paymentRef}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {formatDateTime(p.paidAt)}
                      </span>
                    </div>
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-md text-xs space-y-1 font-mono text-slate-600 dark:text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500 font-sans">Method:</span>
                      <span className="font-semibold uppercase text-slate-800 dark:text-zinc-200">{p.method}</span>
                    </div>
                    {p.merchantTxnId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-zinc-500 font-sans">Merchant Txn:</span>
                        <span>{p.merchantTxnId}</span>
                      </div>
                    )}
                    {p.upiRefId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-zinc-500 font-sans">UPI Ref ID:</span>
                        <span>{p.upiRefId}</span>
                      </div>
                    )}
                    {p.bankRrn && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-zinc-500 font-sans">Bank RRN:</span>
                        <span>{p.bankRrn}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 text-xs font-semibold">
          Loading Customer Profile...
        </div>
      }
    >
      <CustomerDetailContent />
    </Suspense>
  );
}
