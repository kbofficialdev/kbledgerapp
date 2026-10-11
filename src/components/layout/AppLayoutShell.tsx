"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { DesktopSidebar, MobileBottomNav } from "./Navigation";
import FloatingAiAdvisor from "@/components/ai/FloatingAiAdvisor";

export default function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStandaloneAssistant =
    pathname?.startsWith("/assistant") || pathname?.startsWith("/chat");

  if (isStandaloneAssistant) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased flex flex-col selection:bg-zinc-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-zinc-900">
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Ambient Luminous Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden no-print">
        <div className="absolute -top-[10%] -left-[5%] w-[600px] h-[600px] rounded-full bg-emerald-500/8 blur-[130px] animate-mesh-1" />
        <div className="absolute top-[25%] -right-[8%] w-[550px] h-[550px] rounded-full bg-indigo-500/8 blur-[140px] animate-mesh-2" />
        <div className="absolute -bottom-[12%] left-[20%] w-[580px] h-[580px] rounded-full bg-blue-500/6 blur-[140px] animate-mesh-1" />
      </div>

      {/* Full-Height Screen Layout with Body Scrolling */}
      <div className="flex min-h-screen relative z-10">
        {/* Docked Icon Sidebar (Desktop) */}
        <DesktopSidebar />

        {/* Main App Workspace */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* Advanced Glassmorphic Sticky Navbar */}
          <Navbar />

          {/* Natural Body Scrollable Content Canvas */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-12">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Gemini AI Advisor (Bottom-Right Action Trigger) */}
      <FloatingAiAdvisor />

      {/* Mobile Dock Navigation */}
      <MobileBottomNav />
    </>
  );
}
