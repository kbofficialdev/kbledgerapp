"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  Calendar,
  Filter,
  Users,
  MapPin,
  TrendingUp,
  Receipt,
  CreditCard,
  RotateCcw,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandReportsIcon } from "@/components/brand/BrandIcons";

interface Village {
  id: string;
  name: string;
  code: string;
}

interface Customer {
  id: string;
  name: string;
  customerCode: string;
  villageId: string;
}

interface LedgerRow {
  id: string;
  entryDate: string;
  entryType: "BILL_DEBIT" | "PAYMENT_CREDIT" | "ADJUSTMENT";
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
  customerName: string;
  customerCode: string;
  villageName: string;
  orderNumber?: string;
  paymentType?: string;
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [villages, setVillages] = useState<Village[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Filter States
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");

  // Records & Loading
  const [records, setRecords] = useState<LedgerRow[]>([]);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load initial dropdowns
  useEffect(() => {
    Promise.all([
      fetch("/api/villages").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ])
      .then(([vData, cData]) => {
        setVillages(vData.villages || []);
        setCustomers(cData.customers || []);
      })
      .catch(console.error);

    // Initial query for all time
    handleFetchReports("", "", "", "");
  }, []);

  const handlePresetSelect = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (preset === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (preset === "month") {
      const past = new Date();
      past.setDate(1); // 1st of current month
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleFetchReports = async (
    vId = selectedVillageId,
    cId = selectedCustomerId,
    start = startDate,
    end = endDate
  ) => {
    try {
      setLoading(true);
      setHasSearched(true);
      const params = new URLSearchParams();
      if (vId) params.set("villageId", vId);
      if (cId) params.set("customerId", cId);
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);

      const res = await fetch(`/api/reports/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.entries || []);
        setTotalDebit(data.totalDebit || 0);
        setTotalCredit(data.totalCredit || 0);
      }
    } catch (err) {
      console.error(err);
      toast.authError("Failed to generate ledger report", "Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);
  const selectedVillageObj = villages.find((v) => v.id === selectedVillageId);

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. FILTER & CONFIGURATION BANNER (HIDDEN IN PRINT) */}
      <div className="no-print space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-800 text-white p-6 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                <BrandReportsIcon className="w-3.5 h-3.5 text-cyan-400" />
                Carbon Dot-Matrix Engine
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Ledger Statement & Report Generation
              </h1>
              <p className="text-xs text-slate-300 max-w-xl">
                Filter by any village territory, specific customer, or date range. Output in dot-matrix format with pure print isolation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/reports/village-collection"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
              >
                <BrandReportsIcon className="w-4 h-4 text-emerald-400" />
                <span>Village Field Sheet & Excel</span>
              </Link>

              <button
                onClick={handlePrint}
                disabled={records.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>Print Carbon Statement</span>
              </button>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Village Filter */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                Filter Village
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => {
                  setSelectedVillageId(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="">All Village Territories</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                Filter Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="">All Registered Customers</option>
                {customers
                  .filter((c) => !selectedVillageId || c.villageId === selectedVillageId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode})
                    </option>
                  ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Quick Presets & Submit */}
          <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Range:</span>
              <button
                type="button"
                onClick={() => handlePresetSelect("today")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  datePreset === "today"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect("7days")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  datePreset === "7days"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect("month")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  datePreset === "month"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  datePreset === "all"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                All Time
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleFetchReports()}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-slate-100 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>{loading ? "Generating..." : "Apply Filters"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Aggregated Totals Bar (Web View) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Bills Billed (Debit)
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(totalDebit)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Sales placed on ledger
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Total Payments Received (Credit)
            </span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {formatCurrency(totalCredit)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Cash & Online collections
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Net Udhaar Balance Delta
            </span>
            <div
              className={`text-xl font-black mt-1 ${
                totalDebit - totalCredit > 0 ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
              <span className="text-xs font-semibold ml-1">
                {totalDebit - totalCredit > 0 ? "(Debt Increased)" : "(Debt Reduced)"}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {records.length} transactions in range
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUSTOM DESIGN TABLE FOR DUMPED DATABASE RECORDS (WEB SCREEN VIEW) */}
      <div className="no-print rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Query Result: {records.length} Ledger Transactions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: {selectedCustomerObj ? selectedCustomerObj.name : "All Customers"} •{" "}
              {selectedVillageObj ? selectedVillageObj.name : "All Villages"}
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Territory</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Particulars / Memo</th>
                <th className="py-3 px-4 text-right">Debit (Bill)</th>
                <th className="py-3 px-4 text-right">Credit (Paid)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length > 0 ? (
                records.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {formatDateTime(row.entryDate)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">{row.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{row.customerCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700">
                        {row.villageName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.entryType === "BILL_DEBIT"
                            ? "bg-blue-100 text-blue-800"
                            : row.entryType === "PAYMENT_CREDIT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {row.entryType === "BILL_DEBIT"
                          ? "BILL DEBIT"
                          : row.entryType === "PAYMENT_CREDIT"
                          ? "PAYMENT"
                          : "ADJUSTMENT"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      {row.debitAmount > 0 ? formatCurrency(row.debitAmount) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-700">
                      {row.creditAmount > 0 ? formatCurrency(row.creditAmount) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-black text-rose-600">
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    {loading ? "Fetching ledger records from database..." : "No records found for specified filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. STRICT CARBON DOT-MATRIX PRINT VIEW (ONLY THIS IS VISIBLE ON PRINT) */}
      <div className="hidden print:block">
        <div className="carbon-receipt-print-area w-full font-mono text-black text-xs space-y-4">
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-dashed border-black space-y-1">
            <h1 className="text-base font-black tracking-widest uppercase">
              KB FASHIONS & TEXTILES — BAHI-KHATA LEDGER
            </h1>
            <p className="text-[11px] font-bold">OFFICIAL TERRITORY STATEMENT AUDIT</p>
            <p className="text-[10px]">
              Territory: {selectedVillageObj ? selectedVillageObj.name : "ALL VILLAGES"} | Customer:{" "}
              {selectedCustomerObj ? `${selectedCustomerObj.name} (${selectedCustomerObj.customerCode})` : "ALL ACCOUNTS"}
            </p>
            <p className="text-[10px]">
              Period: {startDate ? formatDate(startDate) : "Beginning"} TO{" "}
              {endDate ? formatDate(endDate) : "Present"} | Generated: {formatDateTime(new Date())}
            </p>
          </div>

          {/* Monospace Statement Table */}
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black font-bold uppercase">
                <th className="py-1">DATE</th>
                <th className="py-1">CUSTOMER</th>
                <th className="py-1">VILLAGE</th>
                <th className="py-1">PARTICULARS</th>
                <th className="py-1 text-right">DEBIT(Rs)</th>
                <th className="py-1 text-right">CREDIT(Rs)</th>
                <th className="py-1 text-right">BALANCE(Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-black">
              {records.map((r, i) => (
                <tr key={i} className="py-0.5">
                  <td className="py-1 whitespace-nowrap">{formatDate(r.entryDate)}</td>
                  <td className="py-1 font-bold whitespace-nowrap">{r.customerName}</td>
                  <td className="py-1">{r.villageName}</td>
                  <td className="py-1 truncate max-w-xs">{r.description}</td>
                  <td className="py-1 text-right font-mono">
                    {r.debitAmount > 0 ? r.debitAmount.toFixed(2) : "-"}
                  </td>
                  <td className="py-1 text-right font-mono">
                    {r.creditAmount > 0 ? r.creditAmount.toFixed(2) : "-"}
                  </td>
                  <td className="py-1 text-right font-mono font-bold">
                    {r.runningBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Statement Summary & Signatures */}
          <div className="pt-3 border-t-2 border-dashed border-black space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span>TOTAL BILLED (DEBIT):</span>
              <span className="font-bold">{formatCurrency(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span>TOTAL COLLECTED (CREDIT):</span>
              <span className="font-bold">{formatCurrency(totalCredit)}</span>
            </div>
            <div className="flex justify-between font-black text-xs border-t border-black pt-1">
              <span>NET STATEMENT OUTSTANDING DELTA:</span>
              <span>{formatCurrency(totalDebit - totalCredit)}</span>
            </div>
          </div>

          <div className="pt-10 flex justify-between items-end text-[11px]">
            <div className="text-center">
              <div className="w-40 border-t border-black pt-1 font-bold">
                AUDITOR / ACCOUNTS
              </div>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-black pt-1 font-bold">
                AUTHORIZED STORE STAMP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

