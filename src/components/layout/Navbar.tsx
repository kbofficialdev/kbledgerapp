"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  RotateCcw,
  Receipt,
  UserCheck,
  Menu,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import KbLogo from "../brand/KbLogo";

export const Navbar: React.FC = () => {
  const [hasDraft, setHasDraft] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const checkDraft = () => {
      try {
        const draft = localStorage.getItem("kb_draft_slip_active");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.items && parsed.items.length > 0 && parsed.items.some((i: any) => i.name || i.pricePerUnit)) {
            setHasDraft(true);
            return;
          }
        }
        setHasDraft(false);
      } catch (e) {
        setHasDraft(false);
      }
    };

    checkDraft();
    const interval = setInterval(checkDraft, 3000);

    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/auth/admin/status");
        const data = await res.json();
        if (data.isAuthenticated) {
          setIsAdminLoggedIn(true);
        } else {
          setIsAdminLoggedIn(false);
          localStorage.removeItem("kb_admin_session");
        }
      } catch (e) {
        const session = localStorage.getItem("kb_admin_session");
        setIsAdminLoggedIn(Boolean(session));
      }
    };

    checkAuthStatus();
    return () => clearInterval(interval);
  }, []);

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/auth/admin/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
    localStorage.removeItem("kb_admin_session");
    sessionStorage.clear();
    setIsAdminLoggedIn(false);
    window.location.replace("/admin/login");
  };

  const handleOpenMobileMenu = () => {
    window.dispatchEvent(new CustomEvent("kb:open-mobile-sidebar"));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] no-print transition-all">
      {/* Top Luminous Ambient Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 opacity-80" />

      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleOpenMobileMenu}
            aria-label="Open Navigation Menu"
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <KbLogo size="sm" />
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 font-mono">
              Live Counter
            </span>
          </div>
        </div>

        {/* Center: Restorable Draft Alert (Compact) */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-sm mx-2">
          {hasDraft && (
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200 rounded-full text-[11px] font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Unsaved Counter Slip (Click to Resume)</span>
            </Link>
          )}
        </div>

        {/* Right: Sleek Icon-Only Controls with English Tooltips */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. New Bill Button (F2) */}
          <div className="relative group">
            <Link
              href="/orders/new"
              aria-label="New Counter Bill (F2)"
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all relative"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 text-[8px] font-mono font-black bg-slate-900 text-white px-1 py-0.2 rounded-full border border-white/40 shadow-2xs">
                F2
              </span>
            </Link>

            {/* English Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <Receipt className="w-3 h-3 text-emerald-400" />
                New Bill (F2)
              </span>
              <span className="text-[10px] text-slate-400 font-sans">Create customer counter slip</span>
            </div>
          </div>

          {/* 2. Customer Khata Portal */}
          <div className="relative group">
            <Link
              href="/portal/login"
              aria-label="Customer Khata Portal"
              className="w-9 h-9 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 transition-all"
            >
              <Smartphone className="w-4 h-4" />
            </Link>

            {/* English Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-indigo-400" />
                Customer Portal
              </span>
              <span className="text-[10px] text-slate-400 font-sans">Self-pay ledger &amp; bills</span>
            </div>
          </div>

          {/* 3. Admin Center / Biometric Login */}
          <div className="relative group">
            <Link
              href={isAdminLoggedIn ? "/admin" : "/admin/login"}
              aria-label={isAdminLoggedIn ? "Admin Security Center" : "Admin Biometric Login"}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xs ${
                isAdminLoggedIn
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${isAdminLoggedIn ? "text-emerald-600" : "text-slate-600"}`}
              />
            </Link>

            {/* English Tooltip */}
            <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 right-3 sm:left-1/2 sm:-translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {isAdminLoggedIn ? "Admin Center (Active)" : "Admin Face Login (MFA)"}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                {isAdminLoggedIn ? "Manage security & audit logs" : "Biometric webcam verification"}
              </span>
            </div>
          </div>

          {/* 4. Admin Logout (Only when session active) */}
          {isAdminLoggedIn && (
            <div className="relative group">
              <button
                onClick={handleAdminLogout}
                aria-label="Logout Admin Session"
                className="w-9 h-9 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
              </button>

              {/* English Tooltip */}
              <div className="absolute top-full mt-2 right-0 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
                <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 rotate-45" />
                <span className="font-bold flex items-center gap-1 text-rose-300">
                  <LogOut className="w-3 h-3 text-rose-400" />
                  Logout Admin
                </span>
                <span className="text-[10px] text-slate-400 font-sans">Clear session &amp; lock admin</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

