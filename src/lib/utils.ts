import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toString: () => string }): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString() || "0");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function generateCustomItemId(): string {
  // Generates customized unique item code: ITM-XXXXX
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `ITM-${randomNum}`;
}

export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `KB-${dateStr}-${randomNum}`;
}

export function generateCustomerCode(villageCode?: string): string {
  const vPrefix = villageCode ? villageCode.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase() : "GEN";
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `CUST-${vPrefix}-${randomNum}`;
}
