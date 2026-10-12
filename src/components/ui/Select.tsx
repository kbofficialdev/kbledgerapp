import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, helperText, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-slate-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-white dark:bg-zinc-900 border ${
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-300 dark:border-zinc-700 focus:border-emerald-600 focus:ring-emerald-500/20"
            } rounded-md px-3 py-2 pr-9 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;

