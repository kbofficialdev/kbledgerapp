import React from "react";

export function Table({
  className = "",
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
      <table className={`w-full text-left text-sm text-slate-800 dark:text-zinc-200 border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-slate-100 dark:divide-zinc-800/80 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className = "",
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left font-semibold align-middle ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className = "",
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3 align-middle text-sm ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableEmptyState({
  colSpan = 1,
  message,
  title,
  subMessage,
  description,
}: {
  colSpan?: number;
  message?: string;
  title?: string;
  subMessage?: string;
  description?: string;
}) {
  const heading = title || message || "No records found";
  const detail = description || subMessage;

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">{heading}</p>
        {detail && (
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{detail}</p>
        )}
      </td>
    </tr>
  );
}

export default Table;

