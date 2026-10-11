import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { DesktopSidebar, MobileBottomNav } from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "KB Khata — Smart Village & Shop Ledger",
  description: "Production offline-to-online shopkeeping, village ledger, PhonePe gateway, and carbon report system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <DesktopSidebar />
          <main className="flex-1 pb-20 lg:pb-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </body>
    </html>
  );
}

