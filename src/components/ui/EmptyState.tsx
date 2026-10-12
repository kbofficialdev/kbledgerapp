import React from "react";

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`border border-dashed border-slate-300 dark:border-zinc-800 rounded-lg p-8 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-900/30 ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;

