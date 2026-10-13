"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  Search,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency, generateCustomItemId } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { useToast } from "@/context/ToastContext";
import { BrandBillingIcon } from "@/components/brand/BrandIcons";

interface Village {
  id: string;
  name: string;
  code: string;
}

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  villageId: string;
  village?: { name: string; code: string };
  currentBalance: number;
  creditLimit: number;
}

interface LineItem {
  id: string;
  customItemId: string;
  name: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  lineTotal: number;
}

export default function AdminBillingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [villages, setVillages] = useState<Village[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Items State
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      customItemId: generateCustomItemId(),
      name: "",
      quantity: "1",
      unit: "pcs",
      pricePerUnit: "",
      lineTotal: 0,
    },
  ]);
  const [notes, setNotes] = useState<string>("");

  // Load initial villages & customers
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [vRes, cRes] = await Promise.all([
          fetch("/api/villages").then((r) => r.json()),
          fetch("/api/customers").then((r) => r.json()),
        ]);
        const vList = vRes.villages || [];
        const cList = cRes.customers || [];
        setVillages(vList);
        setCustomers(cList);

        // Check if there was an active draft in sessionStorage
        const savedDraft = sessionStorage.getItem("kb_active_billing_slip");
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.customerId) {
              const matchedCust = cList.find((c: Customer) => c.id === parsed.customerId);
              if (matchedCust) {
                setSelectedCustomer(matchedCust);
                setSelectedVillageId(matchedCust.villageId);
              }
            }
            if (parsed.items && parsed.items.length > 0) {
              setItems(
                parsed.items.map((i: any) => ({
                  ...i,
                  quantity: String(i.quantity),
                  pricePerUnit: String(i.pricePerUnit),
                }))
              );
            }
            if (parsed.notes) setNotes(parsed.notes);
          } catch (e) {
          }
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Global F2 shortcut to reset or focus items
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        toast.info("Billing flow active. Add items to calculate.", "Counter Active");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter customers by selected village and search query
  const filteredCustomers = customers.filter((cust) => {
    const matchesVillage = !selectedVillageId || cust.villageId === selectedVillageId;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesVillage;
    const matchesQuery =
      cust.name.toLowerCase().includes(query) ||
      cust.customerCode.toLowerCase().includes(query) ||
      cust.mobile.includes(query);
    return matchesVillage && matchesQuery;
  });

  // Items manipulation
  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.pricePerUnit) || 0;
      item.lineTotal = Math.round(qty * price * 100) / 100;

      copy[index] = item;
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        customItemId: generateCustomItemId(),
        name: "",
        quantity: "1",
        unit: "pcs",
        pricePerUnit: "",
        lineTotal: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setItems([
        {
          id: String(Date.now()),
          customItemId: generateCustomItemId(),
          name: "",
          quantity: "1",
          unit: "pcs",
          pricePerUnit: "",
          lineTotal: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addQuickPreset = (name: string, price: number, unit = "pcs") => {
    // If the last row is empty, fill it; otherwise append
    const last = items[items.length - 1];
    if (last && !last.name && !last.pricePerUnit) {
      updateItem(items.length - 1, "name", name);
      updateItem(items.length - 1, "unit", unit);
      updateItem(items.length - 1, "pricePerUnit", String(price));
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          customItemId: generateCustomItemId(),
          name,
          quantity: "1",
          unit,
          pricePerUnit: String(price),
          lineTotal: price,
        },
      ]);
    }
  };

  const resetForm = () => {
    sessionStorage.removeItem("kb_active_billing_slip");
    setSelectedCustomer(null);
    setSearchQuery("");
    setNotes("");
    setItems([
      {
        id: "1",
        customItemId: generateCustomItemId(),
        name: "",
        quantity: "1",
        unit: "pcs",
        pricePerUnit: "",
        lineTotal: 0,
      },
    ]);
    toast.info("Billing counter reset to new draft.", "Draft Cleared");
  };

  // Calculations
  const validItems = items.filter(
    (i) => i.name.trim() !== "" && parseFloat(i.pricePerUnit) > 0
  );
  const subtotal = validItems.reduce((acc, i) => acc + i.lineTotal, 0);
  const grandTotal = subtotal;

  const prevBalance = selectedCustomer ? Number(selectedCustomer.currentBalance) : 0;
  const projectedBalance = prevBalance + grandTotal;
  const isCreditLimitExceeded =
    selectedCustomer &&
    selectedCustomer.creditLimit > 0 &&
    projectedBalance > selectedCustomer.creditLimit;

  // Proceed to Step 2: Payment
  const handleProceedToPayment = () => {
    if (!selectedCustomer) {
      toast.authError("Please select a customer before proceeding to payment.", "Customer Required");
      return;
    }
    if (validItems.length === 0 || grandTotal <= 0) {
      toast.authError("Please add at least one line item with a price.", "Items Required");
      return;
    }

    const draftData = {
      villageId: selectedCustomer.villageId || selectedVillageId,
      villageName:
        villages.find((v) => v.id === (selectedCustomer.villageId || selectedVillageId))?.name ||
        "General Territory",
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.customerCode,
      customerMobile: selectedCustomer.mobile,
      currentBalance: prevBalance,
      creditLimit: selectedCustomer.creditLimit,
      items: validItems.map((i) => ({
        id: i.id,
        customItemId: i.customItemId,
        name: i.name.trim(),
        quantity: parseFloat(i.quantity) || 1,
        unit: i.unit,
        pricePerUnit: parseFloat(i.pricePerUnit) || 0,
        lineTotal: i.lineTotal,
      })),
      subtotal,
      grandTotal,
      notes,
    };

    sessionStorage.setItem("kb_active_billing_slip", JSON.stringify(draftData));
    router.push("/admin/billing/payment");
  };

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. THREE-STEP SEQUENTIAL FLOW STEP INDICATOR */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-sm font-bold text-slate-900">Items & Auto-Calc</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-sm font-semibold text-slate-600">Payment Options</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span className="text-sm font-semibold text-slate-600">Carbon Slip</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      {/* 2. TOP BANNER / SEARCH BAR: SELECTION OF VILLAGE & CUSTOMER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <BrandBillingIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Billing Counter & Customer Selection</h1>
              <p className="text-xs text-slate-500">
                Search customer ID, name, or phone. Live ledger balance links automatically.
              </p>
            </div>
          </div>

          {/* Village Filter dropdown */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            <select
              value={selectedVillageId}
              onChange={(e) => {
                setSelectedVillageId(e.target.value);
                setSelectedCustomer(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All Villages & Territories</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Search & Picker Bar */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer by name, code (e.g. CUST-...), or 10-digit mobile..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
            <Link
              href="/admin/customers"
              className="px-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold transition-colors whitespace-nowrap"
            >
              + New Customer
            </Link>
          </div>

          {/* Autocomplete Dropdown */}
          {searchFocused && searchQuery.trim() !== "" && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setSelectedVillageId(cust.villageId);
                      setSearchQuery(cust.name);
                      setSearchFocused(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CustomerAvatar name={cust.name} size="sm" />
                      <div>
                        <div className="text-sm font-bold text-slate-900">{cust.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {cust.customerCode} • {cust.mobile}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-500">Udhaar Debt</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          cust.currentBalance > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(cust.currentBalance)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching customers found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Customer Active Banner */}
        {selectedCustomer && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CustomerAvatar name={selectedCustomer.name} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-100 text-purple-800">
                    {selectedCustomer.customerCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Mobile: {selectedCustomer.mobile}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  Current Udhaar Debt
                </span>
                <span
                  className={`text-base font-black font-mono ${
                    selectedCustomer.currentBalance > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {formatCurrency(selectedCustomer.currentBalance)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. TWO-COLUMN SPLIT: LEFT ADD ITEMS PANEL, RIGHT AUTOMATIC CALCULATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: ADD ITEMS PANEL (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Itemized Counter Entry
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {items.length} line item{items.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Quick Item Presets */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Retail Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addQuickPreset("Cotton Shirt", 650)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-black transition-colors"
              >
                + Cotton Shirt (₹650)
              </button>
              <button
                type="button"
                onClick={() => addQuickPreset("Silk Saree", 1450)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-black transition-colors"
              >
                + Silk Saree (₹1,450)
              </button>
              <button
                type="button"
                onClick={() => addQuickPreset("Denim Jeans", 850)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-black transition-colors"
              >
                + Denim Jeans (₹850)
              </button>
              <button
                type="button"
                onClick={() => addQuickPreset("Traditional Dhoti", 350)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-black transition-colors"
              >
                + Dhoti (₹350)
              </button>
            </div>
          </div>

          {/* Line Items List */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center font-mono">
                      {index + 1}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.customItemId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    aria-label={`Remove item ${index + 1}`}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Item Description */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Item Name / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cotton Dress Material"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono text-center focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, "unit", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="pcs">pcs</option>
                      <option value="meters">meters</option>
                      <option value="sets">sets</option>
                      <option value="kg">kg</option>
                      <option value="pkts">pkts</option>
                      <option value="boxes">boxes</option>
                    </select>
                  </div>

                  {/* Price per unit */}
                  <div className="col-span-4 sm:col-span-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={item.pricePerUnit}
                      onChange={(e) => updateItem(index, "pricePerUnit", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono text-right focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                {/* Line Total Display */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Subtotal for Item:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addItemRow}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-700 hover:border-black hover:text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-white"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Line Item</span>
          </button>

          {/* Notes / Remarks */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Slip Notes / Memo (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Festival advance order, delivery on Monday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: AUTOMATIC CALCULATION PANEL (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Live Billing Computation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates itemized subtotal & projected customer Udhaar debt.
              </p>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Items Added</span>
                <span className="font-mono font-semibold text-slate-800">
                  {validItems.length} valid item{validItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Applicable GST / Tax</span>
                <span className="font-mono text-slate-500">₹0.00 (Exempt)</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base">
                <span className="font-bold text-slate-900">Total Payable Bill</span>
                <span className="font-mono font-black text-2xl text-slate-900">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Customer Financial Impact */}
            {selectedCustomer && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Customer Ledger Impact
                </span>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Current Outstanding Debt</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {formatCurrency(prevBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>This Slip Addition</span>
                  <span className="font-mono font-semibold text-slate-900">
                    +{formatCurrency(grandTotal)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>New Balance if Unpaid</span>
                  <span className="font-mono text-rose-700">
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>

                {isCreditLimitExceeded && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-[11px] flex items-center gap-1.5 mt-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Notice: Projected balance exceeds credit limit of{" "}
                      <strong>{formatCurrency(selectedCustomer.creditLimit)}</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Primary Action Button: Proceed to Step 2 Payment */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={!selectedCustomer || validItems.length === 0 || grandTotal <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
              >
                <span>Proceed to Payment (Step 2)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Next: Choose Cash vs Cashfree Gateway (UPI, Cards)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

