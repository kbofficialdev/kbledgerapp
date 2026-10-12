import React from "react";

interface KbVerifiedSealProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  sealNumber?: string;
  timestamp?: string;
}

export default function KbVerifiedSeal({
  className = "",
  size = "md",
  sealNumber,
  timestamp,
}: KbVerifiedSealProps) {
  const sizeClasses = {
    sm: "w-20 h-20 text-[6px]",
    md: "w-24 h-24 text-[7px]",
    lg: "w-32 h-32 text-[9px]",
  };

  const formattedDate = timestamp || new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none font-mono text-emerald-800 ${sizeClasses[size]} ${className}`}
      title="KB Fashions & Khata Verified Official Audit Seal"
    >
      {/* Outer Dashed Border Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-700 opacity-90" />

      {/* Inner Thin Ring */}
      <div className="absolute inset-1 rounded-full border border-emerald-600 opacity-70" />

      {/* Badge Content */}
      <div className="flex flex-col items-center justify-center text-center p-1.5 leading-none z-10 rotate-[-4deg]">
        <span className="font-extrabold uppercase tracking-widest text-[6px] text-emerald-900">
          ★ KB FASHIONS ★
        </span>
        <div className="my-1 px-2 py-0.5 rounded bg-emerald-800 text-white font-black uppercase tracking-wider text-[8px] shadow-xs">
          VERIFIED
        </div>
        <span className="font-bold tracking-tight text-[6px] text-emerald-950 uppercase">
          AUDITED & SEALED
        </span>
        <span className="text-[5px] text-emerald-700 font-mono mt-0.5">
          {sealNumber ? `#${sealNumber}` : formattedDate}
        </span>
      </div>
    </div>
  );
}

