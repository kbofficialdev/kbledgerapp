"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  Search,
  Filter,
  MapPin,
  Users,
  Calendar,
  Printer,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  IndianRupee,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrderRecord {
  id: string;
  orderNumber: string;
  orderDate: string;
  villageId: string;
  villageName: string;
  villageCode: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: "DEBIT" | "CREDIT" | "PARTIAL";
  paymentStatus: string;
  notes?: string;
  items: Array<{
    id: string;
    customItemId: string;
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    lineTotal: number;
  }>;
}

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

function OrdersContent() {
  const searchParams = useSearchParams();
  const initVillage = searchParams.get("villageId") || "";
  const initCustomer = searchParams.get("customerId") || "";

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [villageFilter, setVillageFilter] = useState(initVillage);
  const [customerFilter, setCustomerFilter] = useState(initCustomer);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFiltersData = async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        fetch("/api/villages"),
        fetch("/api/customers"),
      ]);
      const vData = await vRes.json();
      const cData = await cRes.json();
      if (vData.success) setVillages(vData.villages);
      if (cData.success) setCustomers(cData.customers);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (villageFilter) params.set("villageId", villageFilter);
      if (customerFilter) params.set("customerId", customerFilter);
      if (paymentTypeFilter) params.set("paymentType", paymentTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [villageFilter, customerFilter, paymentTypeFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const resetFilters = () => {
    setVillageFilter("");
    setCustomerFilter("");
    setPaymentTypeFilter("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Filtered Aggregates
  const totalBilled = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalCredit = orders.reduce((sum, o) => sum + (o.creditAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Counter Bills &amp; Slips Archive</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter village-wise, customer-wise, date-wise, and print 80mm carbon receipts.
          </p>
        </div>

        <Link
          href="/orders/new"
          className="kb-btn-primary text-xs sm:text-sm py-2.5 px-4 shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Counter Bill (F2)</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Slips
          </span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            {loading ? "—" : orders.length}
          </p>
        </div>
        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Billed
          </span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            {loading ? "—" : formatCurrency(totalBilled)}
          </p>
        </div>
        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            Debit Collected
          </span>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {loading ? "—" : formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="kb-card-elevated p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">
            Udhaar Carried
          </span>
          <p className="text-2xl font-black font-mono text-rose-600 mt-1">
            {loading ? "—" : formatCurrency(totalCredit)}
          </p>
        </div>
      </div>

      {/* Search & Filtering Panel */}
      <div className="kb-card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Criteria</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Free text search bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Bill #, Customer Name, Mobile, Email, or Item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="kb-input pl-10 text-xs sm:text-sm"
            />
          </div>
          <button type="submit" className="kb-btn-primary text-xs py-2 px-4">
            Search
          </button>
        </form>

        {/* Multi-facet dropdown selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Village Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Village Territory
            </label>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="kb-input text-xs py-2"
            >
              <option value="">All Villages</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Customer Account
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="kb-input text-xs py-2"
            >
              <option value="">All Customers</option>
              {customers
                .filter((c) => !villageFilter || c.villageId === villageFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerCode})
                  </option>
                ))}
            </select>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Settlement Mode
            </label>
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="kb-input text-xs py-2"
            >
              <option value="">All Settlement Types</option>
              <option value="DEBIT">Debit (Paid in Full)</option>
              <option value="CREDIT">Credit (Full Udhaar)</option>
              <option value="PARTIAL">Partial Paid</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="kb-input text-xs py-2"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="kb-input text-xs py-2"
            />
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="kb-card-elevated overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recorded Bills Journal</h3>
          <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-full">
            {orders.length} Records Found
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin"></div>
              <span>Loading bill entries...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No bills match the selected filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Customer &amp; Village</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Items Summary</th>
                  <th className="py-2.5 px-3 text-center">Settlement</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                  <th className="py-2.5 px-3 text-right">Udhaar (₹)</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{ord.orderNumber}</span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Link
                        href={`/customers/${ord.customerId}`}
                        className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline block"
                      >
                        {ord.customerName}
                      </Link>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{ord.villageName}</span>
                        {ord.customerMobile && <span>• {ord.customerMobile}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-500 whitespace-nowrap">
                      {formatDateTime(ord.orderDate)}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600 max-w-xs truncate" title={ord.items.map((i) => `${i.name} (${i.quantity}${i.unit})`).join(", ")}>
                      {ord.items.map((i) => i.name).join(", ")}
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
                    <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                      {formatCurrency(ord.paidAmount)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-bold">
                      {formatCurrency(ord.creditAmount)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <Link
                        href={`/reports/print/${ord.id}`}
                        target="_blank"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 inline-flex transition-all"
                        title="Print 80mm Carbon Voucher"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading orders journal...</div>}>
      <OrdersContent />
    </Suspense>
  );
}

