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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "New Bill", href: "/orders/new", icon: Receipt },
  { label: "Villages", href: "/villages", icon: MapPin },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Khata Ledger", href: "/ledger", icon: BookOpen },
  { label: "Google Pay Hub", href: "/payments", icon: CreditCard },
  { label: "Carbon Reports", href: "/reports", icon: Printer },
  { label: "Admin Face ID", href: "/admin", icon: Shield },
];

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 no-print flex-shrink-0">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-3 mb-2">
        Shop Operations
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Counter Quick Tip */}
      <div className="mt-auto p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Counter Tip</p>
        <p className="leading-relaxed">
          Drafts auto-save per keystroke. Refresh or disconnect without losing customer bill items.
        </p>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  // Top 5 critical items for mobile bottom bar
  const mobileItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Villages", href: "/villages", icon: MapPin },
    { label: "New Bill", href: "/orders/new", icon: Receipt },
    { label: "Khata", href: "/ledger", icon: BookOpen },
    { label: "Reports", href: "/reports", icon: Printer },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex justify-around items-center no-print shadow-elevated">
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
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div
              className={`p-1 rounded-full ${
                isActive && item.href === "/orders/new"
                  ? "bg-emerald-600 text-white"
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

