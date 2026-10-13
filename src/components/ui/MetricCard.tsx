import React from "react";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: "emerald" | "blue" | "amber" | "indigo" | "rose" | "slate";
  className?: string;
}

const variantStyles = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40",
  slate: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  variant = "emerald",
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-slate-200/90 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(15,23,42,0.06),0_2px_8px_rgb(15,23,42,0.04)] hover:shadow-[0_12px_36px_rgb(15,23,42,0.09),0_4px_12px_rgb(15,23,42,0.05)] transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
            {label}
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
            {value}
          </div>
        </div>
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${variantStyles[variant]}`}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : Icon ? (
            <Icon className="w-5 h-5" />
          ) : null}
        </div>
      </div>

      {(description || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          {description && <span className="truncate">{description}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default MetricCard;

