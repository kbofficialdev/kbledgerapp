"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Printer,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Users,
  MapPin,
  CreditCard,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency, generateCustomItemId } from "@/lib/utils";
import GPayCheckoutModal from "@/components/GPayCheckoutModal";

interface LineItem {
  id: string; // local key
  customItemId: string; // unique customized item code
  name: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  lineTotal: number;
}

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
  currentBalance: number;
  creditLimit: number;
}

const DRAFT_STORAGE_KEY = "kb_draft_slip_active";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryVillageId = searchParams.get("villageId") || "";
  const queryCustomerId = searchParams.get("customerId") || "";

  // Data lists
  const [villages, setVillages] = useState<Village[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Selected State
  const [selectedVillageId, setSelectedVillageId] = useState(queryVillageId);
  const [selectedCustomerId, setSelectedCustomerId] = useState(queryCustomerId);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Bill Line Items
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

  // Settlement Mode: "CREDIT" | "DEBIT" | "PARTIAL"
  const [paymentType, setPaymentType] = useState<"CREDIT" | "DEBIT" | "PARTIAL">("DEBIT");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GOOGLE_PAY_UPI" | "GOOGLE_PAY_QR">("CASH");
  const [notes, setNotes] = useState("");
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
  const [gpayPaymentData, setGpayPaymentData] = useState<{
    method: string;
    merchantTxnId: string;
    upiRefId?: string;
    bankRrn?: string;
    payerVpa?: string;
    gpayTransactionId?: string;
  } | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // 1. Fetch Villages
  useEffect(() => {
    fetch("/api/villages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVillages(data.villages);
          if (!selectedVillageId && data.villages.length > 0) {
            setSelectedVillageId(data.villages[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  // 2. Fetch Customers when Village changes
  useEffect(() => {
    if (!selectedVillageId) {
      setCustomers([]);
      return;
    }

    fetch(`/api/customers?villageId=${selectedVillageId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.customers);
          if (queryCustomerId) {
            const found = data.customers.find((c: Customer) => c.id === queryCustomerId);
            if (found) {
              setSelectedCustomerId(found.id);
              setSelectedCustomer(found);
            }
          } else if (data.customers.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(data.customers[0].id);
            setSelectedCustomer(data.customers[0]);
          }
        }
      })
      .catch(console.error);
  }, [selectedVillageId]);

  // Update selected customer object when selectedCustomerId changes
  useEffect(() => {
    const cust = customers.find((c) => c.id === selectedCustomerId) || null;
    setSelectedCustomer(cust);
  }, [selectedCustomerId, customers]);

  // 3. Draft Engine: Check and restore from localStorage on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.items && draft.items.length > 0 && draft.items.some((i: any) => i.name || i.pricePerUnit)) {
          if (!queryCustomerId) {
            if (draft.selectedVillageId) setSelectedVillageId(draft.selectedVillageId);
            if (draft.selectedCustomerId) setSelectedCustomerId(draft.selectedCustomerId);
          }
          setItems(draft.items);
          if (draft.paymentType) setPaymentType(draft.paymentType);
          if (draft.paidAmount) setPaidAmount(draft.paidAmount);
          if (draft.notes) setNotes(draft.notes);
          setDraftRestored(true);
        }
      }
    } catch (e) {
      console.warn("Could not parse draft:", e);
    }
  }, []);

  // 4. Draft Engine: Auto-save on every state change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasMeaningfulContent = items.some((i) => i.name.trim() || i.pricePerUnit);
      if (hasMeaningfulContent) {
        const draftData = {
          selectedVillageId,
          selectedCustomerId,
          items,
          paymentType,
          paidAmount,
          notes,
          timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedVillageId, selectedCustomerId, items, paymentType, paidAmount, notes]);

  // Discard Draft
  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
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
    setPaidAmount("");
    setNotes("");
  };

  // Line Item Calculations
  const updateItem = (index: number, field: keyof LineItem, val: string) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.pricePerUnit) || 0;
    item.lineTotal = Math.round(qty * rate * 100) / 100;

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
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
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Totals
  const grandTotal = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);

  // Settlement Calculations
  const computedPaid =
    paymentType === "CREDIT"
      ? 0
      : paymentType === "DEBIT"
      ? grandTotal
      : parseFloat(paidAmount) || 0;

  const computedCredit = Math.max(0, Math.round((grandTotal - computedPaid) * 100) / 100);

  // Submit Order
  const handleRecordOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVillageId || !selectedCustomerId) {
      setFeedback({ type: "error", message: "Please select both Village and Customer." });
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && parseFloat(i.pricePerUnit) > 0);
    if (validItems.length === 0) {
      setFeedback({ type: "error", message: "Please enter at least one valid item with name and rate." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: selectedVillageId,
          customerId: selectedCustomerId,
          items: validItems,
          paymentType,
          paidAmount: computedPaid,
          paymentMethod,
          notes,
          merchantTxnId: gpayPaymentData?.merchantTxnId,
          gpayTransactionId: gpayPaymentData?.gpayTransactionId,
          upiRefId: gpayPaymentData?.upiRefId,
          bankRrn: gpayPaymentData?.bankRrn,
          payerVpa: gpayPaymentData?.payerVpa,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Clear local draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraftRestored(false);
        setCompletedOrder({
          ...data.order,
          customer: selectedCustomer,
          village: villages.find((v) => v.id === selectedVillageId),
          newBalance: data.newBalance,
        });
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to record order" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-soft animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Draft Restored:</strong> Restored your uncommitted counter bill slip from previous session.
            </span>
          </div>
          <button
            onClick={handleDiscardDraft}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline ml-2"
          >
            Discard Draft
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Offline Counter Bill Entry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mirror physical bahi-khata book slips with customized item IDs, debit/credit/partial settlement.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Draft auto-saving enabled</span>
        </div>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400">
            ×
          </button>
        </div>
      )}

      {/* Main Order Form */}
      <form onSubmit={handleRecordOrder} className="space-y-6">
        {/* Customer & Village Header Card */}
        <div className="kb-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Counter Customer Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Village Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Village / Route Territory <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedVillageId}
                onChange={(e) => {
                  setSelectedVillageId(e.target.value);
                  setSelectedCustomerId("");
                }}
                className="kb-input"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Customer Khata Account <span className="text-rose-500">*</span>
                </label>
                <Link
                  href={`/customers?villageId=${selectedVillageId}`}
                  className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Customer</span>
                </Link>
              </div>

              {customers.length === 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  No customers found in this village. Register a customer first.
                </div>
              ) : (
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="kb-input"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) — {c.mobile}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Active Customer Status Bar */}
          {selectedCustomer && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">{selectedCustomer.name}</span>
                <span className="font-mono text-slate-500">{selectedCustomer.mobile}</span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {selectedCustomer.customerCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Existing Udhaar:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    selectedCustomer.currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(selectedCustomer.currentBalance)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bill Items Grid */}
        <div className="kb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Line Items</h3>
              <p className="text-xs text-slate-500">Each item receives a unique customized ID upon entry.</p>
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="kb-btn-secondary text-xs py-1.5 px-3 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-2 px-2 w-28">Item ID</th>
                  <th className="py-2 px-2 min-w-[180px]">Item Name / Description <span className="text-rose-500">*</span></th>
                  <th className="py-2 px-2 w-24 text-center">Qty <span className="text-rose-500">*</span></th>
                  <th className="py-2 px-2 w-24">Unit</th>
                  <th className="py-2 px-2 w-32 text-right">Rate (₹) <span className="text-rose-500">*</span></th>
                  <th className="py-2 px-2 w-32 text-right font-bold text-slate-800">Line Total</th>
                  <th className="py-2 px-1 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    {/* Unique Customized Item ID */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.customItemId}
                        onChange={(e) => updateItem(index, "customItemId", e.target.value)}
                        className="kb-input py-1 px-2 font-mono text-[11px] text-slate-500 bg-slate-50/70"
                        title="Auto-generated customized item identifier"
                      />
                    </td>

                    {/* Item Name */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Urea 50kg, Sugar, Rice, Oil"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="kb-input py-1.5 px-2.5 font-medium"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="kb-input py-1.5 px-2 text-center font-mono"
                      />
                    </td>

                    {/* Unit Selector */}
                    <td className="py-2 px-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="kb-input py-1.5 px-2"
                      >
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="bag">bag</option>
                        <option value="pkt">pkt</option>
                        <option value="liter">liter</option>
                        <option value="box">box</option>
                        <option value="meter">meter</option>
                        <option value="gm">gm</option>
                      </select>
                    </td>

                    {/* Price per unit (Rate) */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="0.00"
                        value={item.pricePerUnit}
                        onChange={(e) => updateItem(index, "pricePerUnit", e.target.value)}
                        className="kb-input py-1.5 px-2 text-right font-mono font-bold"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(item.lineTotal)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-20 p-1"
                        title="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={addItemRow}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item Row</span>
            </button>

            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Subtotal: </span>
              <span className="text-lg font-bold font-mono text-slate-900 ml-1">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Settlement & Ledger Mode */}
        <div className="kb-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Settlement Mode &amp; Khata Allocation</span>
          </div>

          {/* 3-Segment Switch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {/* 1. Debit (Fully Paid) */}
            <button
              type="button"
              onClick={() => {
                setPaymentType("DEBIT");
                setPaidAmount("");
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentType === "DEBIT"
                  ? "bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900">Debit (Paid in Full)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs text-slate-500">
                Total payment paid right now. Customer khata balance remains unchanged.
              </p>
            </button>

            {/* 2. Partial Paid */}
            <button
              type="button"
              onClick={() => {
                setPaymentType("PARTIAL");
                setPaidAmount(Math.round(grandTotal / 2).toString());
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentType === "PARTIAL"
                  ? "bg-amber-50/80 border-amber-500 shadow-sm ring-1 ring-amber-500"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900">Partial Paid</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <p className="text-xs text-slate-500">
                Split: some debit (paid now) + remaining carried forward as credit (Udhaar).
              </p>
            </button>

            {/* 3. Credit (Unpaid Udhaar) */}
            <button
              type="button"
              onClick={() => {
                setPaymentType("CREDIT");
                setPaidAmount("0");
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentType === "CREDIT"
                  ? "bg-rose-50/80 border-rose-500 shadow-sm ring-1 ring-rose-500"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900">Credit (Full Udhaar)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              </div>
              <p className="text-xs text-slate-500">
                Not paid at all. 100% of the bill amount added to customer&apos;s pending balance.
              </p>
            </button>
          </div>

          {/* Settlement Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            {paymentType === "PARTIAL" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Cash / Digital Amount Paid Now (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={grandTotal}
                  placeholder="Enter amount paid"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="kb-input font-mono font-bold text-base"
                />
              </div>
            )}

            {paymentType !== "CREDIT" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        paymentMethod === "CASH"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Cash (Counter)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("GOOGLE_PAY_UPI")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        paymentMethod === "GOOGLE_PAY_UPI"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Google Pay (UPI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("GOOGLE_PAY_QR")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        paymentMethod === "GOOGLE_PAY_QR"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      G-Pay Dynamic QR
                    </button>
                  </div>
                </div>

                {/* Google Pay Direct Counter Integration */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-sky-50/80 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      G
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Google Pay Business India</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.2 rounded font-semibold">
                          UPI
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {gpayPaymentData ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified: {gpayPaymentData.bankRrn ? `RRN ${gpayPaymentData.bankRrn}` : gpayPaymentData.merchantTxnId}
                          </span>
                        ) : (
                          <span>Generate Dynamic QR with 15-min TTL &amp; NPCI auto-reconciliation</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGPayModalOpen(true)}
                    disabled={computedPaid <= 0}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {gpayPaymentData
                        ? "View / Re-verify QR"
                        : `Collect ${formatCurrency(computedPaid)} via G-Pay`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Bill Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Goods loaded on tractor, customer promise payment on 15th"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="kb-input text-xs"
              />
            </div>
          </div>

          {/* Breakdown KPI */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Total Bill Amount</p>
              <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <p className="text-[10px] font-semibold uppercase text-emerald-600">Amount Paid (Debit)</p>
              <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">{formatCurrency(computedPaid)}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <p className="text-[10px] font-semibold uppercase text-rose-600">Added to Udhaar (Credit)</p>
              <p className="text-base font-bold font-mono text-rose-700 mt-0.5">{formatCurrency(computedCredit)}</p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="kb-btn-secondary w-full sm:w-auto text-xs py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Clear Slip</span>
          </button>

          <button
            type="submit"
            disabled={submitting || grandTotal <= 0}
            className="kb-btn-primary w-full sm:w-auto px-6 py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <span>Recording into Khata...</span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Confirm &amp; Record Bill ({formatCurrency(grandTotal)})</span>
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Post-Order Success & Carbon Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Bill Recorded Successfully!</h3>
              <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                Receipt #{completedOrder.orderNumber}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Customer:</span>
                <span className="font-bold text-slate-900 font-sans">{completedOrder.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Village:</span>
                <span className="text-slate-700 font-sans">{completedOrder.village?.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-sans">Bill Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(completedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-sans">Paid Now:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(completedOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-600 font-sans">Added to Khata:</span>
                <span className="font-bold text-rose-600">{formatCurrency(completedOrder.creditAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-700 font-sans">New Customer Balance:</span>
                <span className="text-rose-700">{formatCurrency(completedOrder.newBalance)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <Link
                href={`/reports/print/${completedOrder.id}`}
                target="_blank"
                className="kb-btn-secondary w-full justify-center text-xs py-2.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Exact Carbon Receipt (80mm)</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  router.push(`/customers/${selectedCustomerId}`);
                }}
                className="kb-btn-primary w-full justify-center text-xs py-2.5"
              >
                <span>Go to Customer Khata</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Pay Dynamic QR & Intent Modal */}
      <GPayCheckoutModal
        isOpen={isGPayModalOpen}
        onClose={() => setIsGPayModalOpen(false)}
        amount={computedPaid}
        customerName={selectedCustomer?.name || "Counter Customer"}
        customerMobile={selectedCustomer?.mobile}
        customerId={selectedCustomerId}
        onPaymentSuccess={(data) => {
          setGpayPaymentData(data);
          setPaymentMethod("GOOGLE_PAY_UPI");
          setFeedback({
            type: "success",
            message: `Google Pay UPI payment verified! (Ref: ${data.merchantTxnId}${data.bankRrn ? `, RRN: ${data.bankRrn}` : ""})`,
          });
        }}
      />
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading counter bill slip...</div>}>
      <NewOrderContent />
    </Suspense>
  );
}
