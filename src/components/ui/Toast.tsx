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
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_18px_42px_-8px_rgba(0,0,0,0.20),0_4px_14px_-2px_rgba(16,185,129,0.18)]",
    accentBar: "bg-gradient-to-b from-black via-emerald-500 to-black dark:from-white dark:via-emerald-400 dark:to-white",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-emerald-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    pillLabel: "VERIFIED",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-emerald-500",
    Icon: ShieldCheck,
    defaultTitle: "KB Security • Authenticity Verified",
  },
  auth_error: {
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_18px_42px_-8px_rgba(0,0,0,0.20),0_4px_14px_-2px_rgba(244,63,94,0.22)]",
    accentBar: "bg-gradient-to-b from-black via-rose-600 to-black dark:from-white dark:via-rose-500 dark:to-white",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-rose-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    pillLabel: "SECURITY",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-rose-600",
    Icon: ShieldAlert,
    defaultTitle: "KB Security • Authorization Alert",
  },
  success: {
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_16px_38px_-8px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(16,185,129,0.15)]",
    accentBar: "bg-emerald-500",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-emerald-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    pillLabel: "SUCCESS",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-emerald-500",
    Icon: CheckCircle2,
    defaultTitle: "Completed Successfully",
  },
  error: {
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_16px_38px_-8px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(244,63,94,0.18)]",
    accentBar: "bg-rose-600",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-rose-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    pillLabel: "ALERT",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-rose-600",
    Icon: AlertCircle,
    defaultTitle: "Action Required",
  },
  warning: {
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_16px_38px_-8px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(245,158,11,0.16)]",
    accentBar: "bg-amber-500",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-amber-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    pillLabel: "CAUTION",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-amber-500",
    Icon: AlertTriangle,
    defaultTitle: "Attention Needed",
  },
  info: {
    container:
      "bg-white/95 dark:bg-zinc-950/95 border-zinc-900/15 dark:border-zinc-800 shadow-[0_16px_38px_-8px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(59,130,246,0.15)]",
    accentBar: "bg-blue-600",
    iconBadge:
      "bg-black text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-zinc-200 shadow-sm",
    statusDot: "bg-blue-500 ring-2 ring-white dark:ring-zinc-950",
    pill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    pillLabel: "NOTICE",
    title: "text-zinc-950 dark:text-white font-bold",
    message: "text-zinc-600 dark:text-zinc-300",
    progressBar: "bg-blue-600",
    Icon: Info,
    defaultTitle: "Store Update",
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
      className={`kb-toast-enter relative overflow-hidden pointer-events-auto flex items-start gap-3.5 p-3.5 pl-4 rounded-xl border backdrop-blur-xl transition-all ${config.container}`}
    >
      {/* Semantic Left Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accentBar}`} />

      {/* Black & White KB Brand Icon Badge + Semantic Status Dot */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.iconBadge}`}>
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${config.statusDot}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
            KB
          </span>
          <span
            className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${config.pill}`}
          >
            {config.pillLabel}
          </span>
        </div>
        <h4 className={`text-xs tracking-tight mt-1 ${config.title}`}>
          {toast.title || config.defaultTitle}
        </h4>
        <p className={`text-xs leading-relaxed break-words mt-0.5 ${config.message}`}>
          {toast.message}
        </p>
      </div>

      {/* Monochrome Close Button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Bottom Semantic Accent Line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-60 ${config.progressBar}`} />
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none transition-all"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}

export default ToastContainer;
