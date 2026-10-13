"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import KbLogo from "@/components/brand/KbLogo";
import { useToast } from "@/context/ToastContext";

interface UnifiedAuthCardProps {
  initialTab?: "customer" | "admin";
}

export default function UnifiedAuthCard({ initialTab = "customer" }: UnifiedAuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const queryTab = searchParams.get("tab") || searchParams.get("role");
  const [activeTab, setActiveTab] = useState<"customer" | "admin">(
    queryTab === "admin" ? "admin" : queryTab === "customer" ? "customer" : initialTab
  );

  const handleTabChange = (tab: "customer" | "admin") => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  // =========================================================================
  // 1. CUSTOMER KHATA LOGIN (Mobile / Email + OTP)
  // =========================================================================
  const [custStep, setCustStep] = useState<"identifier" | "otp">("identifier");
  const [custIdentifier, setCustIdentifier] = useState("");
  const [custOtp, setCustOtp] = useState("");
  const [custMaskedEmail, setCustMaskedEmail] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);
  const [custSuccess, setCustSuccess] = useState<string | null>(null);
  const [custTimer, setCustTimer] = useState(0);

  useEffect(() => {
    if (custTimer <= 0) return;
    const interval = setInterval(() => setCustTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [custTimer]);

  const handleSendCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custLoading) return;
    if (!custIdentifier.trim()) {
      const msg = "Please enter your registered mobile number or email.";
      setCustError(msg);
      toast.warning(msg, "Input Required");
      return;
    }

    setCustLoading(true);
    setCustError(null);
    setCustSuccess(null);

    try {
      const res = await fetch("/api/customer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: custIdentifier.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setCustMaskedEmail(data.maskedEmail);
        setCustStep("otp");
        setCustTimer(60);
        const msg = `Verification code sent to ${data.maskedEmail}`;
        setCustSuccess(msg);
        toast.success(msg, "OTP Dispatched");
      } else {
        const err = data.error || "Failed to send verification code.";
        setCustError(err);
        toast.error(err, "Authentication Error");
      }
    } catch (err: any) {
      const msg = err.message || "Network error. Please try again.";
      setCustError(msg);
      toast.error(msg, "Network Error");
    } finally {
      setCustLoading(false);
    }
  };

  const handleVerifyCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custLoading) return;
    if (!custOtp.trim() || custOtp.trim().length !== 6) {
      const msg = "Please enter the complete 6-digit verification code.";
      setCustError(msg);
      toast.warning(msg, "Incomplete OTP");
      return;
    }

    setCustLoading(true);
    setCustError(null);

    try {
      const res = await fetch("/api/customer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: custIdentifier.trim(),
          otp: custOtp.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.authSuccess("Welcome back! Loading your secure Khata account...", "Access Granted");
        window.location.replace("/customer");
      } else {
        const err = data.error || "Invalid OTP code. Please retry.";
        setCustError(err);
        toast.authError(err, "Verification Failed");
      }
    } catch (err: any) {
      const msg = err.message || "Network error during verification.";
      setCustError(msg);
      toast.error(msg, "Network Error");
    } finally {
      setCustLoading(false);
    }
  };

  // =========================================================================
  // 2. STORE ADMIN LOGIN (Email / Mobile OTP + Master PIN)
  // =========================================================================
  const [adminMode, setAdminMode] = useState<"otp" | "pin">("otp");
  const [adminStep, setAdminStep] = useState<"send" | "verify">("send");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMaskedEmail, setAdminMaskedEmail] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminTimer, setAdminTimer] = useState(0);

  useEffect(() => {
    if (adminTimer <= 0) return;
    const interval = setInterval(() => setAdminTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [adminTimer]);

  const handleSendAdminOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminLoading) return;
    if (!adminEmail.trim()) {
      const msg = "Please enter your administrator email, mobile number, or username.";
      setAdminError(msg);
      toast.warning(msg, "Input Required");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const res = await fetch("/api/admin/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: adminEmail.trim(),
          email: adminEmail.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAdminMaskedEmail(data.maskedEmail);
        setAdminStep("verify");
        setAdminTimer(60);
        const msg = `Security code sent to ${data.maskedEmail}`;
        setAdminSuccess(msg);
        toast.success(msg, "OTP Dispatched");
      } else {
        const err = data.error || "Failed to dispatch administrator code.";
        setAdminError(err);
        toast.error(err, "Dispatch Failed");
      }
    } catch {
      setAdminError("Network error sending admin OTP.");
      toast.error("Network error sending OTP", "Connection Error");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleVerifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLoading) return;
    if (!adminOtp.trim() || adminOtp.trim().length !== 6) {
      const msg = "Please enter the complete 6-digit OTP code.";
      setAdminError(msg);
      toast.warning(msg, "Incomplete Code");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: adminOtp.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.sessionToken) {
          localStorage.setItem("kb_admin_session", data.sessionToken);
        }
        toast.authSuccess("Welcome back, Administrator!", "Access Approved");
        const fromTarget = searchParams.get("from") || "/admin";
        window.location.replace(fromTarget);
      } else {
        const err = data.error || "Invalid OTP code. Please retry.";
        setAdminError(err);
        toast.authError(err, "Verification Failed");
      }
    } catch {
      setAdminError("Network error during verification.");
      toast.authError("Network error verifying OTP", "Connection Error");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleVerifyAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLoading) return;
    if (!adminPin.trim()) {
      const msg = "Please enter your administrator PIN.";
      setAdminError(msg);
      toast.warning(msg, "Input Required");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.sessionToken) {
          localStorage.setItem("kb_admin_session", data.sessionToken);
        }
        toast.authSuccess("PIN Verified. Access granted.", "Authorized");
        const fromTarget = searchParams.get("from") || "/admin";
        window.location.replace(fromTarget);
      } else {
        const err = data.error || "Invalid administrator PIN.";
        setAdminError(err);
        toast.authError(err, "Authorization Denied");
      }
    } catch {
      setAdminError("Network error verifying PIN.");
      toast.authError("Network error verifying PIN", "Connection Error");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Modern Black & White Card */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-none">
        
        {/* Card Header & Brand */}
        <div className="p-6 sm:p-7 pb-4 border-b border-zinc-100 dark:border-zinc-900 text-center space-y-3">
          <div className="flex justify-center">
            <KbLogo size="md" />
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Secure Ledger &amp; Commerce Platform
          </p>

          {/* Monochrome Pill Tab Switcher */}
          <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center gap-1 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => handleTabChange("customer")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "customer"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-none"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "admin"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-none"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CUSTOMER KHATA PORTAL LOGIN (Mobile/Email + OTP)             */}
        {/* =================================================================== */}
        {activeTab === "customer" && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Customer Ledger
              </span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 pt-1">
                {custStep === "identifier"
                  ? "Sign In to Your Khata"
                  : "Enter 6-Digit Code"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {custStep === "identifier"
                  ? "Enter your unique mobile number or email to receive a secure login code."
                  : `Verification code sent to ${custMaskedEmail}`}
              </p>
            </div>

            {/* Error & Success Toasters/Banners */}
            {custError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{custError}</span>
              </div>
            )}

            {custSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-medium">{custSuccess}</span>
              </div>
            )}

            {custStep === "identifier" ? (
              <form onSubmit={handleSendCustomerOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Enter registered mobile number or email"
                      value={custIdentifier}
                      onChange={(e) => setCustIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors font-mono"
                    />
                    <Smartphone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    A secure 6-digit OTP will be dispatched to your registered email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={custLoading}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-none"
                >
                  {custLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Login Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCustomerOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Enter 6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustStep("identifier")}
                      className="text-xs text-zinc-500 hover:text-black dark:hover:text-white inline-flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Change Mobile</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    autoFocus
                    maxLength={6}
                    required
                    placeholder="• • • • • •"
                    value={custOtp}
                    onChange={(e) =>
                      setCustOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Didn&apos;t receive code?</span>
                  {custTimer > 0 ? (
                    <span className="font-mono text-zinc-400">
                      Resend in {custTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCustomerOtp}
                      disabled={custLoading}
                      className="text-black dark:text-white font-semibold hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={custLoading || custOtp.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-none"
                >
                  {custLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Customer Khata</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: STORE ADMINISTRATOR LOGIN (Email OTP or Master PIN)          */}
        {/* =================================================================== */}
        {activeTab === "admin" && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 text-white border border-zinc-800">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Store Admin Portal
              </span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 pt-1">
                {adminMode === "otp"
                  ? adminStep === "send"
                    ? "Administrator Sign In"
                    : "Enter Admin Security Code"
                  : "Emergency Manager PIN"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {adminMode === "otp"
                  ? adminStep === "send"
                    ? "Log in securely using a 6-digit one-time password sent to your admin email."
                    : `Enter the 6-digit security code sent to ${adminMaskedEmail}`
                  : "Enter the master manager PIN for immediate dashboard access."}
              </p>
            </div>

            {/* Error & Success Toasters/Banners */}
            {adminError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-medium">{adminSuccess}</span>
              </div>
            )}

            {adminMode === "otp" ? (
              adminStep === "send" ? (
                <form onSubmit={handleSendAdminOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Store Administrator Email, Mobile, or Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="Enter administrator email, mobile, or username"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors"
                      />
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-none"
                  >
                    {adminLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Admin OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => setAdminMode("pin")}
                      className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold hover:text-black dark:hover:text-white inline-flex items-center gap-1 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Use Master Backup PIN</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyAdminOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Enter 6-Digit Admin OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setAdminStep("send")}
                        className="text-xs text-zinc-500 hover:text-black dark:hover:text-white inline-flex items-center gap-1 font-medium"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      autoFocus
                      maxLength={6}
                      required
                      placeholder="• • • • • •"
                      value={adminOtp}
                      onChange={(e) =>
                        setAdminOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                      }
                      className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Didn&apos;t receive code?</span>
                    {adminTimer > 0 ? (
                      <span className="font-mono text-zinc-400">
                        Resend in {adminTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendAdminOtp()}
                        disabled={adminLoading}
                        className="text-black dark:text-white font-semibold hover:underline"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoading || adminOtp.length !== 6}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-none"
                  >
                    {adminLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Admin Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )
            ) : (
              /* PIN FALLBACK FORM */
              <form onSubmit={handleVerifyAdminPin} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Master Administrator PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminMode("otp")}
                      className="text-xs text-zinc-500 hover:text-black dark:hover:text-white inline-flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back to Email OTP</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      autoFocus
                      required
                      placeholder="Enter 6-digit PIN"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-colors"
                    />
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading || !adminPin}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-none"
                >
                  {adminLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize with PIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Card Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900 text-center">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Encrypted session security • Role-based access control (RBAC)
          </p>
        </div>
      </div>
    </div>
  );
}
