"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LedgerRecord {
  id: string;
  entryDate: string;
  entryType: "BILL_DEBIT" | "PAYMENT_CREDIT" | "ADJUSTMENT";
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerCode: string;
  villageName: string;
  villageCode: string;
  orderNumber?: string;
  paymentType?: string;
}

interface Village {
  id: string;
  name: string;
  code: string;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerRecord[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [summary, setSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    netDifference: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [entryType, setEntryType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Load villages
  useEffect(() => {
    fetch("/api/villages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVillages(data.villages);
      })
      .catch(console.error);
  }, []);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedVillageId) params.set("villageId", selectedVillageId);
      if (entryType) params.set("entryType", entryType);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedVillageId, entryType, startDate, endDate]);

  const setDatePreset = (preset: "today" | "week" | "month" | "clear") => {
    const now = new Date();
    if (preset === "clear") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const todayStr = now.toISOString().slice(0, 10);
    setEndDate(todayStr);

    if (preset === "today") {
      setStartDate(todayStr);
    } else if (preset === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
    } else if (preset === "month") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>Master Bahi-Khata Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit-grade double-entry transaction journal with multi-dimensional filtering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="kb-btn-secondary text-xs sm:text-sm py-2 px-3"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Ledger Sheet</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Banner for the active filter */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Transactions</p>
          <p className="text-xl font-bold text-slate-900 font-mono mt-1">{summary.count}</p>
        </div>

        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Total Debit (Bills / Udhaar)</p>
          <p className="text-xl font-bold text-rose-600 font-mono mt-1">{formatCurrency(summary.totalDebit)}</p>
        </div>

        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Credit (Collections / Jama)</p>
          <p className="text-xl font-bold text-emerald-600 font-mono mt-1">{formatCurrency(summary.totalCredit)}</p>
        </div>

        <div className="kb-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Period Balance</p>
          <p className="text-xl font-bold text-slate-800 font-mono mt-1">{formatCurrency(summary.netDifference)}</p>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="kb-card p-5 space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Universal Search (Name, Mobile, Code, Email) */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Customer, Mobile, Code, or Bill #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="kb-input pl-10"
            />
          </div>

          {/* Village Filter */}
          <div>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="kb-input"
            >
              <option value="">All Villages &amp; Territories</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>

          {/* Entry Type Filter */}
          <div>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="kb-input"
            >
              <option value="">All Entry Types (Debit &amp; Credit)</option>
              <option value="BILL_DEBIT">Bill Debits (Udhaar)</option>
              <option value="PAYMENT_CREDIT">Payment Credits (Jama)</option>
              <option value="ADJUSTMENT">Opening Balance Adjustments</option>
            </select>
          </div>
        </div>

        {/* Date Filter & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDatePreset("today")}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset("week")}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset("month")}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Last 30 Days
            </button>
            {(startDate || endDate || selectedVillageId || entryType || search) && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedVillageId("");
                  setEntryType("");
                  setDatePreset("clear");
                }}
                className="text-xs text-rose-600 hover:underline font-semibold ml-2"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Journal Table */}
      <div className="kb-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Khata Journal Entries</h3>
          <span className="text-xs text-slate-400 font-mono">{entries.length} records shown</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading journal entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No transactions match the selected filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Customer &amp; Village</th>
                  <th className="py-2.5 px-3">Transaction Particulars</th>
                  <th className="py-2.5 px-3 text-right text-rose-600">Debit (Udhaar)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600">Credit (Jama)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-slate-600 font-sans whitespace-nowrap">
                      {formatDateTime(entry.entryDate)}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-900">{entry.customerName}</div>
                      <div className="text-[11px] text-slate-400">
                        {entry.villageName} ({entry.customerCode}) • {entry.customerMobile}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-700 max-w-md">
                      <div className="line-clamp-2">{entry.description}</div>
                      {entry.orderNumber && (
                        <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                          Invoice #{entry.orderNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-rose-600 font-bold tabular-nums">
                      {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "—"}
                    </td>

                    <td className="py-3 px-3 text-right text-emerald-600 font-bold tabular-nums">
                      {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "—"}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrency(entry.runningBalance)}
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
