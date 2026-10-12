"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Receipt,
  BookOpen,
  IndianRupee,
  Plus,
  ArrowLeft,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Send,
  Archive,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { VoiceCalloutButton } from "@/components/common/VoiceCalloutButton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/ui/Table";

interface OrderItem {
  id: string;
  customItemId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  lineTotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: "CREDIT" | "DEBIT" | "PARTIAL";
  paymentStatus: string;
  items: OrderItem[];
}

interface LedgerEntry {
  id: string;
  entryDate: string;
  entryType: "BILL_DEBIT" | "PAYMENT_CREDIT" | "ADJUSTMENT";
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
}

interface PaymentRecord {
  id: string;
  paymentRef: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  notes?: string;
}

interface CustomerDetail {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  address?: string;
  villageId: string;
  village: { id: string; name: string; code: string };
  creditLimit: number;
  currentBalance: number;
  notes?: string;
  createdAt: string;
  orders: Order[];
  ledgerEntries: LedgerEntry[];
  payments: PaymentRecord[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "orders" | "payments">("ledger");

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "GOOGLE_PAY_UPI" | "GOOGLE_PAY_QR">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleArchiveCustomer = async () => {
    if (!customer || archiving) return;
    if (!window.confirm(`Are you sure you want to archive customer "${customer.name}"? This action requires zero pending balance.`)) {
      return;
    }
    try {
      setArchiving(true);
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPayFeedback({ type: "success", message: data.message || "Customer archived successfully." });
        setTimeout(() => router.push("/customers"), 1200);
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to archive customer." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setArchiving(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!customer) return;
    try {
      setSendingEmail(true);
      const res = await fetch(`/api/customers/${customer.id}/resend-credentials`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPayFeedback({ type: "success", message: data.message });
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to send credentials." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.customer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingPay) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) return;

    try {
      setSubmittingPay(true);
      setPayFeedback(null);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          amount: amountNum,
          method: payMethod,
          notes: payNotes || "Counter Khata Jama payment",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPayFeedback({ type: "success", message: `Payment of ${formatCurrency(amountNum)} recorded successfully!` });
        setPayAmount("");
        setPayNotes("");
        setIsPayModalOpen(false);
        fetchCustomer();
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to record payment" });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmittingPay(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-1/4 animate-pulse"></div>
        <Card className="p-6 h-48 animate-pulse bg-slate-100 dark:bg-zinc-800"></Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">Customer Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 mb-4">The requested customer account does not exist or was archived.</p>
        <Link href="/customers">
          <Button variant="primary" size="md">
            Back to Customers
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="p-2 bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CustomerAvatar name={customer.name} size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{customer.name}</h1>
              <Badge variant="neutral">
                {customer.customerCode}
              </Badge>
              <VoiceCalloutButton
                payload={{
                  customerName: customer.name,
                  villageName: customer.village.name,
                  amount: customer.currentBalance,
                  paymentType: "CREDIT",
                }}
                variant="badge"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Village: <strong>{customer.village.name}</strong> ({customer.village.code})</span>
              </span>
              {customer.email && (
                <span className="flex items-center gap-1 font-mono text-slate-400 dark:text-zinc-500">
                  <Mail className="w-3 h-3" />
                  <span>{customer.email}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {customer.email && (
            <Button
              variant="outline"
              size="sm"
              icon={Send}
              onClick={handleSendCredentials}
              disabled={sendingEmail}
              loading={sendingEmail}
              title="Send Account Credentials and Portal Link to Customer Email"
            >
              Email Portal Link
            </Button>
          )}

          <Link href={`/portal/${customer.id}`} target="_blank">
            <Button
              variant="outline"
              size="sm"
              icon={Smartphone}
              className="border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400"
              title="Open customer self-service view"
            >
              Open Portal
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print Khata
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={IndianRupee}
            className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
            onClick={() => {
              setPayAmount(customer.currentBalance > 0 ? customer.currentBalance.toString() : "");
              setIsPayModalOpen(true);
            }}
          >
            Record Payment (Jama)
          </Button>

          <Button
            variant="destructive"
            size="sm"
            icon={Archive}
            onClick={handleArchiveCustomer}
            disabled={archiving}
            loading={archiving}
            title="Archive customer account (must have zero balance)"
          >
            Archive
          </Button>

          <Link href={`/orders/new?customerId=${customer.id}&villageId=${customer.villageId}`}>
            <Button variant="primary" size="sm" icon={Plus}>
              New Bill
            </Button>
          </Link>
        </div>
      </div>

      {payFeedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
            payFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{payFeedback.message}</span>
          </div>
          <button onClick={() => setPayFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Outstanding Balance Banner */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Current Khata Balance (Udhaar)
              </span>
              <p
                className={`text-2xl font-bold font-mono mt-1 tabular-nums ${
                  customer.currentBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatCurrency(customer.currentBalance)}
              </p>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-zinc-400 flex items-center justify-between border-t border-slate-200 dark:border-zinc-700 pt-2">
              <span>Credit Limit:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : "No Limit"}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
              <span className="font-mono font-medium text-slate-900 dark:text-zinc-100">{customer.mobile}</span>
              {customer.altMobile && (
                <span className="text-slate-400 dark:text-zinc-500 font-mono">/ {customer.altMobile}</span>
              )}
            </div>

            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-zinc-300">{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-zinc-400">{customer.address}</span>
              </div>
            )}
          </div>

          {/* Metadata & Summary */}
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-zinc-400 border-t md:border-t-0 md:border-l border-slate-200 dark:border-zinc-800 md:pl-6 pt-3 md:pt-0">
            <p>
              Account Registered: <strong className="text-slate-700 dark:text-zinc-300">{formatDate(customer.createdAt)}</strong>
            </p>
            <p>
              Total Bills Recorded: <strong className="text-slate-700 dark:text-zinc-300">{customer.orders.length}</strong>
            </p>
            <p>
              Total Payments (Jama): <strong className="text-slate-700 dark:text-zinc-300">{customer.payments.length}</strong>
            </p>
            {customer.notes && (
              <div className="mt-2 p-2 bg-slate-100 dark:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 italic text-[11px]">
                &ldquo;{customer.notes}&rdquo;
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs: Ledger Statement | Orders | Payments */}
      <div className="space-y-3">
        <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 gap-1 no-print">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "ledger"
                ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bahi-Khata Ledger Statement ({customer.ledgerEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Counter Bills ({customer.orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Receipts ({customer.payments.length})</span>
          </button>
        </div>

        {/* Tab 1: Khata Ledger Statement */}
        {activeTab === "ledger" && (
          <div>
            {customer.ledgerEntries.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No ledger transactions recorded yet"
                description="Record a counter bill or credit payment to generate statements."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars / Description</TableHead>
                    <TableHead className="text-right text-rose-600 dark:text-rose-400">Debit (Bill / Udhaar)</TableHead>
                    <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Credit (Payment / Jama)</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.ledgerEntries.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-slate-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                        {formatDateTime(l.entryDate)}
                      </TableCell>
                      <TableCell className="text-slate-800 dark:text-zinc-200 font-medium text-xs">
                        {l.description}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 dark:text-rose-400 font-bold tabular-nums text-xs font-mono">
                        {l.debitAmount > 0 ? formatCurrency(l.debitAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums text-xs font-mono">
                        {l.creditAmount > 0 ? formatCurrency(l.creditAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-slate-900 dark:text-zinc-100 text-xs font-mono">
                        {formatCurrency(l.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 2: Orders / Counter Bills */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {customer.orders.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-400">
                No counter bills recorded for this customer yet.
              </Card>
            ) : (
              customer.orders.map((o) => (
                <Card
                  key={o.id}
                  className="p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono text-xs text-slate-900 dark:text-zinc-100">{o.orderNumber}</span>
                        <Badge
                          variant={
                            o.paymentType === "DEBIT"
                              ? "success"
                              : o.paymentType === "PARTIAL"
                              ? "warning"
                              : "error"
                          }
                        >
                          {o.paymentType === "DEBIT" ? "Fully Paid (Debit)" : o.paymentType === "PARTIAL" ? "Partial Paid" : "Unpaid (Credit)"}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">{formatDateTime(o.orderDate)}</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs text-slate-400 dark:text-zinc-500">Total Bill: </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{formatCurrency(o.totalAmount)}</span>
                      {o.paymentType === "PARTIAL" && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 tabular-nums">
                          Paid: {formatCurrency(o.paidAmount)} | Udhaar: {formatCurrency(o.creditAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Itemized Line Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 dark:text-zinc-500 font-medium border-b border-slate-100 dark:border-zinc-800">
                          <th className="py-1">Item Code</th>
                          <th className="py-1">Description</th>
                          <th className="py-1 text-center">Qty</th>
                          <th className="py-1 text-right">Rate</th>
                          <th className="py-1 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-mono">
                        {o.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-slate-500 dark:text-zinc-400 text-[11px]">{item.customItemId}</td>
                            <td className="py-1.5 text-slate-900 dark:text-zinc-100 font-sans font-medium">{item.name}</td>
                            <td className="py-1.5 text-center text-slate-700 dark:text-zinc-300">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-1.5 text-right text-slate-700 dark:text-zinc-300 tabular-nums">{formatCurrency(item.pricePerUnit)}</td>
                            <td className="py-1.5 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Payments */}
        {activeTab === "payments" && (
          <div>
            {customer.payments.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No payment receipts recorded yet"
                description="Use Record Payment (Jama) button to log customer debt clearance."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Ref</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Amount Paid (Jama)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold text-slate-900 dark:text-zinc-100 text-xs">{p.paymentRef}</TableCell>
                      <TableCell className="text-slate-600 dark:text-zinc-400 text-xs">{formatDateTime(p.paidAt)}</TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {p.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-zinc-400 text-xs">{p.notes || "—"}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono tabular-nums">
                        {formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* Record Payment (Jama) Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Khata Jama / Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-md border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-zinc-400">Customer Current Udhaar:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm tabular-nums">
              {formatCurrency(customer.currentBalance)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 500"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-mono text-sm font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod("CASH")}
                className={`py-2 px-3 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                  payMethod === "CASH"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-800 dark:text-emerald-400"
                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                <IndianRupee className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod("GOOGLE_PAY_UPI")}
                className={`py-2 px-3 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                  payMethod === "GOOGLE_PAY_UPI"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-800 dark:text-blue-400"
                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Google Pay UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod("GOOGLE_PAY_QR")}
                className={`py-2 px-3 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                  payMethod === "GOOGLE_PAY_QR"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-800 dark:text-indigo-400"
                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>G-Pay QR</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Receipt Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in cash at weekly market"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsPayModalOpen(false)}
              disabled={submittingPay}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submittingPay}
              disabled={submittingPay || !payAmount}
            >
              Record Jama (Credit)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
