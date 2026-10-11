"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Search, ShieldCheck, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import KbLogo from "../brand/KbLogo";

export const Navbar: React.FC = () => {
  const [hasDraft, setHasDraft] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    // Check if uncommitted draft exists in localStorage
    const checkDraft = () => {
      try {
        const draft = localStorage.getItem("kb_draft_slip_active");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.items && parsed.items.length > 0) {
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

    // Check admin session
    const session = localStorage.getItem("kb_admin_session");
    if (session) {
      setIsAdminLoggedIn(true);
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-soft no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <KbLogo size="md" />
        </Link>

        {/* Center / Search & Draft Indicator */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
          {hasDraft && (
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-xs font-medium text-amber-800 animate-pulse hover:bg-amber-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Unsaved Bill Draft Restorable</span>
            </Link>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* New Bill Button */}
          <Link
            href="/orders/new"
            className="kb-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Counter Bill</span>
            <span className="sm:hidden">New Bill</span>
          </Link>

          {/* Admin Login / Profile Status */}
          <Link
            href="/admin/login"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
              isAdminLoggedIn
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${isAdminLoggedIn ? "text-emerald-600" : "text-slate-500"}`} />
            <span className="hidden sm:inline">
              {isAdminLoggedIn ? "Admin Verified" : "Admin Face Login"}
            </span>
            <span className="sm:hidden">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
