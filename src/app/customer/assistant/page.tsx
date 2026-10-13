"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, User, RotateCcw, Paperclip, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import MarkdownView from "@/components/assistant/MarkdownView";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: string;
}

const LOADING_STAGES = ["Thinking...", "Loading...", "Crafting..."];

export default function CustomerAssistantPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
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

  const quickPrompts = [
    { label: "నా బాకీ ఎంత ఉంది? (Check Balance)", prompt: "నా ప్రస్తుత ఉద్ధార బాకీ (Current Udhaar balance) ఎంత ఉంది?" },
    { label: "నా తాజా బిల్లులు (Recent Bills)", prompt: "నా తాజా కొనుగోలు బిల్లులు మరియు బాకీ వివరాలు చెప్పండి." },
    { label: "Pay Bills Online", prompt: "How can I pay my pending Khata bills online using Cashfree UPI or QR?" },
    { label: "Payment History", prompt: "నా చివరి చెల్లింపు (Last payment) ఎప్పుడు రికార్డ్ అయింది?" },
  ];

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

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if ((!promptText && !selectedImage) || loading) return;

    const currentImg = selectedImage;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: promptText || "Please inspect this attached bill or payment slip image.",
      image: currentImg ? currentImg.dataUrl : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch("/api/customer/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText || "Please analyze this attached document or payment receipt image.",
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
      if (data.success && data.reply) {
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        toast.authError(data.error || "Failed to reach AI service.", "Assistant Error");
      }
    } catch {
      toast.authError("Network error while connecting to Assistant.", "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] max-w-3xl mx-auto px-2 sm:px-4">
      {/* Minimal ChatGPT-style Top Bar */}
      <div className="flex items-center justify-between py-2.5 px-2 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[11px] font-black">
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

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-3 py-8">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black mb-4 shadow-sm">
              KB
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              How can I help with your Khata today?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
              Ask about your current balance, recent bills, or payment history in Telugu or English, or attach a receipt photo.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={loading}
                  className="text-left px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                >
                  {qp.label}
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
                className={`max-w-[90%] sm:max-w-[82%] space-y-2 ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                    : "text-slate-900 text-sm flex-1 min-w-0"
                }`}
              >
                {msg.image && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/30 max-w-xs">
                    <img
                      src={msg.image}
                      alt="Uploaded voucher or bill"
                      className="w-full h-auto max-h-56 object-contain bg-black/5"
                    />
                  </div>
                )}

                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                    <MarkdownView content={msg.content} />
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
              alt="Upload preview"
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
              title="Remove image"
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
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0"
            title="Attach image"
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
