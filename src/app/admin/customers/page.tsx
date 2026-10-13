"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  MapPin,
  Plus,
  Search,
  Phone,
  Receipt,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Building,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandCustomersIcon, BrandBillingIcon } from "@/components/brand/BrandIcons";

interface Village {
  id: string;
  name: string;
  code: string;
  customerCount?: number;
}

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  email?: string | null;
  villageId: string;
  villageName?: string;
  villageCode?: string;
  currentBalance: number;
  creditLimit: number;
  orderCount?: number;
  paymentCount?: number;
}

function CombinedCustomersContent() {
  const searchParams = useSearchParams();
  const queryVillage = searchParams.get("villageId") || "";
  const { toast } = useToast();

  const [villages, setVillages] = useState<Village[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVillageId, setSelectedVillageId] = useState<string>(queryVillage);
  const [search, setSearch] = useState<string>("");
  const [debtFilter, setDebtFilter] = useState<"all" | "has_debt" | "zero_debt">("all");

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [custForm, setCustForm] = useState({
    villageId: "",
    name: "",
    mobile: "",
    email: "",
    creditLimit: "5000",
    initialBalance: "0",
  });

  const [villageForm, setVillageForm] = useState({
    name: "",
    code: "",
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        fetch("/api/villages").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
      ]);

      const vList = vRes.villages || [];
      const cList = cRes.customers || [];

      // Annotate villages with customer count
      const annotatedVillages = vList.map((v: any) => ({
        ...v,
        customerCount: cList.filter((c: any) => c.villageId === v.id).length,
      }));

      setVillages(annotatedVillages);
      setCustomers(cList);

      if (!custForm.villageId && vList.length > 0) {
        setCustForm((prev) => ({ ...prev, villageId: vList[0].id }));
      }
    } catch (err) {
      toast.authError("Failed to load customer & village directory", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter((cust) => {
    const matchesVillage = !selectedVillageId || cust.villageId === selectedVillageId;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      cust.name.toLowerCase().includes(query) ||
      cust.customerCode.toLowerCase().includes(query) ||
      cust.mobile.includes(query);

    let matchesDebt = true;
    if (debtFilter === "has_debt") matchesDebt = cust.currentBalance > 0;
    if (debtFilter === "zero_debt") matchesDebt = cust.currentBalance <= 0;

    return matchesVillage && matchesSearch && matchesDebt;
  });

  // Calculate high-level metrics
  const totalLedgerDebt = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const customersWithDebtCount = customers.filter((c) => c.currentBalance > 0).length;

  // Handle Add Customer Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim() || !custForm.mobile.trim() || !custForm.villageId) {
      toast.authError("Name, Mobile number, and Village are required.", "Validation Error");
      return;
    }

    const cleanMobile = custForm.mobile.trim().replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      toast.authError("Please enter a valid 10-digit mobile number.", "Invalid Mobile");
      return;
    }

    // Client-side instant duplicate check against loaded customer list
    const dupMobile = customers.find((c) => c.mobile.replace(/\D/g, "") === cleanMobile);
    if (dupMobile) {
      toast.authError(
        `Mobile ${cleanMobile} is already registered with customer "${dupMobile.name}" (${dupMobile.customerCode}). Duplicate mobile numbers are not allowed.`,
        "Duplicate Mobile"
      );
      return;
    }

    const cleanEmail = custForm.email.trim().toLowerCase();
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        toast.authError("Please enter a valid email address format (e.g. name@domain.com).", "Invalid Email");
        return;
      }

      const dupEmail = customers.find((c) => c.email && c.email.toLowerCase() === cleanEmail);
      if (dupEmail) {
        toast.authError(
          `Email address "${cleanEmail}" is already registered with customer "${dupEmail.name}" (${dupEmail.customerCode}). Duplicate emails are not allowed.`,
          "Duplicate Email"
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: custForm.villageId,
          name: custForm.name.trim(),
          mobile: cleanMobile,
          email: cleanEmail || undefined,
          creditLimit: parseFloat(custForm.creditLimit) || 0,
          initialBalance: parseFloat(custForm.initialBalance) || 0,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to register customer");

      toast.authSuccess(`Customer ${custForm.name} registered successfully!`, "Created");
      setIsCustomerModalOpen(false);
      setCustForm({
        villageId: villages[0]?.id || "",
        name: "",
        mobile: "",
        email: "",
        creditLimit: "5000",
        initialBalance: "0",
      });
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Creation Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Village Submit
  const handleCreateVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageForm.name.trim() || !villageForm.code.trim()) {
      toast.authError("Village Name and Code are required.", "Validation Error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/villages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: villageForm.name.trim(),
          code: villageForm.code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create village");

      toast.authSuccess(`Village territory ${villageForm.name} added!`, "Created");
      setIsVillageModalOpen(false);
      setVillageForm({ name: "", code: "" });
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Creation Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. WELCOME BANNER WITH COMBINED METRICS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-slate-900 to-neutral-800 text-white p-6 sm:p-7 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <BrandCustomersIcon className="w-3.5 h-3.5 text-purple-400" />
              Unified Territory & Ledger Directory
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Customers & Village Territories
            </h1>
            <p className="text-xs text-slate-300 max-w-lg">
              Manage all rural customers, village credit limits, and real-time Bahi-Khata balances across regions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-100 font-bold text-xs transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>
            <button
              onClick={() => setIsVillageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
            >
              <MapPin className="w-4 h-4" />
              <span>+ Add Village</span>
            </button>
          </div>
        </div>

        {/* Banner Quick KPIs */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Total Customers</span>
            <span className="font-bold text-slate-200 text-sm">{customers.length} Accounts</span>
          </div>
          <div>
            <span className="text-slate-400 block">Covered Villages</span>
            <span className="font-bold text-purple-300 text-sm">{villages.length} Territories</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Udhaar Debt</span>
            <span className="font-bold text-rose-400 text-sm">{formatCurrency(totalLedgerDebt)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Active Debtors</span>
            <span className="font-bold text-amber-300 text-sm">
              {customersWithDebtCount} of {customers.length} ({Math.round((customersWithDebtCount / (customers.length || 1)) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. VILLAGE TERRITORY SELECTOR PILLS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            Filter by Village Territory:
          </span>
          {selectedVillageId && (
            <button
              onClick={() => setSelectedVillageId("")}
              className="text-purple-700 hover:text-purple-900 underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedVillageId("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedVillageId === ""
                ? "bg-black text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>All Villages</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {customers.length}
            </span>
          </button>

          {villages.map((vil) => (
            <button
              key={vil.id}
              onClick={() => setSelectedVillageId(vil.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedVillageId === vil.id
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{vil.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {vil.customerCount || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. SEARCH & BALANCE FILTER CONTROLS */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, code (CUST-...), or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDebtFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              debtFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setDebtFilter("has_debt")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              debtFilter === "has_debt"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Has Udhaar ({customersWithDebtCount})
          </button>
          <button
            onClick={() => setDebtFilter("zero_debt")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              debtFilter === "zero_debt"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Clear Balance ({customers.length - customersWithDebtCount})
          </button>
        </div>
      </div>

      {/* 4. CUSTOMER DIRECTORY LIST / TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Village Territory</th>
                <th className="py-3.5 px-4">Mobile Contact</th>
                <th className="py-3.5 px-4 text-right">Credit Limit</th>
                <th className="py-3.5 px-4 text-right">Current Udhaar Debt</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={c.name} size="md" />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{c.customerCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <MapPin className="w-3 h-3" />
                        {c.villageName || "General Territory"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {c.mobile}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                      {formatCurrency(c.creditLimit)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          c.currentBalance > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(c.currentBalance)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          c.currentBalance > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {c.currentBalance > 0 ? "DUE" : "NIL"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/billing?customerId=${c.id}&villageId=${c.villageId}`}
                          className="px-2.5 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <BrandBillingIcon className="w-3.5 h-3.5" />
                          <span>Bill</span>
                        </Link>
                        <Link
                          href={`/customers/${c.id}`}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                        >
                          Ledger
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                    {loading ? "Loading customer ledger..." : "No customers found matching criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Register New Customer
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Village Territory *
                </label>
                <select
                  value={custForm.villageId}
                  onChange={(e) => setCustForm({ ...custForm, villageId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  required
                >
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={custForm.mobile}
                  onChange={(e) => setCustForm({ ...custForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Email (for Customer Portal OTP Login)
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={custForm.creditLimit}
                    onChange={(e) => setCustForm({ ...custForm, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Initial Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={custForm.initialBalance}
                    onChange={(e) => setCustForm({ ...custForm, initialBalance: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD VILLAGE MODAL */}
      {isVillageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Add New Village Territory
              </h3>
              <button
                onClick={() => setIsVillageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVillage} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Village Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rampur, Shivpuri"
                  value={villageForm.name}
                  onChange={(e) => setVillageForm({ ...villageForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Village Territory Code (3 Letters) *
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. RMP, SHV"
                  value={villageForm.code}
                  onChange={(e) => setVillageForm({ ...villageForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVillageModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Territory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CombinedCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CombinedCustomersContent />
    </Suspense>
  );
}

