"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  MapPin,
  Plus,
  Search,
  X,
  Edit3,
  Ban,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandCustomersIcon, BrandBillingIcon } from "@/components/brand/BrandIcons";

interface Village {
  id: string;
  name: string;
  code: string;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
  customerCount?: number;
}

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  villageId: string;
  villageName?: string;
  villageCode?: string;
  currentBalance: number;
  creditLimit: number;
  isActive: boolean;
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
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "BLACKLISTED" | "ALL">("ACTIVE");

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Customer Form
  const [custForm, setCustForm] = useState({
    villageId: "",
    name: "",
    mobile: "",
    altMobile: "",
    email: "",
    address: "",
    creditLimit: "5000",
    initialBalance: "0",
    notes: "",
  });

  // Edit Customer Form
  const [editCustForm, setEditCustForm] = useState({
    villageId: "",
    name: "",
    mobile: "",
    altMobile: "",
    email: "",
    address: "",
    creditLimit: "5000",
    notes: "",
  });

  // Add Village Form
  const [villageForm, setVillageForm] = useState({
    name: "",
    code: "",
    taluka: "",
    district: "",
    state: "Telangana",
    pincode: "",
    notes: "",
  });

  // Edit Village Form
  const [editVillageForm, setEditVillageForm] = useState({
    name: "",
    code: "",
    taluka: "",
    district: "",
    state: "",
    pincode: "",
    notes: "",
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        fetch("/api/villages").then((r) => r.json()),
        fetch("/api/customers?status=all").then((r) => r.json()),
      ]);

      const vList: Village[] = vRes.villages || [];
      const cList: Customer[] = cRes.customers || [];

      const annotatedVillages = vList.map((v) => ({
        ...v,
        customerCount: cList.filter((c) => c.villageId === v.id && c.isActive !== false).length,
      }));

      setVillages(annotatedVillages);
      setCustomers(cList);

      if (!custForm.villageId && vList.length > 0) {
        setCustForm((prev) => ({ ...prev, villageId: vList[0].id }));
      }
    } catch {
      toast.authError("Failed to load customer & village directory", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const activeCustomersList = customers.filter((c) => c.isActive !== false);
  const blacklistedCustomersList = customers.filter((c) => c.isActive === false);

  // Filter customers
  const filteredCustomers = customers.filter((cust) => {
    if (statusFilter === "ACTIVE" && cust.isActive === false) return false;
    if (statusFilter === "BLACKLISTED" && cust.isActive !== false) return false;

    const matchesVillage = !selectedVillageId || cust.villageId === selectedVillageId;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      cust.name.toLowerCase().includes(query) ||
      cust.customerCode.toLowerCase().includes(query) ||
      cust.mobile.includes(query) ||
      (cust.email && cust.email.toLowerCase().includes(query));

    let matchesDebt = true;
    if (debtFilter === "has_debt") matchesDebt = cust.currentBalance > 0;
    if (debtFilter === "zero_debt") matchesDebt = cust.currentBalance <= 0;

    return matchesVillage && matchesSearch && matchesDebt;
  });

  // High-level metrics (computed from active accounts so ledgers match)
  const totalLedgerDebt = activeCustomersList.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const customersWithDebtCount = activeCustomersList.filter((c) => c.currentBalance > 0).length;

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

    const dupMobile = customers.find((c) => c.mobile.replace(/\D/g, "") === cleanMobile);
    if (dupMobile) {
      toast.authError(
        `Mobile ${cleanMobile} is already registered with customer "${dupMobile.name}" (${dupMobile.customerCode}).`,
        "Duplicate Mobile"
      );
      return;
    }

    const cleanEmail = custForm.email.trim().toLowerCase();
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        toast.authError("Please enter a valid email address format.", "Invalid Email");
        return;
      }

      const dupEmail = customers.find((c) => c.email && c.email.toLowerCase() === cleanEmail);
      if (dupEmail) {
        toast.authError(
          `Email "${cleanEmail}" is already registered with customer "${dupEmail.name}".`,
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
          altMobile: custForm.altMobile.trim() || undefined,
          email: cleanEmail || undefined,
          address: custForm.address.trim() || undefined,
          creditLimit: parseFloat(custForm.creditLimit) || 0,
          initialBalance: parseFloat(custForm.initialBalance) || 0,
          notes: custForm.notes.trim() || undefined,
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
        altMobile: "",
        email: "",
        address: "",
        creditLimit: "5000",
        initialBalance: "0",
        notes: "",
      });
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Creation Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Customer Modal
  const openEditCustomerModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCustForm({
      villageId: cust.villageId,
      name: cust.name,
      mobile: cust.mobile,
      altMobile: cust.altMobile || "",
      email: cust.email || "",
      address: cust.address || "",
      creditLimit: String(cust.creditLimit ?? 5000),
      notes: cust.notes || "",
    });
  };

  // Handle Update Customer Submit
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editCustForm.name.trim() || !editCustForm.mobile.trim() || !editCustForm.villageId) {
      toast.authError("Name, Mobile number, and Village are required.", "Validation Error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: editCustForm.villageId,
          name: editCustForm.name.trim(),
          mobile: editCustForm.mobile.trim(),
          altMobile: editCustForm.altMobile.trim() || null,
          email: editCustForm.email.trim() || null,
          address: editCustForm.address.trim() || null,
          creditLimit: parseFloat(editCustForm.creditLimit) || 0,
          notes: editCustForm.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update customer profile");

      toast.authSuccess(`Customer profile "${editCustForm.name}" updated!`, "Profile Updated");
      setEditingCustomer(null);
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Update Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Blacklist / Disable or Re-Activate Customer
  const handleToggleBlacklistCustomer = async (cust: Customer) => {
    const willBlacklist = cust.isActive !== false;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/customers/${cust.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: willBlacklist ? "BLACKLIST" : "ACTIVATE",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update account status");

      toast.authSuccess(
        data.message ||
          (willBlacklist
            ? `Customer "${cust.name}" blacklisted & disabled.`
            : `Customer "${cust.name}" re-activated.`),
        willBlacklist ? "Account Blacklisted" : "Account Activated"
      );
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Status Change Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Permanent Delete Customer
  const handleConfirmDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete customer");

      toast.authSuccess(
        data.message || `Customer "${deletingCustomer.name}" permanently deleted.`,
        "Deleted Permanently"
      );
      setDeletingCustomer(null);
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Deletion Failed");
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
          taluka: villageForm.taluka.trim() || undefined,
          district: villageForm.district.trim() || undefined,
          state: villageForm.state.trim() || undefined,
          pincode: villageForm.pincode.trim() || undefined,
          notes: villageForm.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create village");

      toast.authSuccess(`Village territory ${villageForm.name} added!`, "Created");
      setIsVillageModalOpen(false);
      setVillageForm({
        name: "",
        code: "",
        taluka: "",
        district: "",
        state: "Telangana",
        pincode: "",
        notes: "",
      });
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Creation Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Village Modal
  const openEditVillageModal = (vil: Village) => {
    setEditingVillage(vil);
    setEditVillageForm({
      name: vil.name,
      code: vil.code,
      taluka: vil.taluka || "",
      district: vil.district || "",
      state: vil.state || "Telangana",
      pincode: vil.pincode || "",
      notes: vil.notes || "",
    });
  };

  // Handle Update Village Submit
  const handleUpdateVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVillage) return;
    if (!editVillageForm.name.trim() || !editVillageForm.code.trim()) {
      toast.authError("Village Name and Code are required.", "Validation Error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/villages/${editingVillage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editVillageForm.name.trim(),
          code: editVillageForm.code.trim().toUpperCase(),
          taluka: editVillageForm.taluka.trim() || null,
          district: editVillageForm.district.trim() || null,
          state: editVillageForm.state.trim() || null,
          pincode: editVillageForm.pincode.trim() || null,
          notes: editVillageForm.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update village");

      toast.authSuccess(`Village "${editVillageForm.name}" updated successfully!`, "Village Updated");
      setEditingVillage(null);
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Update Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Village
  const handleDeleteVillage = async () => {
    if (!editingVillage) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/villages/${editingVillage.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete village");

      toast.authSuccess(data.message || "Village deleted.", "Village Deleted");
      if (selectedVillageId === editingVillage.id) {
        setSelectedVillageId("");
      }
      setEditingVillage(null);
      loadAllData();
    } catch (err: any) {
      toast.authError(err.message, "Cannot Delete Village");
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
              Edit customer & village profiles, manage credit limits, blacklist/disable accounts, or permanently delete records.
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
            <span className="text-slate-400 block">Active Customers</span>
            <span className="font-bold text-slate-200 text-sm">{activeCustomersList.length} Active</span>
          </div>
          <div>
            <span className="text-slate-400 block">Covered Villages</span>
            <span className="font-bold text-purple-300 text-sm">{villages.length} Territories</span>
          </div>
          <div>
            <span className="text-slate-400 block">Active Udhaar Debt</span>
            <span className="font-bold text-rose-400 text-sm">{formatCurrency(totalLedgerDebt)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Blacklisted / Disabled</span>
            <span className="font-bold text-amber-300 text-sm">
              {blacklistedCustomersList.length} Restricted
            </span>
          </div>
        </div>
      </div>

      {/* 2. VILLAGE TERRITORY SELECTOR PILLS WITH EDIT PROFILE ACTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            Filter or Edit Village Territories (click gear icon to edit village):
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
              {activeCustomersList.length}
            </span>
          </button>

          {villages.map((vil) => (
            <div
              key={vil.id}
              className={`inline-flex items-center rounded-xl text-xs font-bold transition-all whitespace-nowrap overflow-hidden border ${
                selectedVillageId === vil.id
                  ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedVillageId(vil.id)}
                className="px-3 py-1.5 flex items-center gap-1.5"
              >
                <span>{vil.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({vil.code})</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                  {vil.customerCount || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditVillageModal(vil);
                }}
                title={`Edit Village Profile: ${vil.name}`}
                className={`px-2 py-1.5 border-l transition-colors ${
                  selectedVillageId === vil.id
                    ? "border-purple-500 hover:bg-purple-800 text-white"
                    : "border-slate-300 hover:bg-slate-300 text-slate-600"
                }`}
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ACCOUNT STATUS & SEARCH FILTER CONTROLS */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        {/* Account Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "ACTIVE"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active ({activeCustomersList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("BLACKLISTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "BLACKLISTED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Blacklisted / Disabled ({blacklistedCustomersList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({customers.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, code (CUST-...), mobile, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Debt Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDebtFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              debtFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Balances
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
            Clear Balance
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
                <th className="py-3.5 px-4">Mobile & Email</th>
                <th className="py-3.5 px-4 text-right">Credit Limit</th>
                <th className="py-3.5 px-4 text-right">Current Udhaar Debt</th>
                <th className="py-3.5 px-4 text-center">Account Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const isBlacklisted = c.isActive === false;
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isBlacklisted ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={c.name} size="md" />
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isBlacklisted && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase">
                                  BLACKLISTED
                                </span>
                              )}
                            </div>
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
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-mono text-slate-800 font-semibold">{c.mobile}</div>
                        {c.email && <div className="text-[11px] text-slate-500 font-mono">{c.email}</div>}
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
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isBlacklisted
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isBlacklisted ? "DISABLED / BLACKLISTED" : "ACTIVE"}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              c.currentBalance > 0
                                ? "text-rose-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {c.currentBalance > 0 ? "UDHAAR DUE" : "CLEAR"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!isBlacklisted && (
                            <Link
                              href={`/admin/billing?customerId=${c.id}&villageId=${c.villageId}`}
                              className="px-2.5 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <BrandBillingIcon className="w-3.5 h-3.5" />
                              <span>Bill</span>
                            </Link>
                          )}
                          <Link
                            href={`/customers/${c.id}`}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                          >
                            Ledger
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditCustomerModal(c)}
                            title="Edit Customer Profile"
                            className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBlacklistCustomer(c)}
                            disabled={submitting}
                            title={
                              isBlacklisted
                                ? "Re-Activate Customer Account"
                                : "Blacklist / Disable Customer Account (hides from active ledgers & blocks login)"
                            }
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 ${
                              isBlacklisted
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            }`}
                          >
                            {isBlacklisted ? (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                <span>Activate</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" />
                                <span>Blacklist</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(c)}
                            disabled={submitting}
                            title="Permanently Delete Customer & All Ledger Records"
                            className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                  placeholder="Enter customer full name"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    10-Digit Mobile *
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={custForm.mobile}
                    onChange={(e) => setCustForm({ ...custForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional alt mobile"
                    value={custForm.altMobile}
                    onChange={(e) => setCustForm({ ...custForm, altMobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Email (for Customer Portal Login & Receipts)
                </label>
                <input
                  type="email"
                  placeholder="Enter verified customer email"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  House / Landmark Address
                </label>
                <input
                  type="text"
                  placeholder="House number, street, or village landmark"
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
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

      {/* 6. EDIT CUSTOMER PROFILE MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Edit Customer Profile ({editingCustomer.customerCode})
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Village Territory *
                </label>
                <select
                  value={editCustForm.villageId}
                  onChange={(e) => setEditCustForm({ ...editCustForm, villageId: e.target.value })}
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
                  value={editCustForm.name}
                  onChange={(e) => setEditCustForm({ ...editCustForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={editCustForm.mobile}
                    onChange={(e) => setEditCustForm({ ...editCustForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="tel"
                    value={editCustForm.altMobile}
                    onChange={(e) => setEditCustForm({ ...editCustForm, altMobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={editCustForm.email}
                  onChange={(e) => setEditCustForm({ ...editCustForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Address / Landmark
                </label>
                <input
                  type="text"
                  value={editCustForm.address}
                  onChange={(e) => setEditCustForm({ ...editCustForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
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
                    value={editCustForm.creditLimit}
                    onChange={(e) => setEditCustForm({ ...editCustForm, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Internal Notes
                  </label>
                  <input
                    type="text"
                    value={editCustForm.notes}
                    onChange={(e) => setEditCustForm({ ...editCustForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PERMANENT DELETE CUSTOMER CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Permanently Delete Customer Account
              </h3>
              <button
                onClick={() => setDeletingCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">{deletingCustomer.name}</strong> (
                <span className="font-mono">{deletingCustomer.customerCode}</span>)?
              </p>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <div className="font-bold">Warning: Permanent Database Removal</div>
                <p>
                  This will permanently remove the customer, their login credentials, all orders, payments, and ledger entries from PostgreSQL. If you only want to restrict their access and hide them from active ledgers, use <strong>Blacklist</strong> instead.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD VILLAGE MODAL */}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Village Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter village name"
                    value={villageForm.name}
                    onChange={(e) => setVillageForm({ ...villageForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="3-5 chars"
                    value={villageForm.code}
                    onChange={(e) => setVillageForm({ ...villageForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mandal / Taluka
                  </label>
                  <input
                    type="text"
                    placeholder="Mandal name"
                    value={villageForm.taluka}
                    onChange={(e) => setVillageForm({ ...villageForm, taluka: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="District name"
                    value={villageForm.district}
                    onChange={(e) => setVillageForm({ ...villageForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={villageForm.state}
                    onChange={(e) => setVillageForm({ ...villageForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={villageForm.pincode}
                    onChange={(e) => setVillageForm({ ...villageForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
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

      {/* 9. EDIT VILLAGE PROFILE MODAL */}
      {editingVillage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-600" />
                Edit Village Territory ({editingVillage.code})
              </h3>
              <button
                onClick={() => setEditingVillage(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVillage} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Village Name *
                  </label>
                  <input
                    type="text"
                    value={editVillageForm.name}
                    onChange={(e) => setEditVillageForm({ ...editVillageForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={editVillageForm.code}
                    onChange={(e) =>
                      setEditVillageForm({ ...editVillageForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mandal / Taluka
                  </label>
                  <input
                    type="text"
                    value={editVillageForm.taluka}
                    onChange={(e) => setEditVillageForm({ ...editVillageForm, taluka: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={editVillageForm.district}
                    onChange={(e) => setEditVillageForm({ ...editVillageForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editVillageForm.state}
                    onChange={(e) => setEditVillageForm({ ...editVillageForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={editVillageForm.pincode}
                    onChange={(e) => setEditVillageForm({ ...editVillageForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Territory Notes
                </label>
                <input
                  type="text"
                  value={editVillageForm.notes}
                  onChange={(e) => setEditVillageForm({ ...editVillageForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDeleteVillage}
                  disabled={submitting}
                  className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Territory</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVillage(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {submitting ? "Updating..." : "Save Territory"}
                  </button>
                </div>
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
