"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, ShieldCheck, Smartphone, Search, AlertCircle } from "lucide-react";
import KbLogo from "@/components/brand/KbLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative overflow-hidden">
      {/* Ambient Mesh Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center space-y-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="flex justify-center">
          <KbLogo size="md" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ERROR 404 • NOT FOUND</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white pt-1">
            Page Does Not Exist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            The page, customer khata account, or bill you are looking for is either unavailable or has moved to a new route.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <Link
            href="/customer"
            className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:-translate-y-0.5 hover:shadow-2xs transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>Customer Khata</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 text-indigo-800 dark:text-indigo-300 text-xs font-semibold hover:-translate-y-0.5 hover:shadow-2xs transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Store Admin</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Secure Authentication</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

