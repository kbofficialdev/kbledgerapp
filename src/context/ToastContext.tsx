"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { ToastContainer } from "@/components/ui/Toast";

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "auth_success"
  | "auth_error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
    authSuccess: (message: string, title?: string, duration?: number) => string;
    authError: (message: string, title?: string, duration?: number) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4500): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (message: string, title?: string, duration?: number) =>
        showToast("success", message, title, duration),
      error: (message: string, title?: string, duration?: number) =>
        showToast("error", message, title, duration),
      warning: (message: string, title?: string, duration?: number) =>
        showToast("warning", message, title, duration),
      info: (message: string, title?: string, duration?: number) =>
        showToast("info", message, title, duration),
      authSuccess: (message: string, title?: string, duration?: number) =>
        showToast("auth_success", message, title || "Authenticity Verified", duration),
      authError: (message: string, title?: string, duration?: number) =>
        showToast("auth_error", message, title || "Security / Authorization Alert", duration),
      dismiss: dismissToast,
    }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
