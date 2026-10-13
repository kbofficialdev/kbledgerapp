"use client";

import React, { Suspense } from "react";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";

function CustomerLoginPageContent() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 kb-animated-bg text-zinc-900 dark:text-zinc-100">
      <div className="w-full relative z-10 flex flex-col items-center max-w-md">
        <UnifiedAuthCard initialTab="customer" />
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-400">
          <div className="animate-pulse text-sm font-medium">Loading Customer Khata Authentication...</div>
        </div>
      }
    >
      <CustomerLoginPageContent />
    </Suspense>
  );
}

