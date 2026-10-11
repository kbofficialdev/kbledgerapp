"use client";

import React, { useState } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { speakCustomerCallout, speakTeluguText, CalloutPayload } from "@/lib/voice";

interface VoiceCalloutButtonProps {
  payload?: CalloutPayload;
  customText?: string;
  className?: string;
  variant?: "icon" | "pill" | "badge";
  label?: string;
}

export const VoiceCalloutButton: React.FC<VoiceCalloutButtonProps> = ({
  payload,
  customText,
  className = "",
  variant = "pill",
  label = "చదవండి (Telugu Voice)",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isPlaying) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const onEnd = () => setIsPlaying(false);

    if (customText) {
      speakTeluguText(customText, onEnd);
    } else if (payload) {
      speakCustomerCallout(payload, onEnd);
    } else {
      setIsPlaying(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={isPlaying ? "Stop Voice" : "Telugu Voice Callout (తెలుగు పేరు చదవండి)"}
        className={`p-1.5 rounded-lg border transition-all ${
          isPlaying
            ? "bg-amber-500 text-white border-amber-600 animate-pulse shadow-sm"
            : "bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border-slate-200 hover:border-emerald-200"
        } ${className}`}
      >
        {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    );
  }

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
          isPlaying
            ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
        } ${className}`}
      >
        <Volume2 className="w-3 h-3 flex-shrink-0" />
        <span>{isPlaying ? "వినబడుతోంది..." : "చదవండి"}</span>
      </button>
    );
  }

  // Default "pill"
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
        isPlaying
          ? "bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse"
          : "bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border-slate-200 shadow-xs"
      } ${className}`}
    >
      {isPlaying ? (
        <VolumeX className="w-3.5 h-3.5 text-white" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
      )}
      <span className="text-[11px] font-sans">{isPlaying ? "ఆపండి (Stop)" : label}</span>
    </button>
  );
};
