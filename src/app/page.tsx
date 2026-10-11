"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Users,
  MapPin,
  IndianRupee,
  PlusCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard,
  QrCode,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  Sparkles,
  Smartphone,
  Shield,
  Bot,
  UserCheck,
  BookOpen,
  ArrowRight,
  Search,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import KbLogo from "@/components/brand/KbLogo";
import { CustomerAvatar, VillageBadge, PaymentTypeBadge } from "@/components/common/Avatars";
import { VoiceCalloutButton } from "@/components/common/VoiceCalloutButton";

interface DashboardSummary {
  villageCount: number;
  customerCount: number;
  totalOutstanding: number;
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
}

export default function StoreHomePage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    // Check local draft
    try {
      const draft = localStorage.getItem("kb_draft_slip_active");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.items && parsed.items.some((i: any) => i.name || i.pricePerUnit)) {
          setHasDraft(true);
        }
      }
    } catch (e) {}

    // Fetch dashboard data
    Promise.all([
      fetch("/api/villages").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([vilData, custData, ordData]) => {
        const villages = vilData.villages || [];
        const customers = custData.customers || [];
        const orders = ordData.orders || [];

        const totalOutstanding = customers.reduce(
          (sum: number, c: any) => sum + (c.currentBalance || 0),
          0
        );

        setData({
          villageCount: villages.length,
          customerCount: customers.length,
          totalOutstanding,
          recentOrders: orders.slice(0, 8),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Draft Restored Notification Alert */}
      {hasDraft && (
        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">Uncommitted Counter Bill Draft Found:</span> You have an active bill draft saved from your last counter entry.
            </div>
          </div>
          <Link
            href="/orders/new"
            className="kb-btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700"
          >
            Resume Slip
          </Link>
        </div>
      )}

      {/* Top Reference Design Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
          <span>✦ NEWLY LAUNCHED</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Online Services &amp; Store Hub
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
          The unified offline counter billing, regional village logistics, and customer Khata ledger portal.
        </p>
      </div>

      {/* 4 Core Services Cards (Inspired by Reference Image Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {/* Card 1: New Counter Bill (Amber Accent) */}
        <Link
          href="/orders/new"
          className="bg-white border border-slate-200/90 border-l-4 border-l-amber-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Receipt className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              New Counter Billing
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
              Record itemized counter sales with instant F2 hotkey and offline drafting.
            </p>
            <div className="text-xs font-semibold text-amber-600 group-hover:text-amber-700 flex items-center gap-1 mt-3">
              <span>Create bill slip (F2) →</span>
            </div>
          </div>
          {/* Subtle Watermark Icon */}
          <Receipt className="w-16 h-16 absolute -bottom-2 -right-2 text-slate-900/[0.03] group-hover:text-slate-900/[0.06] transition-colors pointer-events-none" />
        </Link>

        {/* Card 2: Bahi-Khata Ledger (Teal Accent) */}
        <Link
          href="/ledger"
          className="bg-white border border-slate-200/90 border-l-4 border-l-teal-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Bahi-Khata Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
              Audit Udhaar debt, customer debit credits, and settlement accounts.
            </p>
            <div className="text-xs font-semibold text-teal-600 group-hover:text-teal-700 flex items-center gap-1 mt-3">
              <span>Inspect ledger balances →</span>
            </div>
          </div>
          {/* Subtle Watermark Icon */}
          <BookOpen className="w-16 h-16 absolute -bottom-2 -right-2 text-slate-900/[0.03] group-hover:text-slate-900/[0.06] transition-colors pointer-events-none" />
        </Link>

        {/* Card 3: Village Commerce Hub (Blue Accent) */}
        <Link
          href="/villages"
          className="bg-white border border-slate-200/90 border-l-4 border-l-blue-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <MapPin className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Village Commerce Hub
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
              Manage 6 regional delivery route profiles, populations, and village debt.
            </p>
            <div className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 mt-3">
              <span>Manage village routes →</span>
            </div>
          </div>
          {/* Subtle Watermark Icon */}
          <MapPin className="w-16 h-16 absolute -bottom-2 -right-2 text-slate-900/[0.03] group-hover:text-slate-900/[0.06] transition-colors pointer-events-none" />
        </Link>

        {/* Card 4: Customer Directory (Rose Accent) */}
        <Link
          href="/customers"
          className="bg-white border border-slate-200/90 border-l-4 border-l-rose-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Customer Directory
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
              Customer accounts, balances, and automatic welcome credentials dispatch.
            </p>
            <div className="text-xs font-semibold text-rose-600 group-hover:text-rose-700 flex items-center gap-1 mt-3">
              <span>View customer accounts →</span>
            </div>
          </div>
          {/* Subtle Watermark Icon */}
          <Users className="w-16 h-16 absolute -bottom-2 -right-2 text-slate-900/[0.03] group-hover:text-slate-900/[0.06] transition-colors pointer-events-none" />
        </Link>
      </div>

      {/* Secondary Quick Action Row (Customer Portal & Google Pay) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Portal Entry Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Customer Self-Service</span>
              <span className="text-[11px] text-slate-500 block truncate">Separate portal for village customers</span>
            </div>
          </div>
          <Link
            href="/portal/login"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0 whitespace-nowrap"
          >
            Open Portal →
          </Link>
        </div>

        {/* Google Pay Collections */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Google Pay UPI Terminal</span>
              <span className="text-[11px] text-slate-500 block truncate">Instant QR code collection hub</span>
            </div>
          </div>
          <Link
            href="/payments"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0 whitespace-nowrap"
          >
            Open Terminal →
          </Link>
        </div>
      </div>

      {/* Financial Health Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Village Territories
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {loading ? "..." : data?.villageCount || 0}
            </p>
            <span className="text-xs text-slate-500 font-medium">Mapped route territories</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Registered Khata Accounts
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {loading ? "..." : data?.customerCount || 0}
            </p>
            <span className="text-xs text-slate-500 font-medium">Village retail buyers</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
              Total Outstanding Udhaar Debt
            </span>
            <p className="text-2xl font-black font-mono text-rose-600 mt-1">
              {loading ? "..." : formatCurrency(data?.totalOutstanding || 0)}
            </p>
            <span className="text-xs text-slate-500 font-medium">Cumulative village baki</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Terminology Clarity Banner */}
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Khata Ledger Accounting Definitions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-bold text-emerald-800">Debit (Nagathu / Cash):</span>
            <span className="text-slate-500">Total payment paid right now</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold text-amber-800">Partial Settlement:</span>
            <span className="text-slate-500">Part cash paid + remainder to Udhaar</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="font-bold text-rose-800">Credit (Udhaar / Debt):</span>
            <span className="text-slate-500">Unpaid balance owed</span>
          </div>
        </div>
      </div>

      {/* Recent Counter Bills Table with Voice Callout */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Counter Bills &amp; Slips
            </h3>
            <p className="text-xs text-slate-500">Latest recorded transactions with Telugu voice callout</p>
          </div>

          <Link
            href="/orders"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            <span>View All Bills</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading counter slips...</div>
          ) : !data || data.recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No orders recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer &amp; Route</th>
                  <th className="py-3 px-4 text-center">Telugu Voice</th>
                  <th className="py-3 px-4">Settlement Mode</th>
                  <th className="py-3 px-4 text-right">Bill Total (₹)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {data.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(ord.orderDate)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar name={ord.customerName} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900">{ord.customerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <VillageBadge name={ord.villageName} size="sm" />
                            <span className="text-[10px] font-mono text-slate-400">
                              {ord.customerCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <VoiceCalloutButton
                        payload={{
                          customerName: ord.customerName,
                          villageName: ord.villageName,
                          amount: ord.totalAmount,
                          paymentType: ord.paymentType,
                        }}
                        variant="badge"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <PaymentTypeBadge type={ord.paymentType} />
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <span className="font-black text-slate-900 text-sm block">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                      {ord.paymentType === "PARTIAL" && (
                        <span className="text-[10px] text-slate-500">
                          Paid: {formatCurrency(ord.paidAmount)} • Udhaar: {formatCurrency(ord.creditAmount)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/reports/print/${ord.id}`}
                        target="_blank"
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex transition-all"
                        title="Print Carbon Slip (80mm)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
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
