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
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import KbLogo from "@/components/brand/KbLogo";

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
  }>;
}

export default function DashboardPage() {
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
          recentOrders: orders.slice(0, 10),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Draft Restored Notification Alert */}
      {hasDraft && (
        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-soft">
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
            Resume Bill Draft
          </Link>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Counter Mode
            </span>
            <span className="text-xs text-slate-400">• Production Ready</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            KB Khata — Counter &amp; Village Commerce Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Streamlined offline slip recording, village profiles, Google Pay UPI Dynamic QR, and carbon print receipts.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/orders/new"
            className="kb-btn-primary text-xs sm:text-sm py-2.5 px-4 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Counter Bill (F2)</span>
          </Link>

          <Link
            href="/portal"
            className="kb-btn-secondary text-xs sm:text-sm py-2.5 px-3.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/50"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Customer Portal</span>
          </Link>

          <Link
            href="/customers"
            className="kb-btn-secondary text-xs sm:text-sm py-2.5 px-3.5"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Customers</span>
          </Link>

          <Link
            href="/ledger"
            className="kb-btn-secondary text-xs sm:text-sm py-2.5 px-3.5"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Master Khata</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Villages */}
        <div className="kb-card-elevated p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Villages Covered
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-slate-900 mt-3">
            {loading ? "—" : data?.villageCount}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Territory Routes</span>
            <Link href="/villages" className="font-semibold text-emerald-600 hover:underline">
              View All →
            </Link>
          </div>
        </div>

        {/* Customers */}
        <div className="kb-card-elevated p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Khata Buyers
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-slate-900 mt-3">
            {loading ? "—" : data?.customerCount}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Offline Store Customers</span>
            <Link href="/customers" className="font-semibold text-emerald-600 hover:underline">
              Manage Accounts →
            </Link>
          </div>
        </div>

        {/* Total Outstanding Udhaar */}
        <div className="kb-card-elevated p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
              Total Udhaar (Credit)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-rose-600 mt-3">
            {loading ? "—" : formatCurrency(data?.totalOutstanding || 0)}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pending Khata Balance</span>
            <Link href="/ledger?entryType=BILL_DEBIT" className="font-semibold text-rose-600 hover:underline">
              Audit Udhaar →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Settlement & Google Pay Status Pill */}
      <div className="kb-card-elevated p-5 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white border-blue-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
            G
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Google Pay for Business Hub &amp; UPI Dynamic QR</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.2 rounded font-semibold">
                NPCI Standard
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Real-time payment gateway attached to orders with 15-minute Dynamic QR and automated bahi-khata ledger crediting.
            </p>
          </div>
        </div>

        <Link
          href="/payments"
          className="kb-btn-gpay text-xs py-2 px-4 self-stretch sm:self-auto text-center shadow-sm hover:shadow-md"
        >
          <span>Open Google Pay Hub</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recent Counter Bills Table */}
      <div className="kb-card-elevated overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Recent Counter Bill Entries</span>
          </h3>
          <Link
            href="/ledger"
            className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
          >
            <span>View All in Khata</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading counter bills...</div>
          ) : !data || data.recentOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No bills recorded yet. Click &quot;New Counter Bill&quot; to create your first slip.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Customer &amp; Village</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3 text-center">Settlement Mode</th>
                  <th className="py-2.5 px-3 text-right">Bill Total (₹)</th>
                  <th className="py-2.5 px-3 text-center">Carbon Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{ord.orderNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-800">{ord.customerName}</div>
                      <div className="text-[11px] text-slate-400">
                        {ord.villageName} ({ord.customerCode})
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-500 whitespace-nowrap">
                      {formatDateTime(ord.orderDate)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
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
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <Link
                        href={`/reports/print/${ord.id}`}
                        target="_blank"
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 inline-flex"
                        title="Print 80mm Carbon Voucher"
                      >
                        <Printer className="w-4 h-4" />
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

