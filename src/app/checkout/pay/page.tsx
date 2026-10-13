"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Receipt,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import CashfreeCheckoutModal from "@/components/payments/CashfreeCheckoutModal";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import KbVerifiedSeal from "@/components/brand/KbVerifiedSeal";

interface ValidatedCheckoutData {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  orderType: string;
  paymentSessionId: string;
  gateway: string;
  environment: "sandbox" | "production";
  returnUrl: string;
  cancelUrl: string;
  notes?: string;
  expiresAt: number;
  customer: {
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    email?: string;
    villageName?: string;
    currentBalance: number;
  };
  paymentRecord?: {
    status: string;
    amount: number;
    paymentRef: string;
  } | null;
}

function CheckoutPayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ValidatedCheckoutData | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (!token) {
      setError({
        message: "Missing checkout security token. Unofficial or unverified payment requests are strictly blocked.",
        code: "ERR_TOKEN_MISSING",
      });
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/checkout/validate?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!json.success || !json.payload) {
          setError({
            message: json.error || "Invalid or tampered payment session token.",
            code: json.code || "ERR_SECURITY_VIOLATION",
          });
          return;
        }

        const payload: ValidatedCheckoutData = json.payload;
        setData(payload);

        // Check if already paid
        if (payload.paymentRecord?.status === "SUCCESS") {
          router.replace(
            `/checkout/success?orderId=${encodeURIComponent(payload.orderId)}&alreadyPaid=true`
          );
          return;
        }

        // Setup countdown timer
        const now = Math.floor(Date.now() / 1000);
        const diff = Math.max(0, payload.expiresAt - now);
        setSecondsRemaining(diff);
      } catch (err: any) {
        setError({
          message: err.message || "Failed to establish secure payment handshake with server.",
          code: "ERR_NETWORK_HANDSHAKE",
        });
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, router]);

  // Countdown clock effect
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const handlePaymentSuccess = async (cfOrderId: string, cfPaymentId?: string) => {
    if (settling) return;
    setSettling(true);
    try {
      // Reconcile and redirect to dedicated success page
      const res = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: cfOrderId,
          paymentId: cfPaymentId,
        }),
      });
      const resData = await res.json().catch(() => ({}));

      const targetUrl =
        data?.returnUrl ||
        `/checkout/success?orderId=${encodeURIComponent(cfOrderId)}&paymentId=${encodeURIComponent(
          cfPaymentId || ""
        )}`;

      router.replace(targetUrl);
    } catch {
      router.replace(
        `/checkout/success?orderId=${encodeURIComponent(cfOrderId)}&paymentId=${encodeURIComponent(
          cfPaymentId || ""
        )}`
      );
    }
  };

  const handlePaymentFailure = (errMsg: string) => {
    if (!data) return;
    const failUrl = `/checkout/failed?orderId=${encodeURIComponent(
      data.orderId
    )}&reason=${encodeURIComponent(errMsg || "Payment rejected by bank")}&returnUrl=${encodeURIComponent(
      data.cancelUrl
    )}`;
    router.replace(failUrl);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight">Securing Payment Gateway Session...</h2>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          Verifying HMAC signature &amp; customer database authorization
        </p>
      </div>
    );
  }

  // 2. Security Error State (Blocks all unofficial asks)
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Security Protocol Enforced • 403 Forbidden
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Unauthorized Payment Access Blocked
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {error?.message || "Invalid or tampered payment request. For safety, direct URL tampering and unofficial requests are completely blocked."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left font-mono text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-500 font-bold uppercase text-[10px]">Security Incident Diagnostics</div>
            <div>Error Code: <span className="text-rose-400">{error?.code || "ERR_SECURITY_VIOLATION"}</span></div>
            <div>Status: <span className="text-amber-400">HMAC Validation Failed</span></div>
            <div>Timestamp: <span className="text-slate-300">{new Date().toISOString()}</span></div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all"
            >
              Return to Safe Homepage
            </Link>
            <Link
              href="/admin/billing"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-all"
            >
              Return to Counter Billing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Session Expired State
  if (secondsRemaining !== null && secondsRemaining <= 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold">Payment Session Expired</h2>
          <p className="text-xs text-slate-300">
            For security, payment sessions expire after 20 minutes. Please return to the billing or Khata portal and generate a new payment link.
          </p>
          <button
            onClick={() => router.push(data.cancelUrl || "/admin/billing")}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
          >
            Generate Fresh Session
          </button>
        </div>
      </div>
    );
  }

  const minutesLeft = secondsRemaining ? Math.floor(secondsRemaining / 60) : 20;
  const secondsMod = secondsRemaining ? secondsRemaining % 60 : 0;
  const timeFormatted = `${minutesLeft}:${secondsMod < 10 ? "0" : ""}${secondsMod}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between">
      {/* 1. TOP HIGH-SECURITY HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 py-3.5 px-4 sm:px-8 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
              KB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">KB Khata &amp; Fashions</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  Secure Checkout
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Official Payment Gateway • 256-Bit SSL End-to-End Encrypted
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Session Expires in: </span>
              <strong className="text-amber-300 font-bold">{timeFormatted}</strong>
            </div>

            <button
              onClick={() => {
                if (window.confirm("Cancel this payment and return to previous page?")) {
                  router.push(data.cancelUrl || "/");
                }
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel &amp; Return
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CHECKOUT WORKSPACE (2-COLUMN SECURE LAYOUT) */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Verified Order Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Verified Order ID
                </span>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {data.orderId}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Active
              </span>
            </div>

            {/* Total Payable Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Amount Payable Now
              </span>
              <div className="text-3xl font-black font-mono text-emerald-400">
                {formatCurrency(data.amount)}
              </div>
              <p className="text-[11px] text-slate-400">
                Includes all applicable taxes &amp; zero surcharge
              </p>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 text-xs">
              <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                Customer Information
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Name:
                </span>
                <strong className="text-slate-900">{data.customer.name}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Mobile:
                </span>
                <span className="font-mono font-bold text-slate-900">{data.customer.mobile}</span>
              </div>

              {data.customer.villageName && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Village Territory:
                  </span>
                  <span className="text-purple-900 font-semibold">{data.customer.villageName}</span>
                </div>
              )}

              {data.notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                  &ldquo;{data.notes}&rdquo;
                </div>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>PCI-DSS Level 1 &amp; RBI Compliant</span>
              </div>
              <KbVerifiedSeal size="sm" sealNumber={data.customer.customerCode || "VERIFIED"} />
            </div>
          </div>
        </div>

        {/* Right Column: Dedicated Cashfree v3 Custom Elements Gateway */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white">
                  <BrandCashfreeIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Select Payment Method
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Instant clearance via UPI QR, Google Pay / PhonePe, Cards or NetBanking
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold">
                {data.environment}
              </span>
            </div>

            {/* In-Page Isolated Custom Elements */}
            <CashfreeCheckoutModal
              isOpen={true}
              paymentSessionId={data.paymentSessionId}
              orderId={data.orderId}
              amount={data.amount}
              customerName={data.customer.name}
              customerMobile={data.customer.mobile}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
              onBackToSelection={() => {
                if (window.confirm("Cancel payment and go back?")) {
                  router.push(data.cancelUrl || "/");
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <p>
          &copy; {new Date().getFullYear()} KB Khata &amp; Fashions • All transactions are cryptographically verified and backed by ACID PostgreSQL ledgers.
        </p>
      </footer>
    </div>
  );
}

export default function CheckoutPayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutPayContent />
    </Suspense>
  );
}

