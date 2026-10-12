"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Plus,
  ShieldCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import KbLogo from "../brand/KbLogo";
import { useToast } from "@/context/ToastContext";
import LeftSlideInDrawer from "./LeftSlideInDrawer";
import GrandOpeningAiTourModal from "@/components/modals/GrandOpeningAiTourModal";

export const Navbar: React.FC = () => {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/admin/auth/status");
        const data = await res.json();
        if (data.authenticated || data.isAuthenticated) {
          setIsAdminLoggedIn(true);
          setAdminUsername(data.username || "kbadmin");
        } else {
          setIsAdminLoggedIn(false);
          setAdminUsername(null);
        }
      } catch {
        const session = localStorage.getItem("kb_admin_session");
        setIsAdminLoggedIn(Boolean(session));
      }
    };

    checkAuthStatus();

    // Listen to global event to open drawer
    const handleOpenDrawer = () => setDrawerOpen(true);
    window.addEventListener("kb:open-nav-drawer", handleOpenDrawer);
    return () => window.removeEventListener("kb:open-nav-drawer", handleOpenDrawer);
  }, []);

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("kb_admin_session");
    sessionStorage.clear();
    setIsAdminLoggedIn(false);
    toast.authSuccess("Administrator session ended successfully.", "Signed Out");
    setTimeout(() => {
      window.location.replace("/admin/login");
    }, 400);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full no-print bg-white border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: ONLY ONE Single Logo at the left */}
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center">
              <KbLogo size="md" />
            </Link>
          </div>

          {/* Right: Drawer Trigger, Quick Action, Authenticity Status, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1. Quick New Billing Action Button */}
            <Link
              href="/admin/billing"
              aria-label="Billing Section (F2)"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Billing</span>
              <span className="text-[9px] font-mono font-bold bg-neutral-700 text-neutral-200 px-1 py-0.2 rounded">
                F2
              </span>
            </Link>

            {/* 2. AI Business Advisor Page */}
            <Link
              href="/admin/ai"
              title="KB Store AI Business Advisor"
              aria-label="AI Business Advisor"
              className="p-2 rounded-lg text-purple-700 hover:text-purple-900 hover:bg-purple-50 border border-purple-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="hidden md:inline text-xs font-semibold">AI Advisor</span>
            </Link>

            {/* 3. Grand Opening / AI Tour Button */}
            <button
              onClick={() => setTourOpen(true)}
              title="Grand Opening & AI Tour"
              aria-label="Grand Opening Tour"
              className="p-2 rounded-lg text-pink-600 hover:text-pink-800 hover:bg-pink-50 border border-pink-200 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-semibold">AI Tour</span>
            </button>

            {/* 3. Admin Authenticity Badge */}
            {isAdminLoggedIn && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold text-emerald-900">
                  {adminUsername || "Admin"} (Verified)
                </span>
              </div>
            )}

            {/* 4. Left Slide-In Menu Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 font-medium text-xs"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* 5. Sign Out Button */}
            {isAdminLoggedIn && (
              <button
                onClick={handleAdminLogout}
                aria-label="Sign Out"
                className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-In Modal from Left */}
      <LeftSlideInDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenTour={() => setTourOpen(true)}
      />

      {/* Grand Opening Celebration & AI Tour Modal */}
      <GrandOpeningAiTourModal
        forceOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </>
  );
};

export default Navbar;
