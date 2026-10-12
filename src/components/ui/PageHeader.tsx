import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-200 dark:border-zinc-800 ${className}`}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export default PageHeader;

