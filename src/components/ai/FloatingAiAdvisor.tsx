"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Bot, X } from "lucide-react";

const ChatGptInterface = dynamic(() => import("./ChatGptInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      Loading AI Workspace...
    </div>
  ),
});

export const FloatingAiAdvisor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Keyboard shortcut Ctrl+/ to toggle AI window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating Action Button in Bottom-Right Corner */}
      <div className="fixed bottom-6 right-6 z-50 no-print flex flex-col items-end">
        {/* Subtle Welcome Tooltip Banner on First Load */}
        {!isOpen && !hasPrompted && (
          <div className="mb-2 mr-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg border border-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold">Ask KB AI Advisor</span>
            <button
              onClick={() => setHasPrompted(true)}
              className="text-slate-400 hover:text-white ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasPrompted(true);
          }}
          aria-label="Open KB AI Advisor"
          className="group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {/* Animated Ambient Halo */}
          <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600 to-emerald-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity pointer-events-none" />

          <div className="relative flex items-center gap-2">
            <Bot className="w-5 h-5 text-white" />
            <span className="hidden sm:inline tracking-tight font-extrabold">KB AI</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
              3.5 Flash
            </span>
          </div>
        </button>
      </div>

      {/* Floating AI Window / Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 no-print">
          <div className="w-full max-w-5xl h-[85vh] max-h-[800px] flex flex-col rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800 animate-in zoom-in-95 duration-150">
            <ChatGptInterface isModal={true} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAiAdvisor;

