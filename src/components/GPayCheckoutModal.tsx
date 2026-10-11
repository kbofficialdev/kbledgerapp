"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  QrCode,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone,
  CreditCard,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface GPayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  customerName: string;
  customerMobile?: string;
  customerId?: string;
  orderNumber?: string;
  onPaymentSuccess: (paymentData: {
    method: string;
    merchantTxnId: string;
    upiRefId?: string;
    bankRrn?: string;
    payerVpa?: string;
    gpayTransactionId?: string;
  }) => void;
}

export default function GPayCheckoutModal({
  isOpen,
  onClose,
  amount,
  customerName,
  customerMobile,
  customerId,
  orderNumber,
  onPaymentSuccess,
}: GPayCheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentData, setIntentData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [bankRrn, setBankRrn] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showRrnField, setShowRrnField] = useState(false);

  // 1. Fetch Google Pay Intent when modal opens
  useEffect(() => {
    if (!isOpen || amount <= 0) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setBankRrn("");
    setTimeLeft(15 * 60);

    fetch("/api/payments/gpay/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        customerId,
        customerName,
        customerMobile,
        orderNumber,
        note: `Payment for ${orderNumber || "KB Khata Counter Bill"}`,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setIntentData(data.data);
        } else {
          setError(data.error || "Failed to generate Google Pay QR");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Network error generating Google Pay QR");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, amount, customerId, customerName, customerMobile, orderNumber]);

  // 2. Countdown timer
  useEffect(() => {
    if (!isOpen || !intentData || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, intentData, timeLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 3. Confirm & Verify Payment Handler
  const handleVerifyPayment = async () => {
    if (!intentData) return;

    // If RRN provided, check 12-digit format
    if (bankRrn && !/^\d{12}$/.test(bankRrn.trim())) {
      setError("Bank RRN / UTR must be exactly 12 numeric digits.");
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const res = await fetch("/api/payments/gpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantTxnId: intentData.merchantTxnId,
          upiRefId: intentData.upiRefId,
          bankRrn: bankRrn.trim() || undefined,
          customerId,
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onPaymentSuccess({
          method: "GOOGLE_PAY_UPI",
          merchantTxnId: intentData.merchantTxnId,
          upiRefId: intentData.upiRefId,
          bankRrn: data.payment?.bankRrn || bankRrn.trim() || undefined,
          payerVpa: data.payment?.payerVpa || undefined,
          gpayTransactionId: data.payment?.gpayTransactionId || undefined,
        });
        onClose();
      } else {
        setError(data.error || "Payment verification failed. Please check status.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify transaction.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-200">
        {/* Modal Header with Google Pay Style */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-base tracking-tight text-white border border-white/20 shadow-xs">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-wide">Google Pay Business</h3>
                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-mono font-medium">
                  UPI Instant
                </span>
              </div>
              <p className="text-[11px] text-blue-100">Direct NPCI Settlement Gateway</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                ×
              </button>
            </div>
          )}

          {/* Amount Badge */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Collection Amount
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                {formatCurrency(amount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Khata Account
              </span>
              <p className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                {customerName}
              </p>
              {orderNumber && (
                <p className="text-[11px] font-mono text-slate-400">Order: #{orderNumber}</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Generating Secure Dynamic QR Code...</p>
            </div>
          ) : intentData ? (
            <>
              {/* Dynamic QR Display */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={intentData.qrCodeDataUrl}
                    alt="Google Pay UPI Dynamic QR"
                    className="w-56 h-56 object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white rounded-full p-1.5 shadow-md border border-slate-200 flex items-center justify-center">
                      <span className="font-black text-blue-600 text-xs">GPay</span>
                    </div>
                  </div>
                </div>

                {/* Merchant Verified and Timer Info */}
                <div className="mt-3 flex items-center justify-between w-full text-xs text-slate-500 px-2">
                  <div className="flex items-center gap-1.5 font-sans font-medium text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Store Merchant</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span className={timeLeft < 120 ? "text-rose-600 animate-pulse" : ""}>
                      {formattedTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct UPI Action Buttons for Tablets/Mobiles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={intentData.tezUri}
                  className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open G-Pay App</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(intentData.upiUri)}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy UPI Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bank RRN / UTR Input Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <button
                    type="button"
                    onClick={() => setShowRrnField(!showRrnField)}
                    className="text-slate-500 hover:text-slate-800 font-medium underline flex items-center gap-1"
                  >
                    <span>{showRrnField ? "Hide" : "+ Enter"} 12-Digit Bank RRN / UTR</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Optional for direct match</span>
                </div>

                {showRrnField && (
                  <div className="mt-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 428912345678"
                      value={bankRrn}
                      onChange={(e) => setBankRrn(e.target.value.replace(/\D/g, ""))}
                      className="kb-input py-2 px-3 font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      12-digit Retrieval Reference Number shown on customer Google Pay screen
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="kb-btn-secondary flex-1 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleVerifyPayment}
              disabled={verifying || loading || !intentData}
              className="kb-btn-gpay flex-2 py-2.5 text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying via NPCI...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify &amp; Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

