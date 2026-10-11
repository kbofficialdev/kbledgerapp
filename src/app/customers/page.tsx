"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  IndianRupee,
  Receipt,
  BookOpen,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  address?: string;
  villageId: string;
  villageName: string;
  villageCode: string;
  creditLimit: number;
  currentBalance: number;
  notes?: string;
  orderCount: number;
  paymentCount: number;
  createdAt: string;
}

interface VillageOption {
  id: string;
  name: string;
  code: string;
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const initialVillageId = searchParams.get("villageId") || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState(initialVillageId);
  const [balanceFilter, setBalanceFilter] = useState<"all" | "with_balance" | "zero_balance">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    villageId: initialVillageId,
    name: "",
    mobile: "",
    altMobile: "",
    email: "",
    address: "",
    creditLimit: "0",
    initialBalance: "0",
    notes: "",
  });

  // Fetch villages for dropdown
  useEffect(() => {
    fetch("/api/villages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVillages(data.villages);
          if (!formData.villageId && data.villages.length > 0) {
            setFormData((prev) => ({ ...prev, villageId: data.villages[0].id }));
          }
        }
      })
      .catch(console.error);
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedVillageId) params.set("villageId", selectedVillageId);
      if (balanceFilter !== "all") params.set("filter", balanceFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedVillageId, balanceFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.villageId) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Customer account created for "${formData.name}" (Code: ${data.customer.customerCode})!`,
        });
        setFormData({
          villageId: villages[0]?.id || "",
          name: "",
          mobile: "",
          altMobile: "",
          email: "",
          address: "",
          creditLimit: "0",
          initialBalance: "0",
          notes: "",
        });
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to create customer" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Khata Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Offline store buyers organized by village territory with live credit tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback(null);
            setIsModalOpen(true);
          }}
          className="kb-btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Customer</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-Dimensional Filters Bar */}
      <div className="kb-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Customer Name, Mobile Number, Code, or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="kb-input pl-10"
            />
          </div>

          {/* Village Filter Dropdown */}
          <div className="w-full md:w-64">
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="kb-input font-medium cursor-pointer"
            >
              <option value="">All Villages &amp; Routes</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Balance Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                onClick={() => setBalanceFilter("all")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  balanceFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Accounts ({customers.length})
              </button>
              <button
                onClick={() => setBalanceFilter("with_balance")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  balanceFilter === "with_balance"
                    ? "bg-white text-rose-700 shadow-xs"
                    : "text-slate-500 hover:text-rose-600"
                }`}
              >
                Pending Udhaar
              </button>
              <button
                onClick={() => setBalanceFilter("zero_balance")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  balanceFilter === "zero_balance"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                Cleared (₹0)
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Filtered Outstanding: <span className="font-bold text-rose-600 text-sm">{formatCurrency(totalOutstanding)}</span>
          </div>
        </div>
      </div>

      {/* Customer Accounts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="kb-card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="kb-card p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Customers Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {search || selectedVillageId || balanceFilter !== "all"
              ? "No customer accounts match the selected filters."
              : "Register your first offline customer to start creating counter bills and maintaining bahi-khata records."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="kb-btn-primary mx-auto text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Customer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="kb-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                {/* Header: Name & Code */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                    >
                      {c.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80">
                        {c.customerCode}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.villageName}
                      </span>
                    </div>
                  </div>

                  {/* Balance Tag */}
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Balance</p>
                    <p
                      className={`text-base font-bold font-mono tabular-nums ${
                        c.currentBalance > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(c.currentBalance)}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-mono">{c.mobile}</span>
                    {c.altMobile && <span className="text-slate-400 font-mono">/ {c.altMobile}</span>}
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/customers/${c.id}`}
                  className="font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ledger ({c.orderCount} bills)</span>
                </Link>

                <Link
                  href={`/orders/new?customerId=${c.id}&villageId=${c.villageId}`}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>New Bill</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Register Customer Khata Account</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Village / Route Territory <span className="text-rose-500">*</span>
                </label>
                {villages.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No villages registered yet. Please create a village profile first.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.villageId}
                    onChange={(e) => setFormData({ ...formData, villageId: e.target.value })}
                    className="kb-input"
                  >
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gowda, Suresh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="kb-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="kb-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Alternative Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Alternate contact"
                    value={formData.altMobile}
                    onChange={(e) => setFormData({ ...formData, altMobile: e.target.value })}
                    className="kb-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="kb-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Address / House Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Temple, House #42, Main Road"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="kb-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="0 = No strict limit"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="kb-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
                    Book Udhaar Opening (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Migrate old book balance"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                    className="kb-input font-mono border-rose-200 focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Carried forward from paper bahi-khata.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Shopkeeper Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Buys farm fertilizer in bulk, clears dues monthly"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="kb-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="kb-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim() || !formData.mobile.trim() || !formData.villageId}
                  className="kb-btn-primary"
                >
                  {submitting ? "Registering..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading customer directory...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
