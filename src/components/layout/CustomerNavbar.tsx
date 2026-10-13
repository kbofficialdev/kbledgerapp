"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  CreditCard,
  BookOpen,
  Receipt,
  MessageSquare,
  LogOut,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import KbLogo from "../brand/KbLogo";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "../brand/BrandIcons";

export default function CustomerNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const isAuthRoute =
    pathname === "/customer/login" ||
    pathname?.startsWith("/customer/login") ||
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/admin/login" ||
    pathname?.startsWith("/admin/login");

  if (isAuthRoute) {
    return null;
  }

  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    customerCode: string;
    villageName?: string;
  } | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch("/api/customer/me");
        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            setCustomer(data.customer);
          }
        }
      } catch (e) {
        console.error("Failed to fetch customer profile in navbar", e);
      }
    }
    loadCustomer();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/customer/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("kb_customer_session");
    sessionStorage.clear();
    toast.authSuccess("You have been signed out.", "Session Closed");
    router.replace("/customer/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/customer", icon: CreditCard },
    { name: "Khata Ledger", href: "/customer/khata", icon: BookOpen },
    { name: "My Orders", href: "/customer/orders", icon: Receipt },
    { name: "Support Tickets", href: "/customer/tickets", icon: MessageSquare },
    { name: "AI Assistant", href: "/customer/assistant", icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 w-full no-print kb-navbar-elevated">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: ONLY ONE Single Logo at the left */}
        <div className="flex items-center gap-6">
          <Link href="/customer" className="flex items-center">
            <KbLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/customer"
                  ? pathname === "/customer"
                  : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-black text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Customer Profile Pill, Quick Pay Button, Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Pay via Cashfree */}
          <Link
            href="/customer/khata"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 border border-amber-300 text-xs font-bold transition-all"
          >
            <BrandCashfreeIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Pay Khata</span>
          </Link>

          {/* Customer Badge */}
          {customer && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <span className="block text-[11px] font-bold text-emerald-950 truncate max-w-[140px]">
                  {customer.name}
                </span>
                <span className="block text-[9px] font-mono text-emerald-700">
                  {customer.customerCode} • {customer.villageName || "Village"}
                </span>
              </div>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign Out"
            className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          {customer && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 mb-2">
              <div className="text-xs font-bold text-slate-900">{customer.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {customer.customerCode} • {customer.villageName || "Village"}
              </div>
            </div>
          )}
          {navLinks.map((link) => {
            const isActive =
              link.href === "/customer"
                ? pathname === "/customer"
                : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive
                    ? "bg-black text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

