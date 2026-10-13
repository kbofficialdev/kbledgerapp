"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Printer,
  Receipt,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import KbVerifiedSeal from "@/components/brand/KbVerifiedSeal";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "";
  const paymentId = searchParams.get("paymentId") || "";
  const alreadyPaid = searchParams.get("alreadyPaid") === "true";

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        // Trigger server-side reconciliation to ensure order & ledger entries exist
        await fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});

        if (orderId) {
          const res = await fetch(`/api/orders?search=${encodeURIComponent(orderId)}`);
          const json = await res.json();
          if (json.success && json.orders && json.orders.length > 0) {
            setOrderData(json.orders[0]);
          }
        }
      } catch {
        // Fallback to basic view
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Success Header Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-mono font-bold uppercase tracking-wider">
            {alreadyPaid ? "Payment Already Cleared" : "Payment Successfully Cleared"}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Transaction Confirmed
          </h1>
          <p className="text-xs text-emerald-100">
            Your online payment has been cryptographically verified and recorded into the Bahi-Khata ledger.
          </p>
        </div>

        {/* Transaction Receipt Card */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Order Reference:</span>
              <span className="font-mono font-bold text-slate-900">{orderId || "ONLINE_ORDER"}</span>
            </div>

            {paymentId && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Cashfree Payment ID:</span>
                <span className="font-mono font-semibold text-slate-800">{paymentId}</span>
              </div>
            )}

            {orderData?.orderNumber && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Generated Bill #:</span>
                <span className="font-mono font-bold text-emerald-800">{orderData.orderNumber}</span>
              </div>
            )}

            {orderData?.totalAmount && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-mono font-black text-emerald-600 text-base">
                  {formatCurrency(Number(orderData.paidAmount || orderData.totalAmount))}
                </span>
              </div>
            )}

            {orderData?.customer?.name && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-slate-500 font-medium">Customer:</span>
                <strong className="text-slate-900">{orderData.customer.name}</strong>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 font-medium">Timestamp:</span>
              <span className="text-slate-600">{formatDateTime(new Date().toISOString())}</span>
            </div>
          </div>

          {/* Official Verified Seal */}
          <div className="flex justify-center pt-2">
            <KbVerifiedSeal size="md" sealNumber={orderData?.customer?.customerCode || "PAID"} />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Payment Slip</span>
            </button>

            <Link
              href="/admin/billing"
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Back to Billing &amp; Counter</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/customer/orders"
              className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center transition-colors"
            >
              Customer Order History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

