import React from "react";
import {
  MapPin,
  User,
  ShoppingBag,
  CreditCard,
  Landmark,
  Coins,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

/**
 * Deterministic color palette generator based on strings
 */
const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
];

function getGradientIndex(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/**
 * Customer Profile Avatar with initials and colorful background
 */
export const CustomerAvatar: React.FC<{
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  statusOnline?: boolean;
}> = ({ name, size = "md", className = "", showStatus = false, statusOnline = true }) => {
  const initials = name
    ? name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "KB";

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-xl",
  }[size];

  const gradient = getGradientIndex(name || "Customer");

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${gradient} text-white font-extrabold flex items-center justify-center shadow-xs border border-white/40 select-none`}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            statusOnline ? "bg-emerald-500" : "bg-slate-300"
          }`}
        />
      )}
    </div>
  );
};

/**
 * Village Emblem Badge
 */
export const VillageBadge: React.FC<{
  name: string;
  code?: string;
  size?: "sm" | "md";
  className?: string;
}> = ({ name, code, size = "md", className = "" }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border bg-emerald-50/70 border-emerald-200/80 text-emerald-900 font-medium ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      <div className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
        <MapPin className="w-2.5 h-2.5" />
      </div>
      <span className="font-semibold">{name}</span>
      {code && <span className="font-mono text-[10px] text-emerald-700 opacity-80">({code})</span>}
    </div>
  );
};

/**
 * Standardized Payment Type Badge
 * Clear differentiation:
 * - DEBIT: నగదు (Nagathu) - Fully paid on spot
 * - CREDIT: ఉద్ధార (Udhaar) - Zero paid, full balance to debt
 * - PARTIAL: పాక్షిక (Partial) - Cash paid + Udhaar remainder
 */
export const PaymentTypeBadge: React.FC<{
  type: "DEBIT" | "CREDIT" | "PARTIAL" | string;
  size?: "sm" | "md";
  className?: string;
}> = ({ type, size = "md", className = "" }) => {
  const baseClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] font-bold"
      : "px-2.5 py-1 text-xs font-bold";

  switch (type) {
    case "DEBIT":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 ${baseClasses} ${className}`}
          title="నగదు (Nagathu): Total payment paid at counter on spot"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>నగదు (Nagathu / Debit)</span>
        </span>
      );
    case "CREDIT":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/90 ${baseClasses} ${className}`}
          title="ఉద్ధార (Udhaar): Nothing paid, full amount recorded to debt"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          <span>ఉద్ధార (Udhaar / Credit)</span>
        </span>
      );
    case "PARTIAL":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/90 ${baseClasses} ${className}`}
          title="పాక్షిక: Some cash paid on counter, remainder added to Udhaar"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          <span>పాక్షిక (Nagathu + Udhaar)</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 ${baseClasses} ${className}`}
        >
          {type}
        </span>
      );
  }
};

