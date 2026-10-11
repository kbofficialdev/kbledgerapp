"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  FileText,
  Download,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface VillageStat {
  id: string;
  code: string;
  name: string;
  customerCount: number;
  orderCount: number;
  totalOutstanding: number;
}

export default function ReportsHubPage() {
  const [villages, setVillages] = useState<VillageStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/villages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVillages(data.villages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalOutstanding = villages.reduce((sum, v) => sum + v.totalOutstanding, 0);
  const totalCustomers = villages.reduce((sum, v) => sum + v.customerCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Printer className="w-6 h-6 text-emerald-600" />
            <span>Collection Reports &amp; Statements</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Village-wise ledger audits, daily collection tallies, and carbon print slips.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="kb-btn-secondary text-xs sm:text-sm py-2 px-3 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Print Summary Sheet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Territories Covered</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{villages.length} Villages</p>
        </div>

        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Khata Account Holders</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalCustomers} Buyers</p>
        </div>

        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Total Shop Udhaar Outstanding</p>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* Village-Wise Collection & Credit Breakdown */}
      <div className="kb-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Village Route Summary &amp; Collection Sheet</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Territory Audit</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading report data...</div>
          ) : villages.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No village territories registered yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Village Code</th>
                  <th className="py-2.5 px-3">Village Name</th>
                  <th className="py-2.5 px-3 text-center">Customers</th>
                  <th className="py-2.5 px-3 text-center">Total Bills</th>
                  <th className="py-2.5 px-3 text-right text-rose-600 font-bold">Outstanding Udhaar</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {villages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-700">{v.code}</td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">{v.name}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{v.customerCount}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{v.orderCount}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 tabular-nums text-sm">
                      {formatCurrency(v.totalOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <Link
                        href={`/customers?villageId=${v.id}`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Customer Slips</span>
                        <ArrowRight className="w-3 h-3" />
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

