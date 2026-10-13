"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Printer,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Receipt,
  Share2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface ReceiptData {
  orderId?: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerCode: string;
  customerMobile?: string;
  villageName: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    lineTotal: number;
  }>;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: string;
  paymentMethod: string;
  cashfreeOrderId?: string;
  previousBalance?: number;
  newBalance?: number;
  notes?: string;
}

function ReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");
  const { toast } = useToast();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipt() {
      try {
        setLoading(true);
        // 1. Check sessionStorage first
        const stored = sessionStorage.getItem("kb_last_receipt");
        if (stored) {
          const parsed = JSON.parse(stored);
          setReceipt(parsed);
          return;
        }

        // 2. Fallback: check queryOrderId
        if (queryOrderId) {
          const res = await fetch(`/api/orders?id=${queryOrderId}`);
          const data = await res.json();
          if (data.success && data.orders && data.orders.length > 0) {
            const ord = data.orders[0];
            setReceipt({
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              orderDate: ord.orderDate,
              customerName: ord.customerName,
              customerCode: ord.customerCode,
              customerMobile: ord.customerMobile,
              villageName: ord.villageName,
              items: ord.items,
              subtotal: ord.totalAmount,
              totalAmount: ord.totalAmount,
              paidAmount: ord.paidAmount,
              creditAmount: ord.creditAmount,
              paymentType: ord.paymentType,
              paymentMethod: ord.paymentType === "CREDIT" ? "KHATA_UDHAAR" : "CASH",
              notes: ord.notes,
            });
            return;
          }
        }

        // If neither exists, redirect to billing
        toast.info("No recent receipt to print. Starting a new bill.", "New Bill");
        router.replace("/admin/billing");
      } catch (err) {
        router.replace("/admin/billing");
      } finally {
        setLoading(false);
      }
    }

    loadReceipt();
  }, [queryOrderId, router, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !receipt) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Generating carbon dot-matrix slip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 bg-white min-h-[calc(100vh-5rem)]">
      {/* 1. TOP WEB CONTROLS & ACTION BAR (HIDDEN IN PRINT) */}
      <div className="no-print space-y-4">
        {/* Step Indicator */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/billing"
              className="flex items-center gap-2 text-slate-600 hover:text-black transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                ✓
              </span>
              <span className="text-sm font-semibold">Items & Auto-Calc</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                ✓
              </span>
              <span className="text-sm font-semibold">Payment</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-sm font-bold text-slate-900">Carbon Slip</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Bill (F2)</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  Billing Completed • Slip #{receipt.orderNumber}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  CONFIRMED
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Carbon print mode active. Click print to output clean slip without web chrome.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Carbon Receipt</span>
            </button>
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Next Bill</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. THE CARBON BILLING RECEIPT SLIP (ONLY THIS PRINTS) */}
      <div className="flex justify-center">
        <div className="carbon-receipt-print-area w-full max-w-xl bg-white border-2 border-dashed border-slate-800 p-6 sm:p-8 font-mono text-slate-900 text-xs shadow-sm">
          {/* Slip Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-700">
            <h2 className="text-base font-black tracking-wider uppercase">
              KB FASHIONS & TEXTILES
            </h2>
            <p className="text-[11px] font-bold">VILLAGE COMMERCE & BAHI-KHATA LEDGER</p>
            <p className="text-[10px] text-slate-600">Main Bazar Road, Rural Territory Station</p>
            <p className="text-[10px] text-slate-600">Phone: +91 98765 43210 • GSTIN: EXEMPT / RETAIL</p>
          </div>

          {/* Slip Metadata */}
          <div className="py-3 border-b border-dashed border-slate-700 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>SLIP NO : <strong>{receipt.orderNumber}</strong></span>
              <span>DATE: {formatDateTime(receipt.orderDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>CUSTOMER: <strong>{receipt.customerName}</strong> ({receipt.customerCode})</span>
              <span>VILLAGE: {receipt.villageName}</span>
            </div>
            {receipt.customerMobile && (
              <div>
                <span>CONTACT : {receipt.customerMobile}</span>
              </div>
            )}
            {receipt.cashfreeOrderId && (
              <div className="text-[10px] text-slate-600">
                <span>GATEWAY : CASHFREE [{receipt.cashfreeOrderId}]</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="py-3 border-b border-dashed border-slate-700">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-400 text-[10px] uppercase font-bold">
                  <th className="py-1">#</th>
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center">QTY</th>
                  <th className="py-1 text-right">RATE</th>
                  <th className="py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="text-[11px]">
                    <td className="py-1.5 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 font-bold">{item.name}</td>
                    <td className="py-1.5 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatCurrency(item.pricePerUnit)}
                    </td>
                    <td className="py-1.5 text-right font-bold">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals & Settlement */}
          <div className="py-3 border-b border-dashed border-slate-700 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span className="font-semibold">{formatCurrency(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>TAX / APPLICABLE CESS:</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between text-xs font-black border-t border-slate-300 pt-1">
              <span>BILL GRAND TOTAL:</span>
              <span>{formatCurrency(receipt.totalAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-emerald-800 font-bold">
              <span>PAID ({receipt.paymentMethod || receipt.paymentType}):</span>
              <span>{formatCurrency(receipt.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-rose-800 font-bold">
              <span>CREDIT ADDED (UDHAAR):</span>
              <span>{formatCurrency(receipt.creditAmount)}</span>
            </div>
          </div>

          {/* Customer Ledger Balance Status */}
          <div className="py-3 border-b border-dashed border-slate-700 space-y-1 text-[11px]">
            {receipt.previousBalance !== undefined && (
              <div className="flex justify-between text-slate-600">
                <span>PREVIOUS UDHAAR BALANCE:</span>
                <span>{formatCurrency(receipt.previousBalance)}</span>
              </div>
            )}
            {receipt.newBalance !== undefined && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>NET CURRENT BALANCE DUE:</span>
                <span className="text-rose-700">{formatCurrency(receipt.newBalance)}</span>
              </div>
            )}
            {receipt.notes && (
              <div className="pt-1 text-[10px] text-slate-600 italic">
                <span>REMARKS: {receipt.notes}</span>
              </div>
            )}
          </div>

          {/* Signatures & Footer Notice */}
          <div className="pt-8 space-y-6">
            <div className="flex justify-between items-end text-[11px]">
              <div className="text-center">
                <div className="w-36 border-t border-slate-500 pt-1 font-bold">
                  CUSTOMER SIGN
                </div>
              </div>
              <div className="text-center">
                <div className="w-36 border-t border-slate-500 pt-1 font-bold">
                  AUTHORIZED SIGN
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-2">
              <p>*** Computerized Carbon Bahi-Khata Receipt ***</p>
              <p>Goods once sold can be exchanged within 7 days with bill.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}

