"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Printer,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Users,
  IndianRupee,
  RefreshCw,
  Search,
  ArrowRight,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface CollectionCustomer {
  sNo: number;
  customerId: string;
  customerCode: string;
  customerName: string;
  mobile: string;
  villageName: string;
  villageCode: string;
  outstandingBalance: number;
  creditLimit: number;
  collectedAmount: string;
}

export default function VillageCollectionSheetPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [villages, setVillages] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedVillageId, setSelectedVillageId] = useState("ALL");
  const [customers, setCustomers] = useState<CollectionCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Upload Result Modal
  const [uploadResult, setUploadResult] = useState<{
    count: number;
    totalAmount: number;
    processed: Array<{
      customerCode: string;
      customerName: string;
      amountCredited: number;
      balanceBefore: number;
      balanceAfter: number;
    }>;
  } | null>(null);

  // Load Villages
  useEffect(() => {
    async function loadVillages() {
      try {
        const res = await fetch("/api/villages");
        const json = await res.json();
        if (json.villages) {
          setVillages(json.villages);
        }
      } catch (err) {
      }
    }
    loadVillages();
  }, []);

  // Load Sheet Data
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      const url =
        selectedVillageId !== "ALL"
          ? `/api/admin/villages/collection-sheet?villageId=${selectedVillageId}`
          : "/api/admin/villages/collection-sheet";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.customers) {
        setCustomers(data.customers);
      }
    } catch {
      toast.authError("Failed to load collection sheet.", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [selectedVillageId]);

  // Download Excel Template
  const handleDownloadExcel = () => {
    const url =
      selectedVillageId !== "ALL"
        ? `/api/admin/villages/collection-sheet?villageId=${selectedVillageId}&format=excel`
        : "/api/admin/villages/collection-sheet?format=excel";
    window.location.href = url;
    toast.authSuccess("Generating and downloading Excel template...", "Export Ready");
  };

  // Upload Filled Excel File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/villages/bulk-collection", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data) {
        toast.authSuccess(data.message, "Collections Recorded");
        setUploadResult(data.data);
        fetchSheetData(); // refresh live balances
      } else {
        toast.authError(data.error || "Failed to process bulk upload.", "Upload Error");
      }
    } catch {
      toast.authError("Network error uploading file.", "Connection Error");
    } finally {
      setUploading(false);
      // Reset input value so user can upload again
      e.target.value = "";
    }
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  const filteredCustomers = customers.filter((c) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.villageName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 bg-white">
      {/* 1. TOP HEADER & CONTROLS (Hidden during physical print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Village Field Collection Sheet & Excel Upload
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-mono font-bold border border-emerald-200">
              Field Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Printable physical cash collection ledger with blank handwriting slots. Upload the filled Excel sheet to automatically reconcile Khata balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* 2. VILLAGE SELECTION & UPLOAD BAR (No-print) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Village Filter (5 cols) */}
        <div className="md:col-span-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-slate-800 block">Select Territory:</label>
            <p className="text-[11px] text-slate-500">Filter customers by village</p>
          </div>
          <select
            value={selectedVillageId}
            onChange={(e) => setSelectedVillageId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
          >
            <option value="ALL">All Village Territories ({villages.length})</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>

        {/* Upload Excel Drag-Drop Zone (7 cols) */}
        <div className="md:col-span-7 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">Upload Filled Excel / CSV</div>
              <p className="text-[11px] text-emerald-800">
                System automatically reads &apos;Collected Cash&apos; and credits accounts atomically.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all">
            <span>{uploading ? "Processing..." : "Select File"}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. FIELD SUMMARY BANNER (No-print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <span className="text-slate-500 font-semibold">Customers Listed:</span>
          <span className="font-mono text-base font-black text-slate-900">{customers.length}</span>
        </div>
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex items-center justify-between">
          <span className="text-rose-700 font-semibold">Total Outstanding Udhaar:</span>
          <span className="font-mono text-base font-black text-rose-600">
            {formatCurrency(totalOutstanding)}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
          <span className="text-slate-500 font-semibold">Search Filter:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer..."
            className="px-2.5 py-1 rounded border border-slate-200 text-xs w-36"
          />
        </div>
      </div>

      {/* 4. PHYSICAL PRINTABLE FIELD COLLECTION SHEET CANVAS */}
      <div className="p-6 bg-white border border-slate-300 rounded-2xl shadow-xs print:p-0 print:border-none print:shadow-none font-sans text-xs text-slate-900">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-3 flex items-start justify-between">
          <div>
            <div className="text-lg font-black tracking-wider uppercase text-black">
              KB KHATA & FASHIONS — FIELD COLLECTION SHEET
            </div>
            <div className="text-[11px] text-slate-600">
              Village Territory:{" "}
              <strong className="text-black">
                {selectedVillageId === "ALL"
                  ? "ALL VILLAGES"
                  : villages.find((v) => v.id === selectedVillageId)?.name || "Selected Territory"}
              </strong>{" "}
              • Generated Date: {new Date().toLocaleDateString("en-IN")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">
              FIELD AUDIT DOCUMENT
            </div>
            <div className="text-[11px] text-black font-mono font-bold mt-0.5">
              Target: {formatCurrency(totalOutstanding)}
            </div>
          </div>
        </div>

        {/* Printable Table with BLANK "COLLECTED CASH" COLUMN */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-[10px] uppercase font-bold text-black">
                <th className="py-2 px-2 border-r border-black w-10 text-center">S.No</th>
                <th className="py-2 px-2.5 border-r border-black w-24">Code</th>
                <th className="py-2 px-3 border-r border-black">Customer Name</th>
                <th className="py-2 px-2.5 border-r border-black w-28">Mobile</th>
                <th className="py-2 px-2.5 border-r border-black w-28">Village</th>
                <th className="py-2 px-3 border-r border-black text-right w-28">
                  Due Udhaar (₹)
                </th>
                {/* BLANK COLUMN WHERE STORE OWNER ENTERS COLLECTED CASH BY HAND */}
                <th className="py-2 px-3 border-r border-black text-right w-32 bg-amber-50/50 print:bg-transparent font-black">
                  Collected Cash (₹)
                </th>
                <th className="py-2 px-3 w-28 text-center">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust, idx) => (
                  <tr key={cust.customerId} className="h-9 hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2 border-r border-black text-center font-mono text-[11px]">
                      {cust.sNo}
                    </td>
                    <td className="py-2 px-2.5 border-r border-black font-mono font-bold text-[11px]">
                      {cust.customerCode}
                    </td>
                    <td className="py-2 px-3 border-r border-black font-semibold text-slate-900 truncate max-w-[160px]">
                      {cust.customerName}
                    </td>
                    <td className="py-2 px-2.5 border-r border-black font-mono text-[11px]">
                      {cust.mobile}
                    </td>
                    <td className="py-2 px-2.5 border-r border-black truncate max-w-[100px]">
                      {cust.villageName}
                    </td>
                    <td className="py-2 px-3 border-r border-black text-right font-mono font-bold text-rose-700">
                      {formatCurrency(cust.outstandingBalance)}
                    </td>
                    {/* Blank handwriting cell with underline guide */}
                    <td className="py-2 px-3 border-r border-black text-right font-mono bg-amber-50/20 print:bg-transparent">
                      <div className="w-full border-b border-dotted border-slate-400 h-4" />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="w-full border-b border-dotted border-slate-400 h-4" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No customers found for this territory.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-black bg-slate-50 font-bold text-black">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 border-r border-black text-right">
                  TOTAL TERRITORY OUTSTANDING:
                </td>
                <td className="py-2.5 px-3 border-r border-black text-right font-mono font-black text-sm">
                  {formatCurrency(totalOutstanding)}
                </td>
                <td className="py-2.5 px-3 border-r border-black text-right text-slate-400 italic font-normal text-[10px]">
                  [Total Collected]
                </td>
                <td className="py-2.5 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Footer */}
        <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-t border-black pt-1 font-semibold">Field Collection Agent Signature</div>
            <div className="text-[10px] text-slate-500">Date & Location of Collection</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-semibold">Store Manager Verification</div>
            <div className="text-[10px] text-slate-500">KB Khata & Fashions, Tandoor</div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: BULK RECONCILIATION RESULT SUMMARY */}
      {uploadResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Collection Reconciliation Complete
                </h3>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div>
                Successfully updated <strong>{uploadResult.count}</strong> customer ledgers.
              </div>
              <div className="text-sm font-bold font-mono text-emerald-800">
                Total Realized Cash: {formatCurrency(uploadResult.totalAmount)}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
              {uploadResult.processed.map((p, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{p.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{p.customerCode}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 block">
                      +{formatCurrency(p.amountCredited)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Bal: {formatCurrency(p.balanceAfter)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setUploadResult(null)}
              className="w-full py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs"
            >
              Close & View Updated Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

