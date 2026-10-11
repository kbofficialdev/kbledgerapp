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

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Google Pay Business: kbfashions.eazypay@icici
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                UPI v2.8 Live
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              KB Khata &amp; Fashions
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              గ్రామీణ వ్యాపార ఖాతా, లెడ్జర్ &amp; డిజిటల్ కౌంటర్ డెస్క్. Bahi-khata ledger management, offline counter billing with instant Google Pay QR settlement.
            </p>
          </div>

          {/* Quick Counter Action */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href="/orders/new"
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>New Bill (F2)</span>
            </Link>

            <Link
              href="/admin/ai"
              className="py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4 text-violet-400" />
              <span>AI Advisor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Two Master Gateway Portals: Customer vs Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gateway 1: Customer Khata Portal */}
        <div className="bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Smartphone className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                For Customers
              </span>
              <span className="text-xs text-slate-400 font-medium">Self-Service</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Customer Khata Portal
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              కస్టమర్లు తమ బిల్లులు, వస్తువులు, పాత ఉద్ధార బకాయిలు చూసుకొని Google Pay ద్వారా నేరుగా చెల్లించవచ్చు.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-indigo-100/80">
            <Link
              href="/portal/login"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Customer Login with Mobile OTP</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/portal"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Find My Account / Directory</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Gateway 2: Store Admin & Counter Desk */}
        <div className="bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Shield className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                For Shop Owner / Admin
              </span>
              <span className="text-xs text-slate-400 font-medium">Biometric Protected</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Admin &amp; Counter Desk
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              స్టోర్ అడ్మిన్ లాగిన్: ఫేస్ రికగ్నిషన్, ఈమెయిల్ OTP మరియు పిన్ భద్రతతో కొత్త గ్రామాలు, కస్టమర్లు మరియు బిల్లుల నమోదు.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-emerald-100/80">
            <Link
              href="/admin/login"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Admin Login (Face ID + OTP + PIN)</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/orders"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <span>Open Counter Register &amp; Orders Archive</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
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
          <span>ఖాతా లెడ్జర్ నియమాలు / Khata Ledger Definitions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-bold text-emerald-800">నగదు (Nagathu / Debit):</span>
            <span className="text-slate-500">Total payment paid right now</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold text-amber-800">పాక్షిక (Partial):</span>
            <span className="text-slate-500">Part cash paid + remainder to Udhaar</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="font-bold text-rose-800">ఉద్ధార (Udhaar / Credit):</span>
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
