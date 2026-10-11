"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  ShieldCheck,
  FileText,
  Smartphone,
  Sparkles,
  Lock,
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

      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Live Mode Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <KbLogo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
              Counter Active
            </span>
          </div>
        </div>

        {/* Center: Restorable Draft Alert */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-2">
          {hasDraft && (
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200 rounded-full text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-100 transition-all animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Unsaved Bill Slip Restorable (Click to Resume)</span>
            </Link>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Customer Portal Link */}
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 transition-all shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Customer Portal</span>
            <span className="sm:hidden">Portal</span>
          </Link>

          {/* New Counter Bill F2 */}
          <Link
            href="/orders/new"
            className="kb-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-sm hover:shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Bill</span>
            <span className="font-mono text-[10px] bg-white/20 px-1 py-0.2 rounded font-bold ml-1 hidden sm:inline">
              F2
            </span>
          </Link>

          {/* Admin Face Auth Badge */}
          <Link
            href="/admin/login"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isAdminLoggedIn
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${isAdminLoggedIn ? "text-emerald-600" : "text-slate-500"}`}
            />
            <span className="hidden sm:inline">
              {isAdminLoggedIn ? "Admin Active" : "Face Login"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
