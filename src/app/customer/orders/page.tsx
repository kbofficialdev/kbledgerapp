"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Eye,
  X,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { PaymentTypeBadge } from "@/components/common/Avatars";
import KbVerifiedSeal from "@/components/brand/KbVerifiedSeal";

interface OrderItem {
  id: string;
  customItemId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  lineTotal: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: string;
  paymentStatus: string;
  notes?: string;
  items: OrderItem[];
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    villageName: string;
    currentBalance: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DEBIT" | "CREDIT" | "PARTIAL">("ALL");

  // Selected Order for Receipt Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<OrderRecord | null>(null);
  const [receiptPrintMode, setReceiptPrintMode] = useState<"SLIP" | "CARBON">("SLIP");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/customer/me");
        if (res.status === 401) {
          router.replace("/customer/login");
          return;
        }
        const json = await res.json();
        if (json.success) {
          setCustomer(json.customer);
          setOrders(json.orders || []);
        }
      } catch {
        toast.authError("Failed to fetch customer orders.", "Network Error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">Loading your purchase invoices...</p>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.paymentType !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchOrderNum = o.orderNumber.toLowerCase().includes(q);
      const matchItems = o.items.some((i) => i.name.toLowerCase().includes(q));
      return matchOrderNum || matchItems;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 bg-white">
      {/* Background UI is completely hidden during printing */}
      <div className="no-print space-y-8">
        {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Orders & Purchase Bills
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-mono font-bold border border-cyan-200">
              {orders.length} Invoices
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse verified purchase bills. Generate small slip thermal receipts (80mm) or full carbon vouchers.
          </p>
        </div>

        <Link
          href="/customer/khata"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <span>Go to Khata Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold self-start">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "ALL" ? "bg-white text-black shadow-xs" : "text-slate-600"
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => setStatusFilter("CREDIT")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "CREDIT" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
            }`}
          >
            Udhaar Due
          </button>
          <button
            onClick={() => setStatusFilter("PARTIAL")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "PARTIAL" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"
            }`}
          >
            Partial Paid
          </button>
          <button
            onClick={() => setStatusFilter("DEBIT")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "DEBIT" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
            }`}
          >
            Fully Settled
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order # or item name..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-64"
          />
        </div>
      </div>

      {/* 3. ORDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      #{order.orderNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(order.orderDate)}
                    </div>
                  </div>
                  <PaymentTypeBadge type={order.paymentType as any} />
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Purchased Items ({order.items.length})
                  </span>
                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-slate-700">
                        <span className="truncate max-w-[180px]">
                          {item.name} × {item.quantity} {item.unit}
                        </span>
                        <span className="font-mono text-slate-900 font-semibold">
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[11px] text-slate-400 block font-medium">
                        +{order.items.length - 3} more items
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Financials & Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 font-sans">Total:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-700 font-sans">Paid:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(order.paidAmount)}
                  </span>
                </div>

                {order.creditAmount > 0.01 && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-600 font-sans font-semibold">Udhaar Due:</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(order.creditAmount)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveReceiptOrder(order);
                      setReceiptPrintMode("SLIP");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-800 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>Slip (80mm)</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveReceiptOrder(order);
                      setReceiptPrintMode("CARBON");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Carbon Voucher</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">No orders found matching your search criteria.</p>
          </div>
        )}
      </div>
      </div>

      {/* 4. MODAL: RECEIPT & CARBON VOUCHER PREVIEW & PRINT */}
      {activeReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:m-0">
            {/* Header controls (Hidden during print) */}
            <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-900">Receipt Format:</span>
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setReceiptPrintMode("SLIP")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      receiptPrintMode === "SLIP" ? "bg-black text-white" : "text-slate-600"
                    }`}
                  >
                    80mm Thermal Slip
                  </button>
                  <button
                    onClick={() => setReceiptPrintMode("CARBON")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      receiptPrintMode === "CARBON" ? "bg-black text-white" : "text-slate-600"
                    }`}
                  >
                    Carbon Voucher (A4/A5)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceiptOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Canvas */}
            <div className="p-6 overflow-y-auto print:p-0 print:m-0">
              {receiptPrintMode === "SLIP" ? (
                /* === 80mm THERMAL SLIP SIZE CARBON RECEIPT === */
                <div className="max-w-[340px] mx-auto p-4 bg-white border border-slate-300 font-mono text-[11px] text-black shadow-xs leading-tight">
                  <div className="text-center pb-2 border-b border-dashed border-black space-y-1">
                    <div className="text-base font-black tracking-wider uppercase">KB FASHIONS</div>
                    <div className="text-[10px] uppercase">Smart Shop & Village Khata</div>
                    <div className="text-[9px] text-slate-600">Tandoor, Mancherial Dist, TS</div>
                    <div className="text-[9px] text-slate-600">Ph: 6303185141</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>BILL NO:</span>
                      <span className="font-bold">{activeReceiptOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DATE:</span>
                      <span>{formatDateTime(activeReceiptOrder.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CUSTOMER:</span>
                      <span className="font-bold">{customer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CODE:</span>
                      <span>{customer?.customerCode} ({customer?.villageName})</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="py-2 border-b border-dashed border-black">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black text-[9px] uppercase">
                          <th className="py-1">ITEM</th>
                          <th className="text-center">QTY</th>
                          <th className="text-right">RATE</th>
                          <th className="text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dotted divide-slate-300">
                        {activeReceiptOrder.items.map((item, idx) => (
                          <tr key={idx} className="py-1">
                            <td className="py-1 max-w-[120px] truncate">{item.name}</td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-right">₹{item.pricePerUnit}</td>
                            <td className="text-right font-bold">₹{item.lineTotal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="py-2 border-b border-dashed border-black space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>GRAND TOTAL:</span>
                      <span>{formatCurrency(activeReceiptOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>PAID AMOUNT:</span>
                      <span>{formatCurrency(activeReceiptOrder.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700">
                      <span>BALANCE UDHAAR:</span>
                      <span>{formatCurrency(activeReceiptOrder.creditAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pt-1">
                      <span>TOTAL OUTSTANDING:</span>
                      <span className="font-black">{formatCurrency(customer?.currentBalance || 0)}</span>
                    </div>
                  </div>

                  {/* Verified Seal */}
                  <div className="pt-2 flex justify-center">
                    <KbVerifiedSeal size="sm" sealNumber={activeReceiptOrder.orderNumber} />
                  </div>

                  <div className="pt-2 text-center space-y-0.5 text-[9px]">
                    <div className="font-bold uppercase">THANK YOU FOR YOUR PATRONAGE!</div>
                    <div className="text-slate-500">Subject to local village jurisdiction</div>
                    <div className="text-[8px] text-slate-400">Generated by KB KHATA Platform</div>
                  </div>
                </div>
              ) : (
                /* === STANDARD CARBON VOUCHER PAPER FORMAT === */
                <div className="p-6 bg-white border-2 border-slate-900 font-sans text-xs text-slate-900 space-y-4">
                  <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                    <div>
                      <div className="text-xl font-black tracking-tight text-slate-900">KB KHATA & FASHIONS</div>
                      <div className="text-xs text-slate-600">Main Road, Tandoor, Dist: Mancherial, Telangana</div>
                      <div className="text-xs text-slate-600">Support: kb.official.admin@gmail.com • +91 6303185141</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-black px-2 py-0.5 bg-slate-100 border border-slate-300 inline-block">
                        VOUCHER #{activeReceiptOrder.orderNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {formatDateTime(activeReceiptOrder.orderDate)}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CUSTOMER</span>
                      <span className="font-bold text-slate-900">{customer?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">MEMBER ID & VILLAGE</span>
                      <span className="font-mono">{customer?.customerCode} • {customer?.villageName}</span>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReceiptOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="py-2 px-3 text-center">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{item.pricePerUnit}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">₹{item.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right">TOTAL INVOICE AMOUNT:</td>
                        <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(activeReceiptOrder.totalAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-1 px-3 text-right text-emerald-800">AMOUNT PAID:</td>
                        <td className="py-1 px-3 text-right font-mono text-emerald-800">{formatCurrency(activeReceiptOrder.paidAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-1 px-3 text-right text-rose-700">CREDIT (UDHAAR ADDED):</td>
                        <td className="py-1 px-3 text-right font-mono text-rose-700">{formatCurrency(activeReceiptOrder.creditAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Signatures & Official Verified Brand Seal */}
                  <div className="pt-6 flex items-center justify-between border-t border-slate-300">
                    <div className="text-center text-xs w-44">
                      <div className="border-t border-slate-400 pt-1 text-slate-500">Customer Signature</div>
                    </div>
                    <div className="flex justify-center">
                      <KbVerifiedSeal size="md" sealNumber={activeReceiptOrder.orderNumber} />
                    </div>
                    <div className="text-center text-xs w-44">
                      <div className="border-t border-slate-400 pt-1 text-slate-500">Authorized Signatory (KB Khata)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

