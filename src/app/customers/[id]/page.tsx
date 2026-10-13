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
  Edit3,
  Ban,
  Trash2,
  ShieldCheck,
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

interface VillageOption {
  id: string;
  name: string;
  code: string;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
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
  village: VillageOption;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
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
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "orders" | "payments">("ledger");

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "GOOGLE_PAY_UPI" | "GOOGLE_PAY_QR">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // Edit Profile / Village / Delete Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditVillageModalOpen, setIsEditVillageModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [editForm, setEditForm] = useState({
    villageId: "",
    name: "",
    mobile: "",
    altMobile: "",
    email: "",
    address: "",
    creditLimit: "5000",
    notes: "",
  });

  const [editVillageForm, setEditVillageForm] = useState({
    name: "",
    code: "",
    taluka: "",
    district: "",
    state: "",
    pincode: "",
    notes: "",
  });

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      await fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});
      const [res, vRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch("/api/villages"),
      ]);
      const data = await res.json();
      const vData = await vRes.json().catch(() => ({ villages: [] }));
      if (vData.villages) {
        setVillages(vData.villages);
      }
      if (data.success && data.customer) {
        const c: CustomerDetail = data.customer;
        setCustomer(c);
        setEditForm({
          villageId: c.villageId,
          name: c.name,
          mobile: c.mobile,
          altMobile: c.altMobile || "",
          email: c.email || "",
          address: c.address || "",
          creditLimit: String(c.creditLimit ?? 5000),
          notes: c.notes || "",
        });
        if (c.village) {
          setEditVillageForm({
            name: c.village.name,
            code: c.village.code,
            taluka: c.village.taluka || "",
            district: c.village.district || "",
            state: c.village.state || "Telangana",
            pincode: c.village.pincode || "",
            notes: c.village.notes || "",
          });
        }
      }
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleToggleBlacklist = async () => {
    if (!customer || actionLoading) return;
    const willBlacklist = customer.isActive !== false;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: willBlacklist ? "BLACKLIST" : "ACTIVATE",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayFeedback({
          type: "success",
          message:
            data.message ||
            (willBlacklist
              ? "Customer account blacklisted & disabled."
              : "Customer account re-activated."),
        });
        fetchCustomer();
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to update account status." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!customer || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setIsDeleteModalOpen(false);
        setPayFeedback({
          type: "success",
          message: data.message || "Customer permanently deleted from database.",
        });
        setTimeout(() => router.push("/admin/customers"), 900);
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to delete customer." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: editForm.villageId,
          name: editForm.name.trim(),
          mobile: editForm.mobile.trim(),
          altMobile: editForm.altMobile.trim() || null,
          email: editForm.email.trim() || null,
          address: editForm.address.trim() || null,
          creditLimit: parseFloat(editForm.creditLimit) || 0,
          notes: editForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setPayFeedback({ type: "success", message: "Customer profile updated successfully!" });
        fetchCustomer();
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to update customer profile." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.village || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/villages/${customer.village.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editVillageForm.name.trim(),
          code: editVillageForm.code.trim().toUpperCase(),
          taluka: editVillageForm.taluka.trim() || null,
          district: editVillageForm.district.trim() || null,
          state: editVillageForm.state.trim() || null,
          pincode: editVillageForm.pincode.trim() || null,
          notes: editVillageForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditVillageModalOpen(false);
        setPayFeedback({ type: "success", message: "Village territory profile updated!" });
        fetchCustomer();
      } else {
        setPayFeedback({ type: "error", message: data.error || "Failed to update village profile." });
      }
    } catch (err: any) {
      setPayFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setActionLoading(false);
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
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 mb-4">
          The requested customer account does not exist or has been permanently deleted.
        </p>
        <Link href="/admin/customers">
          <Button variant="primary" size="md">
            Back to Customers Directory
          </Button>
        </Link>
      </Card>
    );
  }

  const isBlacklisted = customer.isActive === false;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/customers"
            className="p-2 bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CustomerAvatar name={customer.name} size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{customer.name}</h1>
              <Badge variant="neutral">{customer.customerCode}</Badge>
              {isBlacklisted ? (
                <Badge variant="error">BLACKLISTED / DISABLED</Badge>
              ) : (
                <Badge variant="success">ACTIVE ACCOUNT</Badge>
              )}
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
                <span>
                  Village: <strong>{customer.village.name}</strong> ({customer.village.code})
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditVillageModalOpen(true)}
                  className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-purple-600 hover:text-purple-800 underline"
                >
                  <Edit3 className="w-3 h-3" /> Edit Village
                </button>
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
          <Button
            variant="outline"
            size="sm"
            icon={Edit3}
            onClick={() => setIsEditModalOpen(true)}
            title="Edit Customer Profile Details"
          >
            Edit Profile
          </Button>

          {customer.email && !isBlacklisted && (
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

          {!isBlacklisted && (
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
          )}

          <Button
            variant="outline"
            size="sm"
            icon={isBlacklisted ? ShieldCheck : Ban}
            onClick={handleToggleBlacklist}
            disabled={actionLoading}
            loading={actionLoading}
            className={
              isBlacklisted
                ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                : "border-amber-300 text-amber-800 bg-amber-50"
            }
            title={
              isBlacklisted
                ? "Re-Activate Customer Account"
                : "Blacklist / Disable Customer Account (revokes login & hides from active ledgers)"
            }
          >
            {isBlacklisted ? "Activate Account" : "Blacklist / Disable"}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            icon={Trash2}
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={actionLoading}
            title="Permanently Delete Customer & All Records from Database"
          >
            Delete Account
          </Button>

          {!isBlacklisted && (
            <Link href={`/admin/billing?customerId=${customer.id}&villageId=${customer.villageId}`}>
              <Button variant="primary" size="sm" icon={Plus}>
                New Bill
              </Button>
            </Link>
          )}
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
                <Card key={o.id} className="p-4 space-y-3">
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
                        <Badge variant="neutral">{p.method}</Badge>
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

      {/* Edit Customer Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer Profile (${customer.customerCode})`}
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Village Territory *</label>
            <select
              value={editForm.villageId}
              onChange={(e) => setEditForm({ ...editForm, villageId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              required
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile *</label>
              <input
                type="tel"
                value={editForm.mobile}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alternate Mobile</label>
              <input
                type="tel"
                value={editForm.altMobile}
                onChange={(e) => setEditForm({ ...editForm, altMobile: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={editForm.creditLimit}
                onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="md" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={actionLoading} disabled={actionLoading}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Village Profile Modal */}
      <Modal
        isOpen={isEditVillageModalOpen}
        onClose={() => setIsEditVillageModalOpen(false)}
        title={`Edit Village Territory (${customer.village.code})`}
      >
        <form onSubmit={handleUpdateVillage} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Village Name *</label>
              <input
                type="text"
                value={editVillageForm.name}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code *</label>
              <input
                type="text"
                maxLength={5}
                value={editVillageForm.code}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono uppercase text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mandal / Taluka</label>
              <input
                type="text"
                value={editVillageForm.taluka}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, taluka: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={editVillageForm.district}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, district: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={editVillageForm.state}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, state: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={editVillageForm.pincode}
                onChange={(e) => setEditVillageForm({ ...editVillageForm, pincode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="md" onClick={() => setIsEditVillageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={actionLoading} disabled={actionLoading}>
              Save Village Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Permanently Delete Customer Account"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Are you sure you want to permanently delete{" "}
            <strong className="text-slate-900">{customer.name}</strong> ({customer.customerCode})?
          </p>
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="font-bold">Irreversible Database Deletion</div>
            <p>
              This action permanently deletes the customer, their login credentials, all counter bills, payment receipts, and ledger entries from PostgreSQL. To temporarily disable access or hide from active ledgers, use <strong>Blacklist / Disable</strong> instead.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="md" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handlePermanentDelete}
              loading={actionLoading}
              disabled={actionLoading}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
