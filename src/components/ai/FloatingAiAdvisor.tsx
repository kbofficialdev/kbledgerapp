"use client";

import React, { useState, useEffect } from "react";
import { Bot, X } from "lucide-react";

export const FloatingAiAdvisor: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleOpenAssistant = () => {
    window.open("/assistant", "_blank");
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 no-print flex flex-col items-end">
      {/* Subtle Welcome Tooltip Banner on First Load */}
      {!hasPrompted && (
        <div className="mb-2 mr-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs shadow-xl border border-zinc-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold">Ask KB AI Advisor</span>
          <button
            onClick={() => setHasPrompted(true)}
            className="text-zinc-400 hover:text-white ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <button
        onClick={handleOpenAssistant}
        aria-label="Open KB AI Advisor"
        title="Open KB AI Business Advisor in new window"
        className="group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
          <span className="hidden sm:inline tracking-tight font-bold">KB AI</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 dark:text-emerald-700 px-1.5 py-0.5 rounded-full font-mono font-semibold">
            Live DB
          </span>
        </div>
      </button>
    </div>
  );
};

export default FloatingAiAdvisor;
