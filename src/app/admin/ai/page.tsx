"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  MapPin,
  Users,
  ShieldCheck,
  ChevronLeft,
  Volume2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { VoiceCalloutButton } from "@/components/common/VoiceCalloutButton";
import { formatCurrency } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    title: "గ్రామాల వారీగా ఉద్ధార",
    prompt: "ఏ ఏ గ్రామాలలో అత్యధికంగా ఉద్ధార (Udhaar) బకాయిలు ఉన్నాయి? వివరంగా తెలియజేయండి.",
  },
  {
    title: "కస్టమర్ బకాయిల విశ్లేషణ",
    prompt: "ప్రస్తుతం అత్యధికంగా బకాయి ఉన్న టాప్ 5 కస్టమర్ల వివరాలు, వారి గ్రామం మరియు ఫోన్ నంబర్లు ఇవ్వండి.",
  },
  {
    title: "Store Financial Health",
    prompt: "Analyze our total Udhaar outstanding vs collections, and suggest 3 practical steps to improve recovery.",
  },
  {
    title: "తాజా కొనుగోలు బిల్లులు",
    prompt: "ఇటీవల స్టోర్‌లో నమోదైన బిల్లులు, అమ్మకపు వస్తువులు (Items) మరియు నగదు చెల్లింపుల సమాచారం ఇవ్వండి.",
  },
];

export default function AdminAIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "model",
      text: "నమస్కారం! నేను మీ **KB Khata & Fashions AI వ్యాపార సలహాదారుడిని** (AI Business Advisor). మీ స్టోర్ డేటాబేస్, గ్రామాల ఖాతాలు, ఉద్ధార బకాయిలు, బిల్లులు మరియు పేమెంట్స్ గురించి నన్ను ఏ ప్రశ్నైనా అడగవచ్చు. మీరు తెలుగు లేదా ఇంగ్లీషులో మాట్లాడవచ్చు.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    totalVillages: number;
    totalCustomers: number;
    totalOutstandingUdhaar: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend.trim(),
          conversationHistory: historyPayload,
        }),
      });

      const data = await res.json();

      if (data.success && data.answer) {
        const modelMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "model",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, modelMsg]);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "model",
          text: `⚠️ **Error:** ${data.error || "Could not retrieve answer from Gemini AI."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        text: `⚠️ **Connection Error:** ${err.message || "Failed to reach server."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
            title="Back to Admin Hub"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                KB AI Business Advisor
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
                <Sparkles className="w-3 h-3" />
                Gemini 3.5 AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database queries, bahi-khata intelligence & Telugu voice response
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: "welcome-reset",
                role: "model",
                text: "చర్చ రీసెట్ చేయబడింది. మీ KB Khata డేటాబేస్ గురించి ఏదైనా అడగవచ్చు.",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ])
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Chat</span>
        </button>
      </div>

      {/* Main AI Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Chat Container (Span 3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[720px]">
          {/* Chat Messages Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50/80 border border-slate-200/80 text-slate-800"
                  }`}
                >
                  {/* Message Top Bar for Model */}
                  {msg.role === "model" && (
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2 mb-2">
                      <span className="text-[11px] font-bold text-violet-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        KB Intelligence
                      </span>

                      <div className="flex items-center gap-1.5">
                        <VoiceCalloutButton
                          customText={msg.text.replace(/[*#_]/g, "")}
                          variant="badge"
                        />
                        <button
                          type="button"
                          onClick={() => copyText(msg.id, msg.text)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] mt-2 text-right ${
                      msg.role === "user" ? "text-slate-400" : "text-slate-400 font-mono"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-500">
                  <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  <span>Gemini AI is analyzing live store ledger records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips Bar */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-200/80 overflow-x-auto flex gap-2 no-scrollbar">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(qp.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-xs flex-shrink-0 disabled:opacity-50"
              >
                <Lightbulb className="w-3 h-3 text-amber-500" />
                <span>{qp.title}</span>
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about customers, Udhaar dues, villages, or bills in Telugu / English..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Assistant Insights Sidebar (Span 1) */}
        <div className="space-y-4">
          {/* Live DB Synced Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Live Database Context</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Every query is grounded in real-time records from PostgreSQL 16.
            </p>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Villages Active
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {metrics ? metrics.totalVillages : "Connected"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Khata Customers
                </span>
                <span className="font-bold font-mono text-slate-900">
                  {metrics ? metrics.totalCustomers : "Connected"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  Total Udhaar Debt
                </span>
                <span className="font-bold font-mono text-rose-600">
                  {metrics ? formatCurrency(metrics.totalOutstandingUdhaar) : "Synced"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Prompt Ideas</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
              <li>"కల్వరాల్ గ్రామంలో ఎంత మంది కస్టమర్లు ఉన్నారు?"</li>
              <li>"Draft a polite reminder message for Udhaar recovery."</li>
              <li>"What is the difference between Debit and Credit in our store?"</li>
              <li>"బకాయిలు వసూలు చేయడానికి తెలుగులో నోటీసు తయారుచేయండి."</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
