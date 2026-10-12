"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Calendar,
  Printer,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/ui/Table";

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
      <PageHeader
        title="Master Bahi-Khata Ledger"
        description="Audit-grade double-entry transaction journal with multi-dimensional filtering."
        actions={
          <Button
            variant="outline"
            size="md"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print Ledger Sheet
          </Button>
        }
      />

      {/* Aggregate KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total Transactions"
          value={loading ? "—" : summary.count}
          icon={FileSpreadsheet}
          variant="slate"
        />
        <MetricCard
          label="Total Debit (Bills / Udhaar)"
          value={loading ? "—" : formatCurrency(summary.totalDebit)}
          icon={TrendingUp}
          variant="rose"
        />
        <MetricCard
          label="Total Credit (Collections / Jama)"
          value={loading ? "—" : formatCurrency(summary.totalCredit)}
          icon={CreditCard}
          variant="emerald"
        />
        <MetricCard
          label="Net Period Balance"
          value={loading ? "—" : formatCurrency(summary.netDifference)}
          icon={BookOpen}
          variant="blue"
        />
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <Card className="p-4 space-y-3 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Universal Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Customer, Mobile, Code, or Bill #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Village Filter */}
          <div>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
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
              className="w-full h-9 px-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
            >
              <option value="">All Entry Types (Debit &amp; Credit)</option>
              <option value="BILL_DEBIT">Bill Debits (Udhaar)</option>
              <option value="PAYMENT_CREDIT">Payment Credits (Jama)</option>
              <option value="ADJUSTMENT">Opening Balance Adjustments</option>
            </select>
          </div>
        </div>

        {/* Date Filter & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 dark:border-zinc-800 rounded-md text-xs text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2.5 border border-slate-200 dark:border-zinc-800 rounded-md text-xs text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setDatePreset("today")}
              className="px-2.5 py-1 rounded text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset("week")}
              className="px-2.5 py-1 rounded text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset("month")}
              className="px-2.5 py-1 rounded text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
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
                className="text-xs text-rose-600 hover:underline font-medium ml-2"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Ledger Journal Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Khata Journal Entries</h3>
          <Badge variant="neutral">
            {entries.length} records shown
          </Badge>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
            Loading journal entries...
          </div>
        ) : entries.length === 0 ? (
          <TableEmptyState
            colSpan={6}
            title="No transactions match filter criteria"
            description="Adjust your search filters or clear dates to inspect all journal entries."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Customer &amp; Village</TableHead>
                <TableHead>Transaction Particulars</TableHead>
                <TableHead className="text-right text-rose-600 dark:text-rose-400">Debit (Udhaar)</TableHead>
                <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Credit (Jama)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-slate-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                    {formatDateTime(entry.entryDate)}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-zinc-100 text-xs">{entry.customerName}</div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {entry.villageName} ({entry.customerCode}) • {entry.customerMobile}
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-700 dark:text-zinc-300 max-w-md text-xs">
                    <div className="line-clamp-2">{entry.description}</div>
                    {entry.orderNumber && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                        Invoice #{entry.orderNumber}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right text-rose-600 dark:text-rose-400 font-bold tabular-nums text-xs font-mono">
                    {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "—"}
                  </TableCell>

                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums text-xs font-mono">
                    {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "—"}
                  </TableCell>

                  <TableCell className="text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums text-xs font-mono">
                    {formatCurrency(entry.runningBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
