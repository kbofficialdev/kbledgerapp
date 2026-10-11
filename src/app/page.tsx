"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Users,
  MapPin,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Smartphone,
  BookOpen,
  ChevronRight,
  Printer,
  Bot,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
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
    // Check local counter draft
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
      .catch((e) => console.warn("Dashboard fetch error:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-7">
      {/* Draft Restored Notification Alert */}
      {hasDraft && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-medium">
              <strong className="font-semibold">Unsaved Bill Draft Found:</strong> You have an active counter slip saved from your last session.
            </span>
          </div>
          <Link
            href="/orders/new"
            className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors"
          >
            Resume Slip →
          </Link>
        </div>
      )}

      {/* Clean Compact Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-7 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 border border-white/15 text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified Google Pay Merchant Desk
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                UPI v2.8
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              KB Khata &amp; Fashions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Village commerce ledger &amp; digital counter billing with instant Google Pay QR settlement.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href="/orders/new"
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>New Bill (F2)</span>
            </Link>

            <Link
              href="/admin/ai"
              className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-all flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-violet-300" />
              <span>AI Advisor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Compact Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Villages
            </span>
            <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
              {loading ? "..." : data?.villageCount || 0}
            </p>
            <span className="text-[11px] text-slate-500">Route areas</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <MapPin className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Khata Accounts
            </span>
            <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
              {loading ? "..." : data?.customerCount || 0}
            </p>
            <span className="text-[11px] text-slate-500">Buyers registered</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
              Total Udhaar Debt
            </span>
            <p className="text-lg font-black font-mono text-rose-600 mt-0.5">
              {loading ? "..." : formatCurrency(data?.totalOutstanding || 0)}
            </p>
            <span className="text-[11px] text-slate-500">Cumulative baki</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Orders
            </span>
            <p className="text-lg font-black font-mono text-slate-900 mt-0.5">
              {loading ? "..." : data?.recentOrders.length || 0}
            </p>
            <span className="text-[11px] text-slate-500">Counter slips</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Section: Online Services (Design strictly matching reference image) */}
      <div className="space-y-4">
        {/* Section Header with Pill Badge */}
        <div className="text-center max-w-lg mx-auto space-y-1 pt-1 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[10px] font-bold tracking-wide">
            <span>✦</span>
            <span className="uppercase">NEWLY LAUNCHED</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Online Services
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            The latest services now live on the Hub — sign in to get started.
          </p>
        </div>

        {/* 4 Cards Grid - Exact Design from Reference Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Warm Amber (Online No-Due Certificate & Billing) */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-5 overflow-hidden flex flex-col justify-between group">
            {/* Left accent vertical pill */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-l-2xl" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800">
                  Online No-Due Certificate
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apply for your SNDC fully online — no desk visits.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/orders/new"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
              >
                <span>Sign in to access</span>
                <span className="text-sm font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            {/* Faint watermark icon */}
            <Receipt className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-900/[0.03] pointer-events-none transform -rotate-12" />
          </div>

          {/* Card 2: Teal / Emerald (Certificate Requests OCR & Ledger) */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-5 overflow-hidden flex flex-col justify-between group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600 rounded-l-2xl" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800">
                  Certificate Requests (OCR)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Request transcripts, bonafides &amp; more; track status live.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/ledger"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
              >
                <span>Sign in to access</span>
                <span className="text-sm font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <BookOpen className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-900/[0.03] pointer-events-none transform -rotate-12" />
          </div>

          {/* Card 3: Blue (Online Fee Payment) */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-5 overflow-hidden flex flex-col justify-between group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800">
                  Online Fee Payment
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pay fees securely and download receipts instantly.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/payments"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>Sign in to access</span>
                <span className="text-sm font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <CreditCard className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-900/[0.03] pointer-events-none transform -rotate-12" />
          </div>

          {/* Card 4: Ruby / Crimson (Results & 360 Profile) */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-5 overflow-hidden flex flex-col justify-between group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 rounded-l-2xl" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800">
                  Results &amp; 360° Profile
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  View SGPA/CGPA, attendance and your academic record.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/portal/login"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
              >
                <span>Sign in to access</span>
                <span className="text-sm font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <Smartphone className="absolute -right-3 -bottom-3 w-20 h-20 text-slate-900/[0.03] pointer-events-none transform -rotate-12" />
          </div>
        </div>
      </div>

      {/* Accounting Clarity Definition Chips */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
          <BookOpen className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Khata Accounting Modes:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <strong className="text-emerald-800">Debit (Cash):</strong>
            <span className="text-slate-500">Paid in full</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <strong className="text-amber-800">Partial:</strong>
            <span className="text-slate-500">Cash + Udhaar balance</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <strong className="text-rose-800">Credit (Udhaar):</strong>
            <span className="text-slate-500">Unpaid debt</span>
          </div>
        </div>
      </div>

      {/* Recent Counter Bills Table with Telugu Voice Callout */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Counter Bills &amp; Slips
            </h3>
            <p className="text-[11px] text-slate-500">Latest recorded transactions with Telugu voice callout</p>
          </div>

          <Link
            href="/orders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading counter slips...</div>
          ) : !data || data.recentOrders.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No orders recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3.5">Order #</th>
                  <th className="py-2.5 px-3.5">Customer &amp; Village</th>
                  <th className="py-2.5 px-3.5 text-center">Voice</th>
                  <th className="py-2.5 px-3.5">Settlement</th>
                  <th className="py-2.5 px-3.5 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3.5 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {data.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <span className="font-mono font-bold text-slate-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(ord.orderDate)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <CustomerAvatar name={ord.customerName} size="sm" />
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{ord.customerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <VillageBadge name={ord.villageName} size="sm" />
                            <span className="text-[10px] font-mono text-slate-400">
                              {ord.customerCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
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

                    <td className="py-2.5 px-3.5">
                      <PaymentTypeBadge type={ord.paymentType} />
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-mono">
                      <span className="font-bold text-slate-900 text-xs block">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                      {ord.paymentType === "PARTIAL" && (
                        <span className="text-[10px] text-slate-500">
                          Paid: {formatCurrency(ord.paidAmount)} • Udhaar: {formatCurrency(ord.creditAmount)}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <Link
                        href={`/reports/print/${ord.id}`}
                        target="_blank"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex transition-all"
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
