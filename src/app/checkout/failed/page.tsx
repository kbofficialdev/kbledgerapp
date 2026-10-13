"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft, ShieldAlert } from "lucide-react";

function CheckoutFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "";
  const reason = searchParams.get("reason") || "Payment was cancelled or rejected by your issuing bank.";
  const returnUrl = searchParams.get("returnUrl") || "/admin/billing";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center">
        {/* Failure Header */}
        <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-6 sm:p-8 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 stroke-[2.5]" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-mono font-bold uppercase tracking-wider">
            Transaction Not Completed
          </span>

          <h1 className="text-2xl font-extrabold tracking-tight">Payment Unsuccessful</h1>
          <p className="text-xs text-rose-100">
            No money has been deducted from your Khata ledger balance.
          </p>
        </div>

        {/* Details & Actions */}
        <div className="p-6 sm:p-8 space-y-5 text-xs text-slate-700">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Order ID</span>
              <span className="font-bold text-slate-900">{orderId || "ONLINE_ORDER"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Failure Reason</span>
              <span className="text-rose-600 font-semibold">{reason}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => router.back()}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Payment</span>
            </button>

            <Link
              href={returnUrl}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Billing Screen</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutFailedContent />
    </Suspense>
  );
}

