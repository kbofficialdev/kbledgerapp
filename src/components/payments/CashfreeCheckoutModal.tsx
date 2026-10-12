"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, ShieldCheck, CheckCircle2, X } from "lucide-react";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

interface CashfreeCheckoutModalProps {
  isOpen?: boolean;
  onClose: () => void;
  orderId: string;
  paymentSessionId: string;
  amount: number;
  customerName?: string;
  customerMobile?: string;
  onSuccess?: (orderId: string, paymentId?: string) => void;
  onFailure?: (error: any) => void;
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentFailure?: (error: any) => void;
}

export default function CashfreeCheckoutModal({
  isOpen = true,
  onClose,
  orderId,
  paymentSessionId,
  amount,
  customerName,
  customerMobile,
  onSuccess,
  onFailure,
  onPaymentSuccess,
  onPaymentFailure,
}: CashfreeCheckoutModalProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Load official Cashfree SDK v3 script
  useEffect(() => {
    if (!isOpen) return;

    if (window.Cashfree) {
      setSdkLoaded(true);
      return;
    }

    const scriptId = "cashfree-sdk-v3";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => setSdkError("Failed to load official Cashfree payment gateway SDK.");
    document.body.appendChild(script);
  }, [isOpen]);

  const verifyPaymentOnBackend = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.verified || data.success) {
        setVerifiedSuccess(true);
        if (onPaymentSuccess) onPaymentSuccess(data);
        if (onSuccess) onSuccess(orderId, data.payment?.cf_payment_id);
      } else {
        if (onPaymentFailure) onPaymentFailure(data);
        if (onFailure) onFailure(data.error || "Payment verification failed");
      }
    } catch (e: any) {
      if (onPaymentFailure) onPaymentFailure(e);
      if (onFailure) onFailure(e?.message || "Verification request failed");
    } finally {
      setVerifying(false);
    }
  };

  const launchCashfreeCheckout = () => {
    if (!window.Cashfree) {
      setSdkError("Cashfree SDK is not available yet.");
      return;
    }

    try {
      const cashfree = window.Cashfree({
        mode: "sandbox", // official sandbox mode
      });

      cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_modal",
      }).then((result: any) => {
        if (result.error) {
          console.error("Cashfree Checkout Error:", result.error);
          setSdkError(result.error.message || "Payment process interrupted.");
          if (onFailure) onFailure(result.error.message || "Payment failed");
        }
        if (result.redirect) {
          console.log("Cashfree redirect initiated");
        }
        if (result.paymentDetails) {
          console.log("Payment Details:", result.paymentDetails);
          verifyPaymentOnBackend();
        }
      });
    } catch (err: any) {
      setSdkError(err.message || "Failed to initialize Cashfree modal.");
    }
  };

  useEffect(() => {
    if (isOpen && sdkLoaded && paymentSessionId) {
      // Auto-trigger checkout when ready
      launchCashfreeCheckout();
    }
  }, [isOpen, sdkLoaded, paymentSessionId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Cashfree Payments Gateway
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {verifiedSuccess ? (
            <div className="space-y-3 py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Payment Verified Successfully!
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                ₹{amount.toFixed(2)} has been recorded into the customer's ledger.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-md bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : verifying ? (
            <div className="space-y-3 py-6">
              <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Reconciling payment with Cashfree servers...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">{orderId}</span>
                </div>
                {customerName && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Customer</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{customerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-zinc-700 font-semibold">
                  <span className="text-slate-700 dark:text-zinc-300">Payable Amount</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    ₹{amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {sdkError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sdkError}</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={launchCashfreeCheckout}
                  disabled={!sdkLoaded}
                  className="w-full py-2.5 px-4 rounded-md bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {!sdkLoaded ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading Gateway Elements...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Pay via Cashfree (UPI / Cards / NetBanking)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={verifyPaymentOnBackend}
                  className="w-full py-1.5 px-3 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Verify Status (I Have Paid)
                </button>
              </div>

              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Secured by Cashfree Payments sandbox environment (NPCI & PCI-DSS)</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
