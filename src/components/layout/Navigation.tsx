"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  Smartphone,
  Shield,
  X,
} from "lucide-react";

export interface NavPillItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export const adminNavPillItems: NavPillItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Counter POS", href: "/orders/new", icon: Receipt, badge: "F2", badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" },
  { label: "Bills Archive", href: "/orders", icon: Receipt },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Bahi-Khata", href: "/ledger", icon: BookOpen },
  { label: "Google Pay UPI", href: "/payments", icon: CreditCard, badge: "UPI", badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" },
  { label: "Villages", href: "/villages", icon: MapPin },
  { label: "Reports", href: "/reports", icon: Printer },
  { label: "AI Advisor", href: "/assistant", icon: Sparkles, badge: "AI", badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300" },
];

/**
 * Modern Horizontal Navigation Pill Bar (Replacing the old desktop sidebar)
 * Provides full horizontal screen width for receipts, ledgers, and transactions.
 */
export const NavigationPills: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin Navigation"
      className="hidden md:flex items-center gap-1.5 overflow-x-auto py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur no-print scrollbar-none"
    >
      <div className="flex items-center gap-1 min-w-max mx-auto w-full max-w-7xl">
        {adminNavPillItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/orders");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-semibold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500 dark:text-zinc-400"
                }`}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded ${
                    isActive
                      ? "bg-emerald-200/60 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
                      : item.badgeColor || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * Mobile Navigation Drawer (For small screens when hamburger is tapped)
 */
export const MobileDrawer: React.FC = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleOpenMobile = () => setMobileOpen(true);
    window.addEventListener("kb:open-mobile-sidebar", handleOpenMobile);
    return () => window.removeEventListener("kb:open-mobile-sidebar", handleOpenMobile);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mobileOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-72 max-w-[80vw] bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 h-full flex flex-col z-10">
        {/* Mobile Drawer Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">
            KB KHATA
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-zinc-500 px-3 mb-1.5">
              Operations & Ledgers
            </div>
            <nav className="space-y-1">
              {adminNavPillItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/orders");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800"
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

          <div>
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-zinc-500 px-3 mb-1.5">
              Portals
            </div>
            <nav className="space-y-1">
              <Link
                href="/customer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              >
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>Customer Khata Portal</span>
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              >
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Admin Security Center</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Mobile Drawer Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700 dark:text-zinc-300 text-[11px]">KB Live Counter</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
            UPI v2.8
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile Bottom Navigation Bar (Dock)
 */
export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const mobileItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "New Bill", href: "/orders/new", icon: Receipt },
    { label: "Khata", href: "/ledger", icon: BookOpen },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "G-Pay", href: "/payments", icon: CreditCard },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 py-1.5 px-2 flex justify-around items-center no-print">
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
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-md text-[10px] font-medium transition-colors ${
              isActive
                ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default NavigationPills;
