"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Shield, Users, CheckCircle, X, ArrowRight, Zap, Gift } from "lucide-react";
import { BrandAiTourIcon } from "@/components/brand/BrandIcons";

interface GrandOpeningAiTourModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function GrandOpeningAiTourModal({
  forceOpen = false,
  onClose,
}: GrandOpeningAiTourModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"admin" | "customer">("admin");

  useEffect(() => {
    setIsOpen(Boolean(forceOpen));
  }, [forceOpen]);

  const handleDismiss = () => {
    localStorage.setItem("kb_grand_opening_tour_seen_v2", "true");
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      {/* Flowing Festive Streamers / Ribbons Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 left-1/4 w-32 h-96 bg-gradient-to-b from-amber-400/30 via-pink-500/20 to-transparent rotate-45 transform blur-sm animate-pulse" />
        <div className="absolute -top-10 right-1/4 w-32 h-96 bg-gradient-to-b from-cyan-400/30 via-emerald-500/20 to-transparent -rotate-45 transform blur-sm animate-pulse delay-500" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl" />
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl" />
      </div>

      {/* Main Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Decorative Festive Top Ribbon */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-indigo-500 via-pink-500 via-amber-400 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Gift className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Grand Opening & AI System Launch
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
                KB KHATA & FASHIONS 2.0
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
              activeTab === "admin"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Store Administrator AI Services</span>
          </button>

          <button
            onClick={() => setActiveTab("customer")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
              activeTab === "customer"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Customer Portal AI Services</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === "admin" ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-emerald-950/30 dark:to-zinc-900 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Real-Time Business AI Copilot</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                  Empower shop operations with autonomous AI assistants that link directly into the live PostgreSQL ledger database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Ledger Risk Detection
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Identify prolonged Udhaar debts across villages and receive automatic credit limit alerts before creating new slips.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Cashfree Gateway Analytics
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Instantly reconcile collections, calculate daily settlement velocity, and detect payment dropouts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    Telugu Voice Transcription
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Real-time synthesis in Telugu (నగదు / ఉద్ధార) keeps customers informed at the counter upon bill finalization.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-amber-600" />
                    Biometric Face Lock
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hardware-free webcam biometrics protecting managerial operations against unauthorized tampering.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/30 dark:to-zinc-900 border border-indigo-200 dark:border-indigo-800/60">
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                  <Users className="w-4 h-4" />
                  <span>Transparent Self-Service for Village Buyers</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                  Dedicated customer portal offering complete transparency, itemized digital receipts, and flexible online payment options.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    Flexible Debt Settlement
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Customers can choose to pay single orders, select multiple bills, or enter a custom amount to clear outstanding credit.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Cashfree Instant Checkout
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pay securely using UPI apps (PhonePe, Google Pay, Paytm), debit cards, or net-banking directly in their mobile browser.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyan-600" />
                    Carbon Dot-Matrix Receipts
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Download authentic Bahi-Khata ledger slips formatted in high-contrast carbon matrix format without web clutter.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-pink-600" />
                    Passwordless OTP Access
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Simple mobile phone or email verification without cumbersome passwords.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            You can re-open this tour anytime from the left slide-in menu.
          </span>
          <button
            onClick={handleDismiss}
            className="py-2 px-5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

