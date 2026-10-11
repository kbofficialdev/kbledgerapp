import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { DesktopSidebar, MobileBottomNav } from "@/components/layout/Navigation";
import FloatingAiAdvisor from "@/components/ai/FloatingAiAdvisor";

export const metadata: Metadata = {
  title: "KB Khata — Smart Village Ledger & Commerce Hub",
  description: "Offline-first counter bill recording, village profiles, Google Pay UPI integration, and Bahi-Khata ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-slate-50/80 text-slate-900 font-sans antialiased min-h-screen relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
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
      </body>
    </html>
  );
}
