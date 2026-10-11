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
  Shield,
  Smartphone,
  Presentation,
  X,
  ChevronRight,
} from "lucide-react";

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
  { label: "Customer Portal", href: "/portal/login", icon: Smartphone, badge: "Self-Pay", badgeColor: "bg-indigo-100 text-indigo-800" },
  { label: "Testing & QA Deck", href: "/presentation", icon: Presentation, badge: "IEEE 829", badgeColor: "bg-emerald-100 text-emerald-800" },
  { label: "Admin Security & MFA", href: "/admin", icon: Shield, badge: "MFA", badgeColor: "bg-emerald-100 text-emerald-800" },
];

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen to mobile menu trigger event from Navbar
  useEffect(() => {
    const handleOpenMobile = () => setMobileOpen(true);
    window.addEventListener("kb:open-mobile-sidebar", handleOpenMobile);
    return () => window.removeEventListener("kb:open-mobile-sidebar", handleOpenMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 1. Desktop Hover Collapsible Sidebar (Hidden on mobile) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col bg-white/95 backdrop-blur-2xl border-r border-slate-200/90 h-screen sticky top-0 no-print flex-shrink-0 z-30 shadow-[4px_0_24px_rgba(15,23,42,0.03)] transition-all duration-300 ease-in-out ${
          isHovered ? "w-64" : "w-[72px]"
        }`}
      >
        {/* Brand Header: Strictly ONLY "KB" */}
        <div
          className={`h-14 border-b border-slate-100/90 flex items-center transition-all duration-300 ${
            isHovered ? "px-6 justify-start" : "px-0 justify-center"
          }`}
        >
          <Link href="/" className="inline-flex items-center group">
            <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              KB
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4 space-y-6">
          {/* Main Operations Section */}
          <div>
            {isHovered && (
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 px-3 mb-2 animate-in fade-in duration-150">
                Operations &amp; Billing
              </div>
            )}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
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
                    title={!isHovered ? item.label : undefined}
                    className={`flex items-center rounded-xl text-xs font-medium transition-all group ${
                      isHovered ? "px-3 py-2.5 justify-between" : "p-3 justify-center"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isActive ? "text-white" : "text-slate-500 group-hover:scale-110"
                        }`}
                      />
                      {isHovered && (
                        <span className="truncate whitespace-nowrap animate-in fade-in duration-150">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isHovered && item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded animate-in fade-in duration-150 ${
                          isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-slate-100 text-slate-600"
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

          {/* Secondary Portal & Security Section */}
          <div>
            {isHovered && (
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 px-3 mb-2 animate-in fade-in duration-150">
                Portal &amp; Security
              </div>
            )}
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!isHovered ? item.label : undefined}
                    className={`flex items-center rounded-xl text-xs font-medium transition-all group ${
                      isHovered ? "px-3 py-2.5 justify-between" : "p-3 justify-center"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isActive ? "text-white" : "text-slate-500 group-hover:scale-110"
                        }`}
                      />
                      {isHovered && (
                        <span className="truncate whitespace-nowrap animate-in fade-in duration-150">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isHovered && item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded animate-in fade-in duration-150 ${
                          isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-slate-100 text-slate-600"
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

        {/* Footer Status Pill */}
        <div
          className={`p-3 border-t border-slate-100/90 bg-slate-50/60 mt-auto flex items-center transition-all ${
            isHovered ? "justify-between" : "justify-center"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            {isHovered && (
              <span className="font-semibold text-slate-700 text-[11px] whitespace-nowrap animate-in fade-in duration-150">
                Live Counter Active
              </span>
            )}
          </div>
          {isHovered && (
            <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 animate-in fade-in duration-150">
              UPI v2.8
            </span>
          )}
        </div>
      </aside>

      {/* 2. Mobile Slide-Over Drawer (Hidden on desktop, opened via icon) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250">
            {/* Header: Strictly ONLY "KB" + Close (X) Icon */}
            <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="font-black text-2xl tracking-tighter bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent"
              >
                KB
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close Navigation Menu"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 px-3 mb-2">
                  Operations &amp; Billing
                </div>
                <nav className="space-y-1">
                  {mainNavItems.map((item) => {
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
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20"
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-slate-100 text-slate-600"
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
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-600/20"
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-slate-100 text-slate-600"
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

            {/* Mobile Footer Status */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700 text-[11px]">KB Live Counter</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                UPI v2.8
              </span>
            </div>
          </div>
        </div>
      )}
    </>
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

