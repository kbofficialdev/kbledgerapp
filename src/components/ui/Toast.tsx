"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { ToastMessage } from "@/context/ToastContext";

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const toastTypeStyles = {
  auth_success: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-emerald-600 dark:border-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800",
    title: "text-emerald-950 dark:text-emerald-200 font-semibold",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: ShieldCheck,
    defaultTitle: "Authenticity Verified",
  },
  auth_error: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-rose-600 dark:border-rose-500",
    iconBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800",
    title: "text-rose-950 dark:text-rose-200 font-semibold",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: ShieldAlert,
    defaultTitle: "Security / Authorization Alert",
  },
  success: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900",
    title: "text-slate-900 dark:text-zinc-100",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: CheckCircle2,
    defaultTitle: "Success",
  },
  error: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-rose-500",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900",
    title: "text-slate-900 dark:text-zinc-100",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: AlertCircle,
    defaultTitle: "Error",
  },
  warning: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-amber-500",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900",
    title: "text-slate-900 dark:text-zinc-100",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: AlertTriangle,
    defaultTitle: "Warning",
  },
  info: {
    container: "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-blue-500",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900",
    title: "text-slate-900 dark:text-zinc-100",
    message: "text-slate-600 dark:text-zinc-400",
    closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800",
    Icon: Info,
    defaultTitle: "Notice",
  },
};

export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const config = toastTypeStyles[toast.type] || toastTypeStyles.info;
  const { Icon } = config;

  const isAlert = toast.type === "error" || toast.type === "auth_error";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-md border-l-4 border-r border-t border-b border-slate-200 dark:border-zinc-800 transition-colors ${config.container}`}
    >
      <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${config.iconBg}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-xs font-semibold mb-0.5 ${config.title}`}>
          {toast.title || config.defaultTitle}
        </h4>
        <p className={`text-xs leading-relaxed break-words ${config.message}`}>
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={`p-1 rounded-md transition-colors flex-shrink-0 ${config.closeBtn}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none transition-all"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}

export default ToastContainer;
