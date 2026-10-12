"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  CreditCard,
  BookOpen,
  Receipt,
  MessageSquare,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Clock,
  Printer,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  BrandBillingIcon,
  BrandAnalyticsIcon,
  BrandCustomersIcon,
  BrandCashfreeIcon,
  BrandReportsIcon,
  BrandShieldIcon,
} from "@/components/brand/BrandIcons";
import { useToast } from "@/context/ToastContext";

interface CustomerDashboardData {
  customer: {
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    email?: string;
    villageName: string;
    villageCode: string;
    creditLimit: number;
    currentBalance: number;
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
    items?: Array<{ name: string; quantity: number }>;
  }>;
  payments: Array<{
    id: string;
    paymentRef: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
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

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );

    async function loadPortalData() {
      try {
        setLoading(true);
        const res = await fetch("/api/customer/me");
        if (res.status === 401) {
          toast.authError("Your customer session has expired. Please log in.", "Session Expired");
          router.replace("/customer/login");
          return;
        }

        const json = await res.json();
        if (json.success && json.customer) {
          setData(json);
        } else {
          toast.authError(json.error || "Could not load customer details.", "Account Error");
        }
      } catch (err: any) {
        toast.authError("Network error accessing customer portal.", "Connection Error");
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">Accessing verified customer portal...</p>
      </div>
    );
  }

  if (!data || !data.customer) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm font-medium text-slate-600">Unable to load customer account records.</p>
        <Link
          href="/customer/login"
          className="inline-block px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold"
        >
          Sign In Again
        </Link>
      </div>
    );
  }

  const { customer, orders = [], payments = [], ledgerEntries = [] } = data;

  const totalPurchases = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const outstandingUdhaar = customer.currentBalance;
  const creditLimit = customer.creditLimit || 25000;
  const creditUtilizationPercent = creditLimit > 0 ? Math.min(100, Math.round((outstandingUdhaar / creditLimit) * 100)) : 0;
  const availableCredit = Math.max(0, creditLimit - outstandingUdhaar);

  return (
    <div className="space-y-8 pb-12 bg-white">
      {/* 1. INITIAL ANALYTICAL WELCOME BANNER (INSPIRATION FROM ADMIN) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-slate-900 to-neutral-800 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-16 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified Customer Ledger Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome, {customer.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Member Code: <span className="font-mono text-emerald-400 font-semibold">{customer.customerCode}</span> • Village Territory: <span className="font-semibold text-white">{customer.villageName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/customer/khata"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-100 font-bold text-sm transition-all shadow-sm active:scale-95"
            >
              <BrandCashfreeIcon className="w-4 h-4 text-amber-500" />
              <span>Pay Udhaar Online</span>
            </Link>
            <Link
              href="/customer/khata"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-white border border-neutral-700 font-semibold text-sm transition-all"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Full Statement</span>
            </Link>
            <Link
              href="/customer/tickets"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-semibold text-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Support Enquiry</span>
            </Link>
          </div>
        </div>

        {/* Banner mini stats bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">System Clock</span>
            <span className="font-semibold text-slate-200">{currentTime || "Today"}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Payment Gateway</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cashfree Verified
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Purchases</span>
            <span className="font-semibold text-slate-200">{orders.length} Bills final</span>
          </div>
          <div>
            <span className="text-slate-400 block">Credit Safety Margin</span>
            <span className="font-semibold text-emerald-300">
              {creditUtilizationPercent < 80 ? "Healthy Standing" : "Limit Approaching"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN ANALYTICAL SECTION: LEFT METRICS & GRAPHS, RIGHT SERVICES CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: METRICS & GRAPHS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Ledger & Account Analytics
            </h2>
            <span className="text-xs font-medium text-slate-500">Real-Time Sync</span>
          </div>

          {/* 3 Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Pending Udhaar Due */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Pending Udhaar
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(outstandingUdhaar)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-700">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold">
                  Due Now
                </span>
                <span>current balance</span>
              </div>
            </div>

            {/* 2. Total Lifetime Purchases */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Purchases
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalPurchases)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold">
                  {orders.length} Orders
                </span>
                <span>lifetime items</span>
              </div>
            </div>

            {/* 3. Total Realized Payments */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Paid
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(totalPaid)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-700">
                  {totalPurchases > 0 ? Math.round((totalPaid / totalPurchases) * 100) : 100}%
                </span>
                <span>settled portion</span>
              </div>
            </div>
          </div>

          {/* Credit Limit & Utilization Visual Bar */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900">Credit Limit & Standing</h3>
                <p className="text-xs text-slate-500">
                  Maximum permitted Udhaar sanctioned by KB Fashions.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">Available Credit</span>
                <div className="text-sm font-mono font-bold text-emerald-700">
                  {formatCurrency(availableCredit)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    creditUtilizationPercent > 85
                      ? "bg-rose-500"
                      : creditUtilizationPercent > 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(3, creditUtilizationPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>
                  Owed: <strong>{formatCurrency(outstandingUdhaar)}</strong> ({creditUtilizationPercent}%)
                </span>
                <span>
                  Limit: <strong>{formatCurrency(creditLimit)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Khata Ledger Transactions */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Recent Ledger Activity
              </h3>
              <Link
                href="/customer/khata"
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-0.5"
              >
                View Full Khata <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {ledgerEntries.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {ledgerEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 truncate max-w-[280px]">
                        {entry.description}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDateTime(entry.entryDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.entryType === "BILL_DEBIT" ? (
                        <span className="font-mono font-bold text-rose-600 block">
                          +{formatCurrency(entry.debitAmount)}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-emerald-600 block">
                          -{formatCurrency(entry.creditAmount)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        Bal: {formatCurrency(entry.runningBalance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                No ledger transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ALL CUSTOMER SERVICE CARDS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Customer Services & Tools</h2>
            <span className="text-xs font-medium text-slate-500">Quick Portal</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 1. Khata Ledger & Statement */}
            <Link
              href="/customer/khata"
              className="group p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                    Khata Ledger & Statements
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                    Statement
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Complete audit of all bills, payments, and running ledger balances with date filtering.
                </p>
              </div>
            </Link>

            {/* 2. Multi-Order Online Settlement */}
            <Link
              href="/customer/khata"
              className="group p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white hover:border-amber-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-amber-500 text-white group-hover:scale-105 transition-transform">
                <BrandCashfreeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-950">
                    Multi-Order Payment
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Cashfree PG
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select multiple pending bills and pay full or partial amounts via UPI, QR, or Cards.
                </p>
              </div>
            </Link>

            {/* 3. My Orders & Carbon Invoices */}
            <Link
              href="/customer/orders"
              className="group p-4 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50/50 to-white hover:border-cyan-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-cyan-700 text-white group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-950">
                    My Orders & Bills
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                    Thermal / Carbon
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Itemized purchase records, 80mm small slip receipts, and printable carbon vouchers.
                </p>
              </div>
            </Link>

            {/* 4. Support Tickets & Inquiries */}
            <Link
              href="/customer/tickets"
              className="group p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50/50 to-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-indigo-600 text-white group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-950">
                    Customer Enquiries Desk
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    HelpDesk
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Raise questions regarding bills or payments directly to the store owner with reply tracking.
                </p>
              </div>
            </Link>

            {/* 5. Customer AI Ledger Copilot */}
            <Link
              href="/customer/assistant"
              className="group p-4 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50/50 to-white hover:border-violet-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-black text-white group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-950">
                    Customer AI Copilot
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                    Gemini AI
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ask questions in Telugu or English about your Udhaar balance, bill details, and payment options.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
