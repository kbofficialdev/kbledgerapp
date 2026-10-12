"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Send,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  latestMessage?: string;
}

interface TicketMessage {
  id: string;
  senderRole: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

export default function CustomerTicketsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("BILLING");
  const [priority, setPriority] = useState("MEDIUM");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Active Ticket Conversation Thread Modal
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/tickets");
      if (res.status === 401) {
        router.replace("/customer/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch {
      toast.authError("Failed to load your enquiries.", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.authError("Please fill in both subject and enquiry message.", "Missing Fields");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/customer/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json();
      if (data.success) {
        toast.authSuccess(data.message, "Enquiry Submitted");
        setCreateModalOpen(false);
        setSubject("");
        setMessage("");
        fetchTickets();
      } else {
        toast.authError(data.error || "Failed to submit enquiry.", "Error");
      }
    } catch (err: any) {
      toast.authError("Network error submitting enquiry.", "Connection Issue");
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketThread = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/customer/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setActiveTicket(data.ticket);
      }
    } catch {
      toast.authError("Failed to load ticket thread.", "Network Error");
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;

    try {
      setReplying(true);
      const res = await fetch(`/api/customer/tickets/${activeTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.authSuccess("Reply posted.", "Message Sent");
        setReplyText("");
        // Refresh active ticket thread
        openTicketThread(activeTicket.id);
        fetchTickets();
      } else {
        toast.authError(data.error || "Failed to send reply.", "Error");
      }
    } catch {
      toast.authError("Network error posting reply.", "Connection Issue");
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">Loading support enquiries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 bg-white">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Customer Enquiries & Support Desk
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-mono font-bold border border-indigo-200">
              Direct Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submit billing queries, ledger reconciliation requests, or payment questions directly to KB Fashions management.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold shadow-sm transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Raise New Enquiry</span>
        </button>
      </div>

      {/* 2. TICKETS LIST */}
      <div className="space-y-3">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => openTicketThread(t.id)}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {t.ticketNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-sm">
                    {t.subject}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {t.category}
                  </span>
                </div>

                {t.latestMessage && (
                  <p className="text-xs text-slate-600 line-clamp-1 italic">
                    &ldquo;{t.latestMessage}&rdquo;
                  </p>
                )}

                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Updated: {formatDateTime(t.updatedAt)}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    t.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : t.status === "CLOSED"
                      ? "bg-slate-100 text-slate-600"
                      : t.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {t.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">No active enquiries. Click &ldquo;+ Raise New Enquiry&rdquo; to contact store support.</p>
          </div>
        )}
      </div>

      {/* 3. MODAL: CREATE NEW ENQUIRY */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Raise Support Enquiry
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Discrepancy in Bill #KB-001 or payment clarification"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="BILLING">Billing Question</option>
                    <option value="LEDGER_DISCREPANCY">Khata Ledger Audit</option>
                    <option value="PAYMENT_ISSUE">Cashfree / Payment Issue</option>
                    <option value="GENERAL">General Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Enquiry Description</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or requested adjustment in detail..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 font-semibold disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: TICKET CONVERSATION THREAD */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-900">
                    {activeTicket.ticketNumber}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{activeTicket.subject}</h3>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Category: {activeTicket.category} • Status: {activeTicket.status}
                </div>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Thread History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {activeTicket.messages.map((msg) => {
                const isAdmin = msg.senderRole === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                        isAdmin
                          ? "bg-white border border-slate-200 text-slate-900 rounded-tl-xs shadow-xs"
                          : "bg-black text-white rounded-tr-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                        <span>{msg.senderName}</span>
                        <span>{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Type your response to store management..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                onClick={handleSendReply}
                disabled={replying || !replyText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-bold disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

