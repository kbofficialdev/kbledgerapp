"use client";

import React, { useState, useEffect } from "react";
import { Bot, X } from "lucide-react";

export const FloatingAiAdvisor: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

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
    <aside
      aria-label="AI Advisor Quick Launch"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 no-print flex flex-col items-end"
    >
      {!hasDismissed && (
        <div className="mb-2 mr-1 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] border border-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-medium">Ask KB AI Advisor</span>
          <button
            onClick={() => setHasDismissed(true)}
            aria-label="Dismiss AI tooltip"
            className="text-slate-400 hover:text-white ml-1 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <button
        onClick={handleOpenAssistant}
        aria-label="Open KB AI Advisor"
        title="Open KB AI Business Advisor in new window"
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs border border-slate-800 transition-colors"
      >
        <Bot className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline font-semibold">KB AI</span>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 py-0.2 rounded font-mono">
          Live DB
        </span>
      </button>
    </aside>
  );
};

export default FloatingAiAdvisor;
