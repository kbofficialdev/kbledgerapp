"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-xl font-bold">Critical Application Error</h2>
          <p className="text-xs text-slate-500">
            A root-level exception occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

