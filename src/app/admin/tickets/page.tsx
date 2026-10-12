"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  X,
  User,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { CustomerAvatar } from "@/components/common/Avatars";

interface AdminTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  villageName: string;
  customerBalance: number;
  createdAt: string;
  updatedAt: string;
  latestMessage?: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  customer: {
    id: string;
    name: string;
    customerCode: string;
    mobile: string;
    currentBalance: number;
    village: { name: string };
  };
  messages: Array<{
    id: string;
    senderRole: string;
    senderName: string;
    content: string;
    createdAt: string;
  }>;
}

export default function AdminTicketsDeskPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Conversation Detail Modal
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [targetStatus, setTargetStatus] = useState("RESOLVED");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== "ALL" ? `/api/admin/tickets?status=${statusFilter}` : "/api/admin/tickets";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch {
      toast.authError("Failed to fetch customer tickets.", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const openTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setActiveTicket(data.ticket);
        setTargetStatus(data.ticket.status);
      }
    } catch {
      toast.authError("Failed to load ticket details.", "Error");
    }
  };

  const handleAdminReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;

    try {
      setSubmittingReply(true);
      const res = await fetch(`/api/admin/tickets/${activeTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyMessage.trim(),
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.authSuccess("Reply dispatched and status updated.", "Response Saved");
        setReplyMessage("");
        openTicketDetail(activeTicket.id);
        fetchTickets();
      } else {
        toast.authError(data.error || "Failed to post reply.", "Error");
      }
    } catch {
      toast.authError("Network error sending response.", "Error");
    } finally {
      setSubmittingReply(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  const filteredTickets = tickets.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 bg-white">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Customer Support & Enquiries Desk
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-mono font-bold border border-indigo-200">
              {openCount} Open
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Resolve customer billing inquiries, ledger audit requests, and payment questions with direct message threads.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh Enquiries"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. STATS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
            Needs Attention (Open)
          </span>
          <div className="text-2xl font-black text-amber-900 font-mono mt-1">{openCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
            In Investigation
          </span>
          <div className="text-2xl font-black text-blue-900 font-mono mt-1">{inProgressCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Resolved Issues
          </span>
          <div className="text-2xl font-black text-emerald-900 font-mono mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold self-start">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "ALL" ? "bg-white text-black shadow-xs" : "text-slate-600"
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "OPEN" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "IN_PROGRESS" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`px-3 py-1 rounded-md transition-all ${
              statusFilter === "RESOLVED" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
            }`}
          >
            Resolved
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket # or customer..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-64"
          />
        </div>
      </div>

      {/* 4. TICKETS TABLE / LIST */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject & Latest Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTicketDetail(t.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-950">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{t.customerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {t.customerCode} • {t.villageName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{t.subject}</div>
                      {t.latestMessage && (
                        <div className="text-[11px] text-slate-500 truncate italic">
                          &ldquo;{t.latestMessage}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicketDetail(t.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 text-[11px] font-semibold"
                      >
                        Respond
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No support enquiries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ADMIN TICKET DETAIL & REPLY THREAD */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-900">
                    {activeTicket.ticketNumber}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{activeTicket.subject}</h3>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Customer: <strong>{activeTicket.customer.name}</strong> ({activeTicket.customer.customerCode}) • Udhaar:{" "}
                  <strong className="text-rose-600 font-mono">
                    {formatCurrency(activeTicket.customer.currentBalance)}
                  </strong>
                </div>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {activeTicket.messages.map((msg) => {
                const isAdmin = msg.senderRole === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                        isAdmin
                          ? "bg-black text-white rounded-tr-xs"
                          : "bg-white border border-slate-200 text-slate-900 rounded-tl-xs shadow-xs"
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

            {/* Admin Reply & Status Controls */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">Update Status:</span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 font-semibold text-xs"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <textarea
                  rows={2}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type official store reply or resolution notes to customer..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
                <button
                  onClick={handleAdminReply}
                  disabled={submittingReply || !replyMessage.trim()}
                  className="px-4 py-2.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5 self-end"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

