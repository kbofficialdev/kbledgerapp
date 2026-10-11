"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Users,
  Receipt,
  IndianRupee,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Village {
  id: string;
  code: string;
  name: string;
  taluk?: string;
  district?: string;
  pincode?: string;
  notes?: string;
  customerCount: number;
  orderCount: number;
  totalOutstanding: number;
  createdAt: string;
}

export default function VillagesPage() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    taluk: "",
    district: "",
    pincode: "",
    notes: "",
  });

  const fetchVillages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/villages?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setVillages(data.villages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVillages();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/villages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Village "${formData.name}" profile created successfully!` });
        setFormData({ name: "", code: "", taluk: "", district: "", pincode: "", notes: "" });
        setIsModalOpen(false);
        fetchVillages();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to create village" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregated Stats
  const totalVillages = villages.length;
  const totalCustomers = villages.reduce((sum, v) => sum + v.customerCount, 0);
  const totalOutstandingBalance = villages.reduce((sum, v) => sum + v.totalOutstanding, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Village Profiles &amp; Territories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize offline customers, route coverage, and regional credit balances.
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
          <span>Add New Village</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kb-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Villages</p>
              <p className="text-xl font-bold text-slate-900 font-mono">{totalVillages}</p>
            </div>
          </div>
        </div>

        <div className="kb-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Customers</p>
              <p className="text-xl font-bold text-slate-900 font-mono">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="kb-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Total Udhaar / Credit</p>
              <p className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalOutstandingBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="kb-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Village Name, Code (e.g. VIL-RAM), Taluk, or District..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="kb-input pl-10"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Villages List / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="kb-card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-10 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : villages.length === 0 ? (
        <div className="kb-card p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Villages Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {search
              ? "No village profiles matched your search keyword."
              : "Start by registering your first village territory to link offline shop customers."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="kb-btn-primary mx-auto text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Village Profile</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {villages.map((v) => (
            <div key={v.id} className="kb-card p-5 flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>{v.name}</span>
                    </h3>
                    <div className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded text-[11px] font-mono font-semibold text-slate-600">
                      {v.code}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                      v.totalOutstanding > 0
                        ? "bg-rose-50 text-rose-700 border border-rose-200/70"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                    }`}
                  >
                    Udhaar: {formatCurrency(v.totalOutstanding)}
                  </span>
                </div>

                {(v.taluk || v.district) && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {[v.taluk, v.district, v.pincode ? `PIN: ${v.pincode}` : ""]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                )}

                {v.notes && (
                  <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                    &ldquo;{v.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {v.customerCount} Customers
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    {v.orderCount} Bills
                  </span>
                </div>

                <Link
                  href={`/customers?villageId=${v.id}`}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 hover:underline"
                >
                  <span>View Khata</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Village Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>Create Village Profile</span>
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
                  Village Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rampur, Shivpur, Belur"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="kb-input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Village Code (Optional / Auto-generated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIL-RAM-001 (auto if blank)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="kb-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Taluk / Mandal
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mandya"
                    value={formData.taluk}
                    onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                    className="kb-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mysore"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="kb-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  placeholder="e.g. 571401"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="kb-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Notes / Route Information
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Near weekly market gate, north route bus stop"
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
                  disabled={submitting || !formData.name.trim()}
                  className="kb-btn-primary"
                >
                  {submitting ? "Saving..." : "Save Village"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
