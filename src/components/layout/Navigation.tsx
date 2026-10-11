"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Receipt,
  BookOpen,
  CreditCard,
  Printer,
  Shield,
  Smartphone,
  Store,
  ChevronRight,
  Wifi,
  Sparkles,
  Presentation,
} from "lucide-react";
import KbLogo from "../brand/KbLogo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const mainNavItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "New Bill", href: "/orders/new", icon: Receipt, badge: "F2", badgeColor: "bg-emerald-100 text-emerald-800" },
  { label: "Orders Archive", href: "/orders", icon: Receipt },
  { label: "Villages", href: "/villages", icon: MapPin },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Khata Ledger", href: "/ledger", icon: BookOpen },
  { label: "Google Pay Hub", href: "/payments", icon: CreditCard, badge: "UPI", badgeColor: "bg-blue-100 text-blue-800" },
  { label: "Carbon Reports", href: "/reports", icon: Printer },
];

const secondaryNavItems: NavItem[] = [
  { label: "KB AI Advisor", href: "/admin/ai", icon: Sparkles, badge: "Gemini", badgeColor: "bg-violet-100 text-violet-800" },
  { label: "Customer Portal", href: "/portal/login", icon: Smartphone, badge: "Self-Pay", badgeColor: "bg-indigo-100 text-indigo-800" },
  { label: "Testing & QA Deck", href: "/presentation", icon: Presentation, badge: "IEEE 829", badgeColor: "bg-emerald-100 text-emerald-800" },
  { label: "Admin Face ID", href: "/admin/login", icon: Shield, badge: "MFA", badgeColor: "bg-emerald-100 text-emerald-800" },
];


export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white/90 backdrop-blur-2xl border-r border-slate-200/90 h-screen sticky top-0 no-print flex-shrink-0 z-30 shadow-[4px_0_24px_rgba(15,23,42,0.02)]">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 flex-shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-base text-slate-900 tracking-tight leading-none">
            KB Khata
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 mt-1">
            Village Commerce Hub
          </span>
        </div>
      </div>

      {/* Main Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Section 1: Operations */}
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 px-3 mb-2">
            Operations &amp; Billing
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/orders");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isActive ? "text-white" : "text-slate-500 group-hover:scale-110"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeColor || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Self-Service & Admin */}
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 px-3 mb-2">
            Portal &amp; Security
          </div>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeColor || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-100/80 bg-slate-50/60 mt-auto">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="font-semibold text-slate-700 text-[11px]">Live Node Active</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            UPI v2.8
          </span>
        </div>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const mobileItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "New Bill", href: "/orders/new", icon: Receipt },
    { label: "Khata", href: "/ledger", icon: BookOpen },
    { label: "Portal", href: "/portal", icon: Smartphone },
    { label: "G-Pay", href: "/payments", icon: CreditCard },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-1.5 px-2 flex justify-around items-center no-print shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {mobileItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors ${
              isActive
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div
              className={`p-1.5 rounded-full transition-all ${
                isActive && item.href === "/orders/new"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
