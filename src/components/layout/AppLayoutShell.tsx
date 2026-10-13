"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";

export default function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // State to track admin authorization on protected admin routes
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  // Explicit list of authenticated Admin routes where the admin workspace chrome is displayed
  const isAdminRoute =
    pathname === "/" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/villages") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/reports");

  const isAuthRoute =
    pathname === "/login" ||
    pathname?.startsWith("/login/") ||
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    pathname === "/customer/login" ||
    pathname === "/portal/login";

  // Standalone shell for unauthenticated/login routes, customer portal, standalone assistant
  const isStandaloneShell =
    !isAdminRoute ||
    isAuthRoute ||
    pathname === "/customer" ||
    pathname?.startsWith("/customer/") ||
    pathname === "/portal" ||
    pathname?.startsWith("/portal/") ||
    pathname?.startsWith("/assistant") ||
    pathname?.startsWith("/chat");

  useEffect(() => {
    // If not an admin dashboard route, no admin chrome verification is needed
    if (!isAdminRoute || isStandaloneShell) {
      setAuthStatus("authorized");
      return;
    }

    let isMounted = true;
    const verifyAuthorization = async () => {
      try {
        const res = await fetch("/api/admin/auth/status");
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated || data.isAuthenticated) {
            setAuthStatus("authorized");
            return;
          }
        }

        // Not authenticated as admin
        setAuthStatus("unauthorized");
        const redirectUrl = `/admin/login${pathname && pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : ""}`;
        router.replace(redirectUrl);
      } catch {
        if (!isMounted) return;
        setAuthStatus("unauthorized");
        router.replace("/admin/login");
      }
    };

    verifyAuthorization();

    return () => {
      isMounted = false;
    };
  }, [pathname, isAdminRoute, isStandaloneShell, router]);

  // If this is a standalone route (e.g. login, customer portal)
  if (isStandaloneShell) {
    return (
      <div className="min-h-screen w-full kb-animated-bg text-slate-900 antialiased flex flex-col selection:bg-black selection:text-white">
        {children}
      </div>
    );
  }

  // If the admin route is still verifying or unauthorized, do NOT show dashboard chrome or links!
  if (authStatus !== "authorized") {
    return (
      <div className="min-h-screen w-full kb-animated-bg text-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">
            Verifying administrator authorization...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated Admin Workspace: Full-width layout with Single-Logo Navbar & Slide-In Left Drawer
  return (
    <div className="min-h-screen kb-animated-bg text-slate-900 antialiased flex flex-col">
      {/* Top Header Navbar (Single Logo + Menu Drawer Trigger) */}
      <Navbar />

      {/* Natural Full-Width Scrollable Content Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
