"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  User,
  Bot,
  RefreshCw,
  ShieldCheck,
  Paperclip,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import MarkdownView from "@/components/assistant/MarkdownView";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: string;
}

export default function CustomerAssistantPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "నమస్కారం! నేను మీ **KB Fashions & Khata AI అసిస్టెంట్‌ని**. మీ ఉద్ధార బాకీ, కొనుగోలు బిల్లులు, ఆన్‌లైన్ పేమెంట్ వివరాలు లేదా ఇతర సందేహాల గురించి నన్ను అడగవచ్చు. మీరు మీ పాత బిల్లు లేదా చెల్లింపు రసీదు ఫోటోను కూడా ఇక్కడ అప్‌లోడ్ చేయవచ్చు.\n\nHello! I am your **KB Khata Customer Copilot**. You can ask me about your ledger balance, past orders, or Cashfree online payments. You can also upload a photo of your receipt or bill for verification.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
      toast.info(`Attached image: ${file.name}`, "Document Selected");
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
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-none">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                KB Customer Copilot
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Online • Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalized store advisor for verified ledger queries (Telugu &amp; English) • Multimodal OCR Ready
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/customer/khata"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors"
          >
            <BrandCashfreeIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Pay Khata</span>
          </Link>
          <button
            onClick={() => {
              setMessages([
                {
                  id: "welcome_reset",
                  role: "assistant",
                  content: "చాట్ రీసెట్ చేయబడింది. మీరు మీ అకౌంట్ గురించి ఏమైనా అడగవచ్చు! Conversation reset. How can I assist you with your ledger today?",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
              handleRemoveImage();
            }}
            title="Reset Chat"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-medium transition-all text-[11px] disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 min-h-[440px] max-h-[580px] overflow-y-auto space-y-4 shadow-none">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-emerald-800" />}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-slate-900 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-900 rounded-tl-none font-sans"
              }`}
            >
              {msg.image && (
                <div className="mb-2.5">
                  <img
                    src={msg.image}
                    alt="Uploaded voucher or bill"
                    className="max-h-56 max-w-full rounded-xl object-contain border border-slate-700 bg-black/20"
                  />
                  <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Attached Photo Document
                  </div>
                </div>
              )}

              {msg.role === "user" ? (
                <div className="whitespace-pre-line text-xs sm:text-sm">{msg.content}</div>
              ) : (
                <MarkdownView content={msg.content} />
              )}

              <div
                className={`mt-2.5 text-[9px] font-mono text-right ${
                  msg.role === "user" ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-800 animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-500 ml-1">Analyzing your verified ledger &amp; document...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-none space-y-2">
        {/* Selected Image Preview Chip */}
        {selectedImage && (
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={selectedImage.dataUrl}
                alt="Upload preview"
                className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0"
              />
              <div className="truncate">
                <p className="font-semibold text-slate-800 truncate text-[11px]">{selectedImage.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {(selectedImage.size / 1024).toFixed(1)} KB • Photo attached for AI OCR analysis
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
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

          {/* Paperclip / Camera Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-black hover:bg-slate-100 transition-colors shrink-0"
            title="Attach Bill, Receipt, or Voucher Photo"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="మీ ప్రశ్న ఇక్కడ రాయండి (Ask anything in Telugu or English, or attach a photo)..."
            disabled={loading}
            className="flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedImage)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0 shadow-none"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-3 pt-2 border-t border-slate-100">
          <span>Official KB Khata Ledger Copilot</span>
          <span className="flex items-center gap-1 text-emerald-700 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Grounded in real-time database records
          </span>
        </div>
      </div>
    </div>
  );
}
