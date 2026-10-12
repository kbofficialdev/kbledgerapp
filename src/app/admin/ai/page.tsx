"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  User,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  MapPin,
  CreditCard,
  Receipt,
  Users,
  AlertCircle,
  Clock,
  ArrowRight,
  Paperclip,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import MarkdownView from "@/components/assistant/MarkdownView";
import {
  BrandAnalyticsIcon,
  BrandBillingIcon,
  BrandCustomersIcon,
  BrandCashfreeIcon,
  BrandReportsIcon,
  BrandShieldIcon,
  BrandAiTourIcon,
} from "@/components/brand/BrandIcons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: string;
}

interface StoreMetrics {
  totalVillages: number;
  totalCustomers: number;
  totalOutstandingUdhaar: number;
  totalOrders: number;
  openTickets: number;
}

export default function AdminAIAssistantPage() {
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<StoreMetrics>({
    totalVillages: 0,
    totalCustomers: 0,
    totalOutstandingUdhaar: 0,
    totalOrders: 0,
    openTickets: 0,
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the **KB Store AI Business Advisor**. I am directly connected to your live store ledger, village territory database, and Cashfree payment logs.\n\nYou can ask me to analyze village credit exposure, identify top indebted customers, generate cashflow summaries, or suggest respectful debt recovery strategies. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial store metrics on mount
  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch("/api/admin/ai");
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        }
      } catch (e) {
        console.error("Failed to load store metrics for AI Advisor", e);
      }
    }
    loadMetrics();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Please upload a valid image file (JPEG, PNG, WebP).", "Unsupported File");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Image size must be under 5MB.", "File Too Large");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      const base64Only = result.split(",")[1];
      setSelectedImage({
        dataUrl: result,
        base64: base64Only,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      });
      toast.info(`Attached document: ${file.name}`, "File Attached");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const quickPrompts = [
    {
      icon: "📊",
      label: "Sales & Udhaar Overview",
      prompt:
        "Give me an executive summary of our total sales, cash collected (Nagathu), and pending credit (Udhaar) across all villages.",
    },
    {
      icon: "⚠️",
      label: "Top Indebted Customers",
      prompt:
        "Who are our top customers with unpaid Udhaar, and what are their exact balances and village territories?",
    },
    {
      icon: "🏘️",
      label: "Village Debt Breakdown",
      prompt:
        "Break down the customer count, lifetime orders, and total Udhaar debt for each village territory in our database.",
    },
    {
      icon: "💳",
      label: "Cashfree Gateway Audit",
      prompt:
        "Audit our recent Cashfree payment settlements and summarize collection efficiency and reconciliation status.",
    },
    {
      icon: "💡",
      label: "Strategic Debt Recovery",
      prompt:
        "What strategic, respectful action plan do you recommend to recover our pending Udhaar from top debtors without hurting village relationships?",
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if ((!promptText && !selectedImage) || loading) return;

    const currentImg = selectedImage;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: promptText || "Analyze this attached store document or receipt.",
      image: currentImg ? currentImg.dataUrl : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText || "Analyze this attached document image.",
          image: currentImg
            ? {
                data: currentImg.base64,
                mimeType: currentImg.mimeType,
              }
            : undefined,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.answer) {
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMessage]);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } else {
        toast.error(data.error || "Failed to generate AI response.", "Advisor Error");
      }
    } catch {
      toast.error("Network error connecting to AI Advisor service.", "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Analysis copied to clipboard.", "Copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome_reset",
        role: "assistant",
        content:
          "Conversation reset. I am ready to analyze your ledger records, village debts, and store performance. What would you like to review?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.info("Conversation cleared.", "Reset");
  };

  return (
    <div className="space-y-6 pb-12 bg-white">
      {/* 1. INITIAL EXECUTIVE ANALYTICAL BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-slate-900 to-neutral-800 text-white p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 -mb-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Executive Intelligence Engine • Online
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>KB Store AI Business Advisor</span>
              <Sparkles className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Live store analytics, village territory debt exposure, Cashfree payment audits, and strategic recovery recommendations grounded in your PostgreSQL ledger.
            </p>
          </div>

          {/* Quick Metrics Badges in Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Udhaar</div>
              <div className="text-sm sm:text-base font-bold font-mono text-rose-400">
                ₹{Number(metrics.totalOutstandingUdhaar).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Villages</div>
              <div className="text-sm sm:text-base font-bold font-mono text-purple-300">
                {metrics.totalVillages} Active
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Customers</div>
              <div className="text-sm sm:text-base font-bold font-mono text-emerald-300">
                {metrics.totalCustomers} Accounts
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Open Tickets</div>
              <div className="text-sm sm:text-base font-bold font-mono text-amber-300">
                {metrics.openTickets} Pending
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK EXECUTIVE PROMPT CHIPS */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Instant Strategic Queries
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 text-xs font-semibold transition-all disabled:opacity-50 active:scale-95"
            >
              <span>{qp.icon}</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. CHAT WORKSPACE CANVAS */}
      <div className="rounded-2xl border border-slate-200 bg-white flex flex-col min-h-[500px]">
        {/* Workspace Toolbar */}
        <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-800">
              Active Executive Session
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Gemini 2.5 / Flash
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[640px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-purple-100 text-purple-900 border border-purple-200"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-700" />
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`flex flex-col space-y-1.5 ${
                  msg.role === "user"
                    ? "items-end max-w-[85%] sm:max-w-[75%]"
                    : "items-start max-w-[90%] sm:max-w-[85%]"
                }`}
              >
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>{msg.role === "user" ? "Store Administrator" : "Executive Business Advisor"}</span>
                  <span>•</span>
                  <span className="font-mono lowercase">{msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white rounded-tr-none font-medium"
                      : "bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-none"
                  }`}
                >
                  {msg.image && (
                    <div className="mb-2.5">
                      <img
                        src={msg.image}
                        alt="Uploaded document"
                        className="max-h-56 max-w-full rounded-xl object-contain border border-slate-700 bg-black/20"
                      />
                      <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Attached Photo Document
                      </div>
                    </div>
                  )}

                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="space-y-3">
                      <MarkdownView content={msg.content} />
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-800 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Analysis</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-700 animate-spin" />
              </div>

              <div className="flex flex-col space-y-1.5">
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Executive Business Advisor • Computing
                </div>
                <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs font-medium text-slate-500 ml-1">
                    Auditing live store ledger & calculating financial exposure...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Form */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl space-y-2.5">
          {/* Selected Image Preview Chip */}
          {selectedImage && (
            <div className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src={selectedImage.dataUrl}
                  alt="Upload preview"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0"
                />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 truncate text-[11px]">{selectedImage.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {(selectedImage.size / 1024).toFixed(1)} KB • Document photo attached for OCR analysis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-black transition-colors shrink-0"
              title="Attach Document or Receipt Photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for ledger analysis, debtor ranking, collection plans, or attach a bill..."
              disabled={loading}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black transition-colors"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-black hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
            >
              <span>Ask Advisor</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pt-2.5">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Grounded in Live PostgreSQL Store Records
            </span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
