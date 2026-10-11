"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2 } from "lucide-react";

const ChatGptInterface = dynamic(() => import("@/components/ai/ChatGptInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono">Initializing KB AI Business Advisor...</span>
      </div>
    </div>
  ),
});

export default function AdminAIAssistantPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Standalone Fullscreen Window</span>
        </div>
      </div>

      {/* Main Full-Height ChatGPT Interface */}
      <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        <ChatGptInterface isModal={false} />
      </div>
    </div>
  );
}
