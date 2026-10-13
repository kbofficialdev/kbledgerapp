"use client";

import React from "react";
import { usePathname } from "next/navigation";
import CustomerNavbar from "@/components/layout/CustomerNavbar";

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === "/customer/login" ||
    pathname?.startsWith("/customer/login") ||
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/admin/login" ||
    pathname?.startsWith("/admin/login");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen kb-animated-bg text-slate-900 flex flex-col selection:bg-black selection:text-white">
      {/* Customer Unified Navbar */}
      <CustomerNavbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

