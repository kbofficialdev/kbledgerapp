"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Receipt,
  Users,
  MapPin,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Printer,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  CheckCircle2,
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
import { CustomerAvatar, VillageBadge, PaymentTypeBadge } from "@/components/common/Avatars";

interface DashboardMetrics {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOrdersCount: number;
  customerCount: number;
  villageCount: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    customerName: string;
    customerCode: string;
    villageName: string;
    totalAmount: number;
    paidAmount: number;
    creditAmount: number;
    paymentType: string;
    items?: Array<{ name: string; quantity: number; unit: string }>;
  }>;
  villageBreakdown: Array<{ name: string; revenue: number; customers: number }>;
}

export default function AdminAnalyticalDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
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

    async function loadData() {
      try {
        setLoading(true);
        const [vilRes, custRes, ordRes] = await Promise.all([
          fetch("/api/villages").then((r) => r.json()),
          fetch("/api/customers").then((r) => r.json()),
          fetch("/api/orders").then((r) => r.json()),
        ]);

        const villages = vilRes.villages || [];
        const customers = custRes.customers || [];
        const orders = ordRes.orders || [];

        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
        const totalCollected = orders.reduce((sum: number, o: any) => sum + (o.paidAmount || 0), 0);
        const totalOutstanding = customers.reduce(
          (sum: number, c: any) => sum + (c.currentBalance || 0),
          0
        );

        // Village breakdown
        const villageStats = villages.map((v: any) => {
          const vCusts = customers.filter((c: any) => c.villageId === v.id);
          const vCustIds = new Set(vCusts.map((c: any) => c.id));
          const vOrders = orders.filter((o: any) => vCustIds.has(o.customerId));
          const vRev = vOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
          return {
            name: v.name,
            revenue: vRev,
            customers: vCusts.length,
          };
        });

        setMetrics({
          totalRevenue,
          totalCollected,
          totalOutstanding,
          totalOrdersCount: orders.length,
          customerCount: customers.length,
          villageCount: villages.length,
          recentOrders: orders.slice(0, 6),
          villageBreakdown: villageStats,
        });
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-8 pb-12 bg-white">
      {/* 1. INITIAL ANALYTICAL WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-slate-900 to-neutral-800 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-16 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Ledger System Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              KB KHATA Command Center
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              High-velocity village retail commerce, instant billing calculation, and real-time Udhaar tracking with Cashfree Payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-100 font-bold text-sm transition-all shadow-sm active:scale-95"
            >
              <BrandBillingIcon className="w-4 h-4 text-emerald-600" />
              <span>+ New Bill (F2)</span>
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-white border border-neutral-700 font-semibold text-sm transition-all"
            >
              <BrandReportsIcon className="w-4 h-4 text-cyan-400" />
              <span>Carbon Reports</span>
            </Link>
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-sm transition-all"
            >
              <BrandCashfreeIcon className="w-4 h-4 text-amber-400" />
              <span>Cashfree Gateway</span>
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
              <CheckCircle2 className="w-3.5 h-3.5" /> Cashfree Sandbox Active
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Villages Covered</span>
            <span className="font-semibold text-slate-200">{metrics?.villageCount || 2} Territories</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Customers</span>
            <span className="font-semibold text-slate-200">{metrics?.customerCount || 3} Registered</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN ANALYTICAL SECTION: LEFT GRAPHS / METRICS, RIGHT SERVICES CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: METRICS & VISUAL GRAPHS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Financial & Sales Analytics
            </h2>
            <span className="text-xs font-medium text-slate-500">Live Database Sync</span>
          </div>

          {/* 3 Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Turnover */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Gross Turnover
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(metrics?.totalRevenue || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold">
                  {metrics?.totalOrdersCount || 0} Bills
                </span>
                <span>all time sales</span>
              </div>
            </div>

            {/* Collected Cash */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Cash & PG Paid
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(metrics?.totalCollected || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-700">
                  {metrics?.totalRevenue ? Math.round(((metrics?.totalCollected || 0) / metrics.totalRevenue) * 100) : 0}%
                </span>
                <span>realized income</span>
              </div>
            </div>

            {/* Outstanding Udhaar */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Pending Udhaar
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(metrics?.totalOutstanding || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-700">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold">
                  Due
                </span>
                <span>credit balance</span>
              </div>
            </div>
          </div>

          {/* Visual Graph / Collection Ratio Progress */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-900">Collections vs Udhaar Debt Ratio</span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                Total Book: {formatCurrency((metrics?.totalCollected || 0) + (metrics?.totalOutstanding || 0))}
              </span>
            </div>

            {/* Dual color progress bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${
                    metrics?.totalRevenue
                      ? Math.min(100, Math.max(5, ((metrics.totalCollected || 0) / (metrics.totalRevenue || 1)) * 100))
                      : 50
                  }%`,
                }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title="Realized Revenue"
              />
              <div
                style={{
                  width: `${
                    metrics?.totalRevenue
                      ? Math.min(100, Math.max(5, ((metrics.totalOutstanding || 0) / (metrics.totalRevenue || 1)) * 100))
                      : 50
                  }%`,
                }}
                className="bg-rose-500 h-full transition-all duration-500"
                title="Pending Udhaar Debt"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Collected: <strong>{formatCurrency(metrics?.totalCollected || 0)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Udhaar Outstanding: <strong>{formatCurrency(metrics?.totalOutstanding || 0)}</strong></span>
              </div>
            </div>
          </div>

          {/* Village Territory Performance Metrics */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-600" />
                Village Territory Distribution
              </span>
              <Link
                href="/admin/customers"
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-0.5"
              >
                View Ledgers <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-2">
              {metrics?.villageBreakdown && metrics.villageBreakdown.length > 0 ? (
                metrics.villageBreakdown.map((vil, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{vil.name}</span>
                      <span className="font-mono text-slate-600">
                        {formatCurrency(vil.revenue)} • {vil.customers} customers
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(15, (vil.revenue / (metrics.totalRevenue || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2 text-center">Loading village territories...</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ALL SERVICE CARDS WITH GRADIENT BG & HOVER ELEVATIONS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Store Modules & Services</h2>
            <span className="text-xs font-medium text-slate-500">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 1. Billing Section (F2) */}
            <Link
              href="/admin/billing"
              className="group p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                <BrandBillingIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                    Billing Section
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                    F2
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Itemized entry with live auto-calc & sequential payment flow.
                </p>
              </div>
            </Link>

            {/* 2. Customers & Villages */}
            <Link
              href="/admin/customers"
              className="group p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white hover:border-purple-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-purple-600 text-white group-hover:scale-105 transition-transform">
                <BrandCustomersIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-950">
                    Customers & Villages
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                    Ledger
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Unified territory directory, customer profiles & credit balance limits.
                </p>
              </div>
            </Link>

            {/* 3. Carbon Reports */}
            <Link
              href="/admin/reports"
              className="group p-4 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50/50 to-white hover:border-cyan-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-cyan-700 text-white group-hover:scale-105 transition-transform">
                <BrandReportsIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-950">
                    Carbon Reports
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                    Dot-Matrix
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Filtered customer & village statements with pure print isolation.
                </p>
              </div>
            </Link>

            {/* 4. Cashfree Payments */}
            <Link
              href="/admin/payments"
              className="group p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white hover:border-amber-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-amber-600 text-white group-hover:scale-105 transition-transform">
                <BrandCashfreeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-950">
                    Cashfree Gateway
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    UPI / Cards
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  PCI-DSS sandbox gateway, order audits, and webhook sync.
                </p>
              </div>
            </Link>

            {/* 5. Support Tickets */}
            <Link
              href="/admin/tickets"
              className="group p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50/50 to-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-indigo-600 text-white group-hover:scale-105 transition-transform">
                <BrandShieldIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-950">
                    Customer Enquiries Desk
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    Tickets
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Resolve customer billing inquiries and ledger dispute requests.
                </p>
              </div>
            </Link>

            {/* 6. Village Field Collections */}
            <Link
              href="/admin/reports/village-collection"
              className="group p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50/50 to-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                <BrandReportsIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                    Village Collections
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Field Sheet & Excel
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Print field collection sheet with blank handwriting column & upload Excel to reconcile.
                </p>
              </div>
            </Link>

            {/* 7. AI Business Intelligence */}
            <Link
              href="/admin/ai"
              className="group p-4 rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50/50 to-white hover:border-pink-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-pink-600 text-white group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-pink-950">
                    AI Business Advisor
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 text-[10px] font-bold">
                    Gemini Flash
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Natural language database questions, revenue forecasts & Udhaar alerts.
                </p>
              </div>
            </Link>

            {/* 6. Biometrics & Security */}
            <Link
              href="/admin/security"
              className="group p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-neutral-50/50 to-white hover:border-slate-400 hover:shadow-md transition-all duration-200 flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-slate-800 text-white group-hover:scale-105 transition-transform">
                <BrandShieldIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                    Security & Biometrics
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                    Face MFA
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Webcam facial vector enrollment and tamper-resistant audit log.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY & BILLING SLIPS TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Store Billing Slips</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest transactions recorded across all village territories.
            </p>
          </div>
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors"
          >
            <span>+ Create Bill</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Slip / Bill #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Credit (Udhaar)</th>
                <th className="py-3 px-4 text-center">Settlement</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.recentOrders && metrics.recentOrders.length > 0 ? (
                metrics.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{order.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{order.customerCode}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        {order.villageName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      {formatCurrency(order.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-600">
                      {order.creditAmount > 0 ? formatCurrency(order.creditAmount) : "₹0"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          order.paymentType === "CREDIT"
                            ? "bg-rose-100 text-rose-800"
                            : order.paymentType === "PARTIAL"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {order.paymentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-mono">
                      {formatDateTime(order.orderDate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    {loading ? "Loading transactions..." : "No billing records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
