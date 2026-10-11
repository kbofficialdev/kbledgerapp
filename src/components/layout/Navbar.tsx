"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Bot,
  RotateCcw,
  Receipt,
  UserCheck,
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

    const session = localStorage.getItem("kb_admin_session");
    if (session) {
      setIsAdminLoggedIn(true);
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] no-print transition-all">
      {/* Top Luminous Ambient Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 opacity-80" />

      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Live Status */}
        <div className="flex items-center gap-3">
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

        {/* Right: Sleek Icon-Only Controls with Smart Tooltips */}
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

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <Receipt className="w-3 h-3 text-emerald-400" />
                New Bill (F2)
              </span>
              <span className="text-[10px] text-slate-300 font-sans">కొత్త కౌంటర్ బిల్లు రాయండి</span>
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

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-indigo-400" />
                Customer Portal
              </span>
              <span className="text-[10px] text-slate-300 font-sans">కస్టమర్ సెల్ఫ్-పే &amp; బిల్లులు</span>
            </div>
          </div>

          {/* 3. KB AI Business Advisor */}
          <div className="relative group">
            <Link
              href="/admin/ai"
              aria-label="KB AI Business Advisor"
              className="w-9 h-9 rounded-xl bg-violet-50/80 hover:bg-violet-100/90 border border-violet-200/80 text-violet-700 flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 transition-all"
            >
              <Bot className="w-4 h-4" />
            </Link>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-400" />
                KB AI Advisor
              </span>
              <span className="text-[10px] text-slate-300 font-sans">జెమిని AI వ్యాపార సలహాదారు</span>
            </div>
          </div>

          {/* 4. Admin Biometric Login (Face ID + MFA) */}
          <div className="relative group">
            <Link
              href="/admin/login"
              aria-label="Admin Biometric Login"
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

            {/* Tooltip */}
            <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 shadow-xl z-50 flex flex-col items-center">
              <div className="absolute -top-1 right-3 sm:left-1/2 sm:-translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {isAdminLoggedIn ? "Admin Session Active" : "Admin Face Login (MFA)"}
              </span>
              <span className="text-[10px] text-slate-300 font-sans">ఫేస్ రికగ్నిషన్ &amp; ఈమెయిల్ OTP</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
