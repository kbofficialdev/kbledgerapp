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
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  FileSpreadsheet,
  Mail,
  PlusCircle,
  Download,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Workflow,
  Terminal,
  Sliders,
  ArrowUpRight,
  Layers,
  Zap,
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

interface AgentToolStep {
  id: string;
  toolName: string;
  label: string;
  status: "completed" | "failed";
  durationMs: number;
  summary: string;
  args: Record<string, any>;
}

interface LangGraphNodeTrace {
  node: string;
  label: string;
  framework: string;
  durationMs: number;
  detail: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: string;
  toolSteps?: AgentToolStep[];
  artifacts?: AgentArtifact[];
  graphTrace?: LangGraphNodeTrace[];
}

interface StoreMetrics {
  totalVillages: number;
  totalCustomers: number;
  totalOutstandingUdhaar: number;
  totalOrders: number;
  openTickets: number;
}

interface CustomerOption {
  id: string;
  name: string;
  customerCode: string;
  mobile: string;
  email: string | null;
  currentBalance: number;
  villageName: string;
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

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [activeToolModal, setActiveToolModal] = useState<string | null>(null);

  // Interactive Tool Form States
  const [emailForm, setEmailForm] = useState({
    recipientQuery: "",
    subject: "[KB Fashions & Khata] Official Account Statement & Payment Reminder",
    messageBody: "",
  });

  const [orderForm, setOrderForm] = useState({
    customerQuery: "",
    itemName: "Pattu Saree & Dress Material",
    quantity: 1,
    unit: "pcs",
    pricePerUnit: 1250,
    paymentType: "CREDIT",
    paidAmount: 0,
  });

  const [paymentForm, setPaymentForm] = useState({
    customerQuery: "",
    amount: 500,
    method: "CASH",
    notes: "Counter collection via LangGraph Agent",
  });

  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    email: "",
    villageName: "Tandoor",
    creditLimit: 10000,
    openingBalance: 0,
  });

  const [villageForm, setVillageForm] = useState({
    name: "",
    code: "",
    taluk: "Tandoor",
    district: "Mancherial",
    pincode: "504272",
  });

  const [visualForm, setVisualForm] = useState({
    visualType: "VILLAGE_DEBT_CHART",
    headline: "KB Fashions & Khata — Executive Store Analytics",
    subtext: "",
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the **KB Khata Autonomous GenAI Studio**, orchestrated by a custom **LangGraph `StateGraph`** and **LangChain `DynamicStructuredTool`** pipeline powered by the **Google Gemini LLM Brain** (`ChatGoogleGenerativeAI`).\n\n### ⚡ Equipped Autonomous Agent Capabilities\n- **📄 PDF Report Engine (`generate_pdf_report`)**: Compile & download official A4 PDF Ledger Reports, Customer Statements, and Debt Recovery Schedules.\n- **📊 Excel Workbook Engine (`generate_excel_sheet`)**: Export 4-tab `.xlsx` spreadsheets (Customer Balances, Village Exposure, Orders, and Payments).\n- **🎨 Visual & Chart Generator (`generate_visual_image`)**: Render high-definition store analytics charts, KPI infographics, and promotional banners.\n- **✉️ SMTP Mail Dispatcher (`draft_and_send_email`)**: Compose and send real emails (payment reminders, statements, custom notices) to customers.\n- **🛠️ Full Store CRUD Tools**: Create Villages, Register Customers, Generate Itemized Order Bills (`DEBIT`/`CREDIT`/`PARTIAL`), Record Payments, and Resolve Support Tickets directly from this workspace.",
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

  useEffect(() => {
    async function loadInitialContext() {
      try {
        const res = await fetch("/api/admin/ai");
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) setMetrics(data.metrics);
          if (data.customers && data.customers.length > 0) {
            setCustomers(data.customers);
            setEmailForm((prev) => ({
              ...prev,
              recipientQuery: prev.recipientQuery || data.customers[0].name,
            }));
            setOrderForm((prev) => ({
              ...prev,
              customerQuery: prev.customerQuery || data.customers[0].name,
            }));
            setPaymentForm((prev) => ({
              ...prev,
              customerQuery: prev.customerQuery || data.customers[0].name,
            }));
          }
        }
      } catch (e) {
        console.error("Failed to load initial context for GenAI Studio", e);
      }
    }
    loadInitialContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      toast.info(`Attached document: ${file.name}`, "Multimodal Input Ready");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeAgentTurn = async (params: {
    promptText: string;
    toolAction?: { toolName: string; args: Record<string, any> };
  }) => {
    if (loading) return;
    const currentImg = selectedImage;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: params.promptText,
      image: currentImg ? currentImg.dataUrl : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setActiveToolModal(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.promptText,
          toolAction: params.toolAction,
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
          toolSteps: data.toolSteps || [],
          artifacts: data.artifacts || [],
          graphTrace: data.graphTrace || [],
        };
        setMessages((prev) => [...prev, aiMessage]);
        if (data.metrics) setMetrics(data.metrics);
        if (data.customers) setCustomers(data.customers);
        if (data.artifacts && data.artifacts.length > 0) {
          toast.success(`LangGraph Agent generated ${data.artifacts.length} output artifact(s).`, "Tool Executed");
        }
      } else {
        toast.error(data.error || "Failed to execute LangGraph Agent turn.", "Agent Notice");
      }
    } catch {
      toast.error("Network error communicating with LangGraph Agent endpoint.", "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard.", "Copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome_reset",
        role: "assistant",
        content:
          "**LangGraph StateGraph Session Reset.** All 9 LangChain structured tools (`generate_pdf_report`, `generate_excel_sheet`, `generate_visual_image`, `draft_and_send_email`, `create_village`, `register_customer`, `create_order_bill`, `record_payment`, `manage_support_ticket`) are online and connected to PostgreSQL.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.info("Agent state graph cleared.", "Session Reset");
  };

  return (
    <div className="space-y-5 pb-12">
      {/* =================================================================== */}
      {/* 1. MODERN LANGGRAPH + GEMINI BRAIN STUDIO HEADER                    */}
      {/* =================================================================== */}
      <div className="rounded-2xl bg-zinc-950 text-white border border-zinc-800 p-5 sm:p-7 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LANGGRAPH STATEGRAPH AGENT
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] font-mono">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                Brain: Gemini 2.5 Flash (ChatGoogleGenerativeAI)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] font-mono">
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                9 LangChain Structured Tools
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>KB Autonomous GenAI Operations Studio</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Multi-node LangGraph agent equipped with executable LangChain tools to generate PDF reports, export multi-sheet Excel workbooks, render visual charts, send SMTP emails, and execute live dashboard CRUD operations.
            </p>
          </div>

          {/* Live PostgreSQL Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
            <div className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Udhaar Exposure</div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                ₹{Number(metrics.totalOutstandingUdhaar).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Villages</div>
              <div className="text-sm font-bold font-mono text-white mt-0.5">
                {metrics.totalVillages}
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Customers</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {metrics.totalCustomers}
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Total Bills</div>
              <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                {metrics.totalOrders}
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Open Tickets</div>
              <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                {metrics.openTickets}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. LANGCHAIN STRUCTURED TOOL COMMAND DOCK (1-CLICK + CONFIGURABLE)   */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-900" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              LangChain Agent Tool Suite — Instant Execution &amp; Dashboard Operations
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            Click any tool to execute or configure parameters
          </span>
        </div>

        {/* Row A: Artifact & Communication Generators (PDF, Excel, Image, Email) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Tool 1: PDF Generator */}
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              executeAgentTurn({
                promptText: "Generate an official Executive Store Ledger PDF Report from live PostgreSQL records.",
                toolAction: {
                  toolName: "generate_pdf_report",
                  args: { reportType: "STORE_LEDGER" },
                },
              })
            }
            className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-50 text-left transition-all group disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Generate PDF Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Official A4 Store Ledger &amp; Debtors PDF
              </p>
            </div>
          </button>

          {/* Tool 2: Excel Workbook Generator */}
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              executeAgentTurn({
                promptText:
                  "Export a multi-sheet Excel (.xlsx) workbook with Customers, Villages, Orders, and Payments.",
                toolAction: {
                  toolName: "generate_excel_sheet",
                  args: { sheetType: "FULL_WORKBOOK" },
                },
              })
            }
            className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-50 text-left transition-all group disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Generate Excel (.xlsx)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                4-Tab Store &amp; Collection Workbook
              </p>
            </div>
          </button>

          {/* Tool 3: Visual Chart / Image Generator */}
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setActiveToolModal(activeToolModal === "visual" ? null : "visual")
            }
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all group disabled:opacity-50 ${
              activeToolModal === "visual"
                ? "border-zinc-900 bg-zinc-100"
                : "border-zinc-200 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-50"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Generate Visual / Chart</span>
                <Sliders className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                HD Village Exposure Chart &amp; Poster
              </p>
            </div>
          </button>

          {/* Tool 4: Send Email via SMTP */}
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setActiveToolModal(activeToolModal === "email" ? null : "email")
            }
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all group disabled:opacity-50 ${
              activeToolModal === "email"
                ? "border-zinc-900 bg-zinc-100"
                : "border-zinc-200 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-50"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                <span>Draft &amp; Send Email</span>
                <Sliders className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Dispatch Statement or Reminder Mail
              </p>
            </div>
          </button>
        </div>

        {/* Row B: Dashboard CRUD Operations (Create Bill, Record Payment, Add Customer, Add Village, Resolve Ticket) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
            Dashboard Operations:
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveToolModal(activeToolModal === "order" ? null : "order")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeToolModal === "order"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-900"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Order / Bill</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveToolModal(activeToolModal === "payment" ? null : "payment")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeToolModal === "payment"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Record Khata Payment</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveToolModal(activeToolModal === "customer" ? null : "customer")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeToolModal === "customer"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-900"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Customer</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveToolModal(activeToolModal === "village" ? null : "village")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              activeToolModal === "village"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-900"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Village Territory</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              executeAgentTurn({
                promptText: "Audit and resolve the latest open customer support ticket.",
                toolAction: {
                  toolName: "manage_support_ticket",
                  args: {
                    ticketQuery: "LATEST",
                    replyMessage:
                      "Namaste! Your ledger inquiry has been verified and resolved by the KB Store Admin Desk.",
                    newStatus: "RESOLVED",
                  },
                },
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-900 bg-white text-zinc-800 text-xs font-semibold transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Audit &amp; Resolve Ticket</span>
          </button>
        </div>

        {/* =============================================================== */}
        {/* INTERACTIVE TOOL PARAMETER BUILDER DRAWER                       */}
        {/* =============================================================== */}
        {activeToolModal === "visual" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                🎨 Configure Visual / Chart Generator (`generate_visual_image`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Visual Type</label>
                <select
                  value={visualForm.visualType}
                  onChange={(e) => setVisualForm({ ...visualForm, visualType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                >
                  <option value="VILLAGE_DEBT_CHART">Village Debt Concentration Chart</option>
                  <option value="FINANCIAL_INFOGRAPHIC">Executive Financial KPI Infographic</option>
                  <option value="PROMO_POSTER">Festive Store Promotional Banner</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Custom Headline</label>
                <input
                  type="text"
                  value={visualForm.headline}
                  onChange={(e) => setVisualForm({ ...visualForm, headline: e.target.value })}
                  placeholder="Headline for chart or poster"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Generate a ${visualForm.visualType} visual graphic titled "${visualForm.headline}".`,
                    toolAction: {
                      toolName: "generate_visual_image",
                      args: visualForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Render Visual Image Now
              </button>
            </div>
          </div>
        )}

        {activeToolModal === "email" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                ✉️ Configure SMTP Email Dispatcher (`draft_and_send_email`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Customer Name, Code, or Email Address
                </label>
                <input
                  type="text"
                  value={emailForm.recipientQuery}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientQuery: e.target.value })}
                  placeholder="Enter customer name or email address"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Custom Message (Leave blank to auto-generate verified statement with live balance)
                </label>
                <textarea
                  rows={2}
                  value={emailForm.messageBody}
                  onChange={(e) => setEmailForm({ ...emailForm, messageBody: e.target.value })}
                  placeholder="Optional custom message body..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Send an official store email to ${emailForm.recipientQuery} with subject "${emailForm.subject}".`,
                    toolAction: {
                      toolName: "draft_and_send_email",
                      args: emailForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Send Email via SMTP
              </button>
            </div>
          </div>
        )}

        {activeToolModal === "order" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                🧾 Create Store Order / Bill (`create_order_bill`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Customer</label>
                <input
                  type="text"
                  value={orderForm.customerQuery}
                  onChange={(e) => setOrderForm({ ...orderForm, customerQuery: e.target.value })}
                  placeholder="Customer name or mobile"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Item Name</label>
                <input
                  type="text"
                  value={orderForm.itemName}
                  onChange={(e) => setOrderForm({ ...orderForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  value={orderForm.pricePerUnit}
                  onChange={(e) => setOrderForm({ ...orderForm, pricePerUnit: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Payment Mode</label>
                <select
                  value={orderForm.paymentType}
                  onChange={(e) => setOrderForm({ ...orderForm, paymentType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                >
                  <option value="CREDIT">CREDIT (Add to Udhaar)</option>
                  <option value="DEBIT">DEBIT (Paid Full Cash)</option>
                  <option value="PARTIAL">PARTIAL (Half Paid)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Create an order bill for ${orderForm.customerQuery}: ${orderForm.quantity} ${orderForm.unit} of ${orderForm.itemName} at ₹${orderForm.pricePerUnit} [${orderForm.paymentType}].`,
                    toolAction: {
                      toolName: "create_order_bill",
                      args: orderForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Create Order &amp; Update Ledger
              </button>
            </div>
          </div>
        )}

        {activeToolModal === "payment" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                💳 Record Customer Payment (`record_payment`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Customer</label>
                <input
                  type="text"
                  value={paymentForm.customerQuery}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerQuery: e.target.value })}
                  placeholder="Customer name, code, or mobile"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                >
                  <option value="CASH">CASH (Counter Nagathu)</option>
                  <option value="GPAY">GPAY / UPI</option>
                  <option value="DYNAMIC_QR">DYNAMIC QR</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Record a payment of ₹${paymentForm.amount} via ${paymentForm.method} from customer ${paymentForm.customerQuery}.`,
                    toolAction: {
                      toolName: "record_payment",
                      args: paymentForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Record Payment &amp; Settle Balance
              </button>
            </div>
          </div>
        )}

        {activeToolModal === "customer" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                👤 Register New Customer (`register_customer`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Customer full name"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">10-Digit Mobile</label>
                <input
                  type="text"
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="Optional email for OTP"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Opening Udhaar (₹)</label>
                <input
                  type="number"
                  value={customerForm.openingBalance}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, openingBalance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Register customer ${customerForm.name} (Mobile: ${customerForm.mobile}) in village ${customerForm.villageName} with opening balance ₹${customerForm.openingBalance}.`,
                    toolAction: {
                      toolName: "register_customer",
                      args: customerForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Register Customer Account
              </button>
            </div>
          </div>
        )}

        {activeToolModal === "village" && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">
                🏘️ Add Village Territory (`create_village`)
              </span>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Village Name</label>
                <input
                  type="text"
                  value={villageForm.name}
                  onChange={(e) => setVillageForm({ ...villageForm, name: e.target.value })}
                  placeholder="e.g. Rampur"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Territory Code</label>
                <input
                  type="text"
                  value={villageForm.code}
                  onChange={(e) => setVillageForm({ ...villageForm, code: e.target.value })}
                  placeholder="e.g. VIL-RMP (Auto if blank)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Mandal / Taluk</label>
                <input
                  type="text"
                  value={villageForm.taluk}
                  onChange={(e) => setVillageForm({ ...villageForm, taluk: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  executeAgentTurn({
                    promptText: `Create a new village territory named ${villageForm.name} in ${villageForm.taluk} mandal.`,
                    toolAction: {
                      toolName: "create_village",
                      args: villageForm,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                Save Village Territory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 3. AGENT CONVERSATION & ARTIFACT STREAM                             */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-zinc-200 bg-white flex flex-col min-h-[540px]">
        {/* Workspace Top Bar */}
        <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-zinc-900">
              LangGraph Execution Stream
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white">
              StateGraph → ToolNode → Gemini Brain
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="Reset Agent Session"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Graph</span>
            </button>
          </div>
        </div>

        {/* Message & Artifact Stream */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[680px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-950 text-amber-400 border border-zinc-800"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              {/* Message Column */}
              <div
                className={`flex flex-col space-y-2.5 ${
                  msg.role === "user"
                    ? "items-end max-w-[85%] sm:max-w-[75%]"
                    : "items-start max-w-[95%] sm:max-w-[88%] w-full"
                }`}
              >
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>
                    {msg.role === "user"
                      ? "Store Administrator"
                      : "LangGraph Autonomous Agent (Gemini Brain)"}
                  </span>
                  <span>•</span>
                  <span className="font-mono lowercase">{msg.timestamp}</span>
                </div>

                {/* 1. LANGGRAPH NODE EXECUTION TRACE PILLS */}
                {msg.graphTrace && msg.graphTrace.length > 0 && (
                  <div className="w-full rounded-xl bg-zinc-950 text-zinc-200 p-3 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Workflow className="w-3.5 h-3.5" />
                        LangGraph StateGraph Pipeline Trace
                      </span>
                      <span>
                        {msg.graphTrace.reduce((acc, n) => acc + n.durationMs, 0)}ms total
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {msg.graphTrace.map((trace, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-sky-400">
                            <span>{trace.node}</span>
                            <span>{trace.durationMs}ms</span>
                          </div>
                          <div className="font-bold text-white truncate mt-0.5">{trace.label}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{trace.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. LANGCHAIN TOOL EXECUTION STEPS */}
                {msg.toolSteps && msg.toolSteps.length > 0 && (
                  <div className="flex flex-wrap gap-2 w-full">
                    {msg.toolSteps.map((step) => (
                      <div
                        key={step.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium"
                      >
                        <Terminal className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-[11px]">{step.toolName}</span>
                        <span className="text-emerald-700">• {step.label}</span>
                        <span className="text-[10px] font-mono text-emerald-600">
                          ({step.durationMs}ms)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. GENERATED ARTIFACT CARDS (PDF, EXCEL, VISUAL IMAGE, EMAIL, DB RECORD) */}
                {msg.artifacts && msg.artifacts.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 w-full">
                    {msg.artifacts.map((art) => (
                      <div
                        key={art.id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                                art.type === "pdf"
                                  ? "bg-rose-600"
                                  : art.type === "excel"
                                    ? "bg-emerald-600"
                                    : art.type === "image"
                                      ? "bg-indigo-600"
                                      : art.type === "email"
                                        ? "bg-sky-600"
                                        : "bg-zinc-900"
                              }`}
                            >
                              {art.type === "pdf" && <FileText className="w-5 h-5" />}
                              {art.type === "excel" && <FileSpreadsheet className="w-5 h-5" />}
                              {art.type === "image" && <ImageIcon className="w-5 h-5" />}
                              {art.type === "email" && <Mail className="w-5 h-5" />}
                              {art.type === "record" && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-zinc-900">
                                  {art.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-200 text-zinc-800">
                                  {art.type}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-0.5">{art.subtitle}</p>
                            </div>
                          </div>

                          {/* Action Buttons (Download PDF / Excel / Image or View Dashboard) */}
                          <div className="flex items-center gap-2 shrink-0">
                            {art.dataUrl && art.filename && (
                              <a
                                href={art.dataUrl}
                                download={art.filename}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>
                                  Download{" "}
                                  {art.type === "pdf"
                                    ? "PDF"
                                    : art.type === "excel"
                                      ? "Excel (.xlsx)"
                                      : "Image"}
                                </span>
                              </a>
                            )}

                            {art.dashboardLink && (
                              <Link
                                href={art.dashboardLink}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold transition-colors"
                              >
                                <span>Open in Dashboard</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Inline Image Preview if type === 'image' */}
                        {art.type === "image" && art.dataUrl && (
                          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-2">
                            <img
                              src={art.dataUrl}
                              alt={art.title}
                              className="w-full max-h-[380px] object-contain rounded-lg mx-auto"
                            />
                          </div>
                        )}

                        {/* Email Body Preview if type === 'email' */}
                        {art.type === "email" && art.previewText && (
                          <div className="p-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-700 whitespace-pre-wrap font-mono">
                            {art.previewText}
                          </div>
                        )}

                        {/* Metadata Pills */}
                        {art.metadata && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {Object.entries(art.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-[11px] text-zinc-600 font-mono"
                              >
                                <strong className="text-zinc-900">{k}:</strong> {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. MARKDOWN MESSAGE BODY */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed w-full ${
                    msg.role === "user"
                      ? "bg-zinc-900 text-white rounded-tr-none font-medium"
                      : "bg-white border border-zinc-200 text-zinc-900 rounded-tl-none"
                  }`}
                >
                  {msg.image && (
                    <div className="mb-3">
                      <img
                        src={msg.image}
                        alt="Uploaded document"
                        className="max-h-56 max-w-full rounded-xl object-contain border border-zinc-700 bg-black/20"
                      />
                    </div>
                  )}

                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="space-y-3">
                      <MarkdownView content={msg.content} />
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-mono">
                          LangGraph StateGraph • Grounded in PostgreSQL
                        </span>
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Response</span>
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

          {/* Loading State */}
          {loading && (
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-amber-400 border border-zinc-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-zinc-950 text-zinc-200 border border-zinc-800 p-4 text-xs flex items-center gap-3">
                <Workflow className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-mono">
                  Traversing LangGraph StateGraph (context_loader → agent_planner → tool_executor → Gemini Brain)...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Prompt Bar */}
        <div className="p-3 sm:p-4 border-t border-zinc-100 bg-zinc-50/70 rounded-b-2xl space-y-2.5">
          {/* Quick Natural-Language Agent Prompts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              "Generate PDF store ledger report",
              "Export multi-sheet Excel workbook (.xlsx)",
              "Generate visual chart of village debt",
              "Send payment reminder email to KOKKULA BHAVITH KUMAR",
              "Analyze village-wise debtor concentration & recovery plan",
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => executeAgentTurn({ promptText: q })}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-900 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {selectedImage && (
            <div className="p-2 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src={selectedImage.dataUrl}
                  alt="Upload preview"
                  className="w-10 h-10 rounded-lg object-cover border border-zinc-300 shrink-0"
                />
                <div className="truncate">
                  <p className="font-semibold text-zinc-800 truncate text-[11px]">
                    {selectedImage.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {(selectedImage.size / 1024).toFixed(1)} KB • Attached for Multimodal OCR
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() && !selectedImage) return;
              executeAgentTurn({
                promptText: input.trim() || "Analyze this attached store document image.",
              });
            }}
            className="flex items-center gap-2"
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
              className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black transition-colors shrink-0"
              title="Attach Document or Receipt Photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Instruct the LangGraph Agent: 'Generate PDF report', 'Export Excel', 'Send email to Bhavith', 'Create bill'..."
              disabled={loading}
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-40 shrink-0"
            >
              <span>Run Agent</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pt-1">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Powered by LangGraph StateGraph + LangChain Tools + Gemini LLM Brain
            </span>
            <span className="hidden sm:inline font-mono">PostgreSQL 16 Live Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
