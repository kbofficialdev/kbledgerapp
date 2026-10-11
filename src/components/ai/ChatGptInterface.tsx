"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  Share2,
  Download,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  Tag,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquare,
  Paperclip,
  Maximize2,
  Minimize2,
  FileText,
  Volume2,
  Loader2,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { speakTeluguText } from "@/lib/voice";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  tags: string[];
  messages: ChatMessage[];
  createdAt: string;
}

const AVAILABLE_TAGS = [
  "Sales",
  "Udhaar",
  "Recovery",
  "Villages",
  "Inventory",
  "Audit",
  "HighPriority",
];

const GENERATION_PROMPT_CHIPS = [
  {
    label: "Weekly Sales Summary",
    prompt: "Provide an executive summary of our recent sales orders, payment modes (Debit vs Credit), and gross revenue.",
    tag: "Sales",
  },
  {
    label: "Top Udhaar Debtors",
    prompt: "Identify the top 5 customers with the highest outstanding Udhaar (debt), including their village and balance.",
    tag: "Udhaar",
  },
  {
    label: "Draft Debt Reminder Notice",
    prompt: "Draft a polite and formal payment collection reminder notice for village customers with overdue balances.",
    tag: "Recovery",
  },
  {
    label: "Village-Wise Balance Audit",
    prompt: "Analyze the total debt outstanding categorized by villages and suggest focused collection routes.",
    tag: "Villages",
  },
  {
    label: "Inventory Restock Advice",
    prompt: "Based on recent order volume and item velocity, provide actionable restock recommendations.",
    tag: "Inventory",
  },
];

interface ChatGptInterfaceProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const ChatGptInterface: React.FC<ChatGptInterfaceProps> = ({
  onClose,
  isModal = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setSidebarOpen(false);
    }
    try {
      const stored = localStorage.getItem("kb_ai_chat_sessions");
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.warn("Error reading stored chat sessions:", e);
    }

    // Default first session
    const defaultSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Store Financial Intelligence",
      tags: ["Sales", "Audit"],
      createdAt: new Date().toLocaleDateString("en-IN"),
      messages: [
        {
          id: "welcome-1",
          role: "model",
          text: "Hello! I am your **KB Khata & Fashions AI Business Advisor**. Connected live to your store's PostgreSQL ledger database. You can ask me anything regarding sales volume, village Udhaar debt, customer balances, recovery notices, or upload a photo of a bill receipt.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };

    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        localStorage.setItem("kb_ai_chat_sessions", JSON.stringify(sessions));
      } catch (e) {
        console.warn("Error saving chat sessions:", e);
      }
    }
  }, [sessions]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, loading]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: `New Analysis (${new Date().toLocaleDateString("en-IN")})`,
      tags: ["Sales"],
      createdAt: new Date().toLocaleDateString("en-IN"),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: "model",
          text: "Starting new analysis session. How can I assist with your store ledger, orders, or village accounts today?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this AI analysis session?")) {
      return;
    }
    if (sessions.length <= 1) {
      handleNewChat();
      return;
    }
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleToggleTag = (tag: string) => {
    if (!activeSession) return;
    const exists = activeSession.tags.includes(tag);
    const newTags = exists
      ? activeSession.tags.filter((t) => t !== tag)
      : [...activeSession.tags, tag];

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, tags: newTags } : s))
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if ((!textToSend.trim() && !attachedImage) || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend.trim() || "Please analyze this attached bill/slip image.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageUrl: attachedImage || undefined,
    };

    const currentImage = attachedImage;
    setAttachedImage(null);
    if (!customPrompt) setInput("");
    setLoading(true);

    // Update active session with user message & auto-title if needed
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession?.id) return s;
        const isFirstUserMsg = s.messages.filter((m) => m.role === "user").length === 0;
        const newTitle = isFirstUserMsg ? userMessage.text.slice(0, 32) + "..." : s.title;
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, userMessage],
        };
      })
    );

    try {
      const historyPayload = activeSession.messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.text,
          conversationHistory: historyPayload,
          image: currentImage || undefined,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        (data.error ? `Error: ${data.error}` : "I was unable to complete the query. Please retry.");

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "model",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession?.id ? { ...s, messages: [...s.messages, aiMessage] } : s
        )
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        text: `Network failure connecting to Gemini AI: ${err.message || "Request timed out"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession?.id ? { ...s, messages: [...s.messages, errorMsg] } : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareChat = () => {
    if (!activeSession) return;
    const transcript = [
      `# KB Khata AI Business Advisor - ${activeSession.title}`,
      `Date: ${activeSession.createdAt} | Tags: ${activeSession.tags.map((t) => "#" + t).join(" ")}`,
      "",
      ...activeSession.messages.map(
        (m) => `[${m.timestamp}] **${m.role === "user" ? "Merchant" : "KB AI"}**:\n${m.text}\n`
      ),
    ].join("\n");

    navigator.clipboard.writeText(transcript);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const filteredSessions = selectedTagFilter
    ? sessions.filter((s) => s.tags.includes(selectedTagFilter))
    : sessions;

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400 rounded-2xl border border-slate-800">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-xs font-mono">Loading Advisor Interface...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* 1. ChatGPT History Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 ease-in-out bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden flex-shrink-0 z-20`}
      >
        {/* Sidebar Header: New Chat */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Tag Filters */}
        <div className="p-2 border-b border-slate-800/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Filter by Tag</span>
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                selectedTagFilter === null
                  ? "bg-slate-700 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({sessions.length})
            </button>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTagFilter(selectedTagFilter === t ? null : t)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  selectedTagFilter === t
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSessions.map((session) => {
            const isActive = session.id === activeSession?.id;
            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? "bg-slate-800 text-white font-bold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                  <div className="truncate text-left">
                    <div className="truncate leading-tight">{session.title}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-mono">
                        {session.createdAt}
                      </span>
                      {session.tags.slice(0, 2).map((tg) => (
                        <span
                          key={tg}
                          className="text-[8px] px-1 py-0.2 rounded bg-slate-900 text-emerald-400 font-mono"
                        >
                          #{tg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Gemini 3.5 Flash-Lite</span>
          <span className="text-emerald-400 font-mono font-bold">Live DB Sync</span>
        </div>
      </aside>

      {/* 2. Main Chat Conversation Area */}
      <main className="flex-1 flex flex-col bg-slate-900 min-w-0 h-full">
        {/* Top Chat Header */}
        <header className="h-14 px-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Toggle chat history sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white truncate">
                {activeSession?.title || "KB AI Advisor"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  PostgreSQL 16 Grounded
                </span>
                {activeSession?.tags.map((tg) => (
                  <span
                    key={tg}
                    className="text-[9px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.2 rounded"
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar: Tag, Share, PDF, Pop-out, Close */}
          <div className="flex items-center gap-1.5">
            {/* Tag selector dropdown toggle */}
            <div className="relative">
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
                title="Tag conversation"
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Tag</span>
              </button>

              {showTagMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Toggle Session Tags
                  </div>
                  {AVAILABLE_TAGS.map((t) => {
                    const isTagged = activeSession?.tags.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => handleToggleTag(t)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isTagged
                            ? "bg-emerald-600/20 text-emerald-300 font-bold"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span>#{t}</span>
                        {isTagged && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Share Chat */}
            <button
              onClick={handleShareChat}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs relative"
              title="Share / Copy Chat Transcript"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Share</span>
              {shareToast && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  Copied to Clipboard!
                </span>
              )}
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
              title="Export as PDF / Print"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">PDF</span>
            </button>

            {/* Pop Out to standalone window if in modal */}
            {isModal && (
              <button
                onClick={() => window.open("/admin/ai", "_blank")}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Pop out into new window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Close button if in modal */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-950 hover:border hover:border-rose-700 transition-colors"
                title="Close Window"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* 3. Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeSession?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl mx-auto ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "model" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-600/20 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`flex flex-col max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-xs"
                    : "bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-xs"
                }`}
              >
                {/* Attached Image Thumbnail */}
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-white/20 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imageUrl}
                      alt="Attached bill/slip"
                      className="w-full h-auto object-cover max-h-48"
                    />
                  </div>
                )}

                {/* Formatted Markdown Content */}
                {msg.role === "model" ? (
                  <MarkdownRenderer content={msg.text} className="text-slate-100" />
                ) : (
                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                )}

                {/* Footer Controls: Timestamp & Action Buttons */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-white/10 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>

                  {msg.role === "model" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyMessage(msg.text, msg.id)}
                        className="p-1 hover:text-white transition-colors flex items-center gap-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        onClick={() => speakTeluguText(msg.text)}
                        className="p-1 hover:text-emerald-400 transition-colors flex items-center gap-1"
                        title="Listen to speech callout"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 border border-slate-700 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-4xl mx-auto justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-2.5 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span>Gemini AI is analyzing live store ledger database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Generation Prompt Chips Carousel */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Prompts:</span>
          </span>
          {GENERATION_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span>{chip.label}</span>
              <span className="text-[9px] text-emerald-400 font-mono">#{chip.tag}</span>
            </button>
          ))}
        </div>

        {/* 5. Input Bar with Attachment Preview */}
        <footer className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
          {/* Image Attachment Preview */}
          {attachedImage && (
            <div className="mb-2 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage}
                alt="Selected preview"
                className="w-16 h-16 object-cover rounded-xl border border-emerald-500 shadow-md"
              />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-600 text-white shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Attach Image / Bill Slip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Attach bill, handwritten slip, or receipt photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Prompt Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask about store sales, highest debt villages, customer Udhaar..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none transition-colors"
            />

            {/* Send Button */}
            <button
              type="button"
              disabled={loading || (!input.trim() && !attachedImage)}
              onClick={() => handleSend()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
              title="Send prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ChatGptInterface;

