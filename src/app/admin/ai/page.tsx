"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send,
  User,
  RotateCcw,
  Copy,
  Check,
  Paperclip,
  X,
  FileText,
  FileSpreadsheet,
  Mail,
  Download,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import MarkdownView from "@/components/assistant/MarkdownView";

interface AgentArtifact {
  id: string;
  type: "pdf" | "excel" | "image" | "email" | "record";
  title: string;
  subtitle: string;
  filename?: string;
  mimeType?: string;
  dataUrl?: string;
  previewText?: string;
  metadata?: Record<string, string | number>;
  dashboardLink?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: string;
  artifacts?: AgentArtifact[];
}

const LOADING_STAGES = ["Thinking...", "Loading...", "Crafting..."];

export default function AdminAIAssistantPage() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Cycle static text stages ("Thinking..." -> "Loading..." -> "Crafting...") without CSS animations
  useEffect(() => {
    if (!loading) {
      setLoadingStageIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

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
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if ((!text && !selectedImage) || loading) return;

    const currentImg = selectedImage;
    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text || "Analyze this attached image.",
      image: currentImg ? currentImg.dataUrl : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text || "Analyze this attached document or receipt image.",
          image: currentImg
            ? {
                data: currentImg.base64,
                mimeType: currentImg.mimeType,
              }
            : undefined,
          conversationHistory: messages.slice(-8).map((m) => ({
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
          artifacts: data.artifacts || [],
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        toast.error(data.error || "Unable to complete request right now.", "Assistant Notice");
      }
    } catch {
      toast.error("Connection interrupted. Please try again.", "Network Notice");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerArtifactDownload = (art: AgentArtifact) => {
    if (!art.dataUrl) return;
    const link = document.createElement("a");
    link.href = art.dataUrl;
    link.download = art.filename || `KB_Khata_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const starterSuggestions = [
    "Show village-wise pending balance summary",
    "Generate a PDF ledger report",
    "Export customer balances to Excel",
    "Create a chart of village credit exposure",
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] max-w-3xl mx-auto px-2 sm:px-4">
      {/* Minimal ChatGPT-style Top Bar */}
      <div className="flex items-center justify-between py-2.5 px-2 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[11px] font-black tracking-tight">
            KB
          </div>
          <span className="text-sm font-semibold text-slate-900">KB Assistant</span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              handleRemoveImage();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New chat</span>
          </button>
        )}
      </div>

      {/* Main Conversation Viewport */}
      <div className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-3 py-8">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black mb-4 shadow-sm">
              KB
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              What can I help with?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
              Ask about store balances, generate PDF statements, export Excel sheets, create charts, send customer emails, or record bills directly via prompt.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {starterSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={loading}
                  className="text-left px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 px-1 sm:px-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                  KB
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-[82%] space-y-3 ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                    : "text-slate-900 text-sm flex-1 min-w-0"
                }`}
              >
                {msg.image && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/30 max-w-xs">
                    <img
                      src={msg.image}
                      alt="Uploaded attachment"
                      className="w-full h-auto max-h-56 object-contain bg-black/5"
                    />
                  </div>
                )}

                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                      <MarkdownView content={msg.content} />
                    </div>

                    {/* Inline Generated Output Dump (Images / Charts / PDFs / Excel / Records) */}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {msg.artifacts.map((art) => (
                          <div
                            key={art.id}
                            className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                          >
                            {art.type === "image" && art.dataUrl ? (
                              <div className="space-y-2 p-3">
                                <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-950">
                                  <img
                                    src={art.dataUrl}
                                    alt={art.title}
                                    className="w-full h-auto max-h-[380px] object-contain mx-auto"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-1 px-1">
                                  <span className="text-xs font-medium text-slate-600 truncate">
                                    {art.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => triggerArtifactDownload(art)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shrink-0"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Image</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      art.type === "pdf"
                                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                                        : art.type === "excel"
                                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                          : art.type === "email"
                                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                                            : "bg-slate-100 text-slate-800 border border-slate-200"
                                    }`}
                                  >
                                    {art.type === "pdf" && <FileText className="w-5 h-5" />}
                                    {art.type === "excel" && <FileSpreadsheet className="w-5 h-5" />}
                                    {art.type === "email" && <Mail className="w-5 h-5" />}
                                    {art.type === "record" && <CheckCircle2 className="w-5 h-5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 truncate">
                                      {art.filename || art.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">{art.subtitle}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {(art.type === "pdf" || art.type === "excel") && art.dataUrl && (
                                    <button
                                      type="button"
                                      onClick={() => triggerArtifactDownload(art)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download {art.type.toUpperCase()}</span>
                                    </button>
                                  )}
                                  {art.dashboardLink && (
                                    <Link
                                      href={art.dashboardLink}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Static Text-Only Thinking / Loading / Crafting Indicator (NO animations) */}
        {loading && (
          <div className="flex items-start gap-3 px-1 sm:px-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px] font-black">
              KB
            </div>
            <div className="py-1.5 text-sm font-medium text-slate-500">
              {LOADING_STAGES[loadingStageIdx]}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom ChatGPT-Style Mobile-Friendly Composer */}
      <div className="pt-2 pb-3 bg-transparent shrink-0">
        {selectedImage && (
          <div className="mb-2 inline-flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
            <img
              src={selectedImage.dataUrl}
              alt="Preview"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
            />
            <div className="text-xs pr-1">
              <p className="font-medium text-slate-800 truncate max-w-[160px]">{selectedImage.name}</p>
              <p className="text-[10px] text-slate-400">{(selectedImage.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-slate-900 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Message KB Assistant..."
            disabled={loading}
            className="flex-1 max-h-36 py-1.5 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedImage)}
            aria-label="Send message"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
