"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowRight, Smartphone, ShieldCheck, Sparkles } from "lucide-react";
import KbLogo from "@/components/brand/KbLogo";
import {
  BrandBillingIcon,
  BrandAnalyticsIcon,
  BrandCustomersIcon,
  BrandCashfreeIcon,
  BrandReportsIcon,
  BrandShieldIcon,
  BrandAiTourIcon,
} from "@/components/brand/BrandIcons";

interface LeftSlideInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTour?: () => void;
}

export default function LeftSlideInDrawer({
  isOpen,
  onClose,
  onOpenTour,
}: LeftSlideInDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname]);

  if (!isOpen) return null;

  const menuSections = [
    {
      title: "Billing & Counter",
      subtitle: "Offline itemized slips & auto-calculation",
      href: "/admin/billing",
      icon: BrandBillingIcon,
      accent: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800",
      iconColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60",
      badge: "F2",
      badgeColor: "bg-emerald-600 text-white",
    },
    {
      title: "Analytical Dashboard",
      subtitle: "Turnover, outstanding debt & revenue graphs",
      href: "/admin",
      icon: BrandAnalyticsIcon,
      accent: "from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60",
      badge: "Live",
      badgeColor: "bg-blue-600 text-white",
    },
    {
      title: "AI Business Advisor",
      subtitle: "Store analytics, debt ranking & Gemini advice",
      href: "/admin/ai",
      icon: BrandAiTourIcon,
      accent: "from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/20 border-pink-200 dark:border-pink-800",
      iconColor: "text-pink-700 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/60",
      badge: "AI",
      badgeColor: "bg-pink-600 text-white",
    },
    {
      title: "Customers & Villages",
      subtitle: "Unified customer ledger & village territory hub",
      href: "/admin/customers",
      icon: BrandCustomersIcon,
      accent: "from-purple-50 to-fuchsia-50 dark:from-purple-950/40 dark:to-fuchsia-950/20 border-purple-200 dark:border-purple-800",
      iconColor: "text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60",
      badge: "Unified",
      badgeColor: "bg-purple-600 text-white",
    },
    {
      title: "Carbon Reports",
      subtitle: "Customer & village date-range print statements",
      href: "/admin/reports",
      icon: BrandReportsIcon,
      accent: "from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/20 border-cyan-200 dark:border-cyan-800",
      iconColor: "text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/60",
      badge: "Carbon",
      badgeColor: "bg-cyan-700 text-white",
    },
    {
      title: "Cashfree Payments",
      subtitle: "UPI, Cards & NetBanking collection gateway",
      href: "/admin/payments",
      icon: BrandCashfreeIcon,
      accent: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border-amber-200 dark:border-amber-800",
      iconColor: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60",
      badge: "PG",
      badgeColor: "bg-amber-600 text-white",
    },
    {
      title: "Support Tickets",
      subtitle: "Customer enquiries & resolution tracking",
      href: "/admin/tickets",
      icon: BrandShieldIcon,
      accent: "from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800",
      iconColor: "text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60",
      badge: "Tickets",
      badgeColor: "bg-indigo-600 text-white",
    },
    {
      title: "Village Collections",
      subtitle: "Field collection print sheet & Excel bulk update",
      href: "/admin/reports/village-collection",
      icon: BrandReportsIcon,
      accent: "from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800",
      iconColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60",
      badge: "Field",
      badgeColor: "bg-emerald-700 text-white",
    },
    {
      title: "Security & Biometrics",
      subtitle: "Webcam facial vector & audit logs",
      href: "/admin/security",
      icon: BrandShieldIcon,
      accent: "from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/20 border-rose-200 dark:border-rose-800",
      iconColor: "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60",
      badge: "MFA",
      badgeColor: "bg-rose-600 text-white",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-In Modal Drawer Surface */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Drawer Header (Only Brand Logo + Close Button) */}
        <div className="h-16 px-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <Link href="/admin" onClick={onClose} className="flex items-center gap-2">
            <KbLogo size="sm" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Colored Service Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">
            Store Management Modules
          </div>

          <div className="space-y-2.5">
            {menuSections.map((sec) => {
              const isActive = pathname === sec.href || pathname.startsWith(`${sec.href}/`);
              const Icon = sec.icon;

              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  onClick={onClose}
                  className={`group block p-3.5 rounded-xl border bg-gradient-to-r transition-all duration-200 hover:scale-[1.01] hover:shadow-sm ${sec.accent} ${
                    isActive ? "ring-2 ring-slate-900 dark:ring-white" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${sec.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{sec.title}</span>
                          {sec.badge && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${sec.badgeColor}`}>
                              {sec.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          {sec.subtitle}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Special Card: Grand Opening AI Tour */}
          {onOpenTour && (
            <button
              onClick={() => {
                onClose();
                onOpenTour();
              }}
              className="w-full text-left p-3.5 rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 via-purple-50 to-white dark:from-pink-950/30 dark:to-zinc-900 hover:scale-[1.01] transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300">
                    <BrandAiTourIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>Grand Opening & AI Tour</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-600 text-white">
                        Special
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Explore AI intelligence features for Admin & Customer
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-pink-600 group-hover:rotate-12 transition-transform" />
              </div>
            </button>
          )}

          {/* Quick link to Customer Portal */}
          <Link
            href="/customer"
            onClick={onClose}
            className="block p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                Customer Khata Self-Service
              </span>
              <span className="text-[10px] text-slate-400">Open Portal →</span>
            </div>
          </Link>
        </div>

        {/* Drawer Footer Status */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xs">KB Counter Active</span>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black text-white">
            Cashfree v3
          </span>
        </div>
      </div>
    </div>
  );
}

