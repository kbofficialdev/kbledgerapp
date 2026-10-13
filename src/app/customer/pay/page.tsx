"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { BrandCashfreeIcon } from "@/components/brand/BrandIcons";
import CashfreeCheckoutModal from "@/components/payments/CashfreeCheckoutModal";

interface CustomerDebtProfile {
  id: string;
  name: string;
  customerCode: string;
  mobile: string;
  currentBalance: number;
  creditLimit: number;
  villageName?: string;
  unpaidOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    totalAmount: number;
    creditAmount: number;
  }>;
}

function CustomerPayContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<CustomerDebtProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Dedicated Step Tabs:
  // "SELECT_AMOUNT" -> Tab 1: Choose Full / Specific Slips / Custom Amount
  // "CASHFREE_OPTIONS" -> Tab 2: Dedicated Cashfree Custom Elements Payment Options Tab
  const [activeFlowTab, setActiveFlowTab] = useState<
    "SELECT_AMOUNT" | "CASHFREE_OPTIONS"
  >("SELECT_AMOUNT");

  // Settlement Mode: "FULL" | "CUSTOM" | "ORDER_SELECT"
  const [payMode, setPayMode] = useState<"FULL" | "CUSTOM" | "ORDER_SELECT">("FULL");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Cashfree Session State
  const [initiating, setInitiating] = useState(false);
  const [cashfreeSessionId, setCashfreeSessionId] = useState<string | null>(null);
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);
  const [cashfreeEnv, setCashfreeEnv] = useState<"sandbox" | "production">("sandbox");

  // Success Confirmation State
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    orderId: string;
    paymentId?: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        await fetch("/api/payments/cashfree/webhook?reconcilePending=true").catch(() => {});
        const res = await fetch("/api/customer/me");
        if (res.status === 401) {
          toast.authError("Please log in to settle your Khata debt.", "Sign In Required");
          router.replace("/customer/login");
          return;
        }

        const data = await res.json();
        if (data.success && data.customer) {
          const unpaid = (data.orders || []).filter(
            (o: any) => o.creditAmount > 0 || o.paymentType === "CREDIT"
          );

          setProfile({
            id: data.customer.id,
            name: data.customer.name,
            customerCode: data.customer.customerCode,
            mobile: data.customer.mobile,
            currentBalance: Number(data.customer.currentBalance || 0),
            creditLimit: Number(data.customer.creditLimit || 0),
            villageName: data.customer.villageName,
            unpaidOrders: unpaid,
          });

          setCustomAmount(String(Math.max(100, Math.floor(data.customer.currentBalance / 2))));
          setSelectedOrderIds(unpaid.map((o: any) => o.id));

          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const returnedCfOrder = params.get("cf_order_id") || params.get("order_id");
            if (returnedCfOrder) {
              setCashfreeOrderId(returnedCfOrder);
              setActiveFlowTab("CASHFREE_OPTIONS");
            }
          }
        } else {
          toast.authError(data.error || "Could not retrieve account details.", "Error");
        }
      } catch {
        toast.authError("Failed to connect to customer server.", "Network Issue");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Accessing your secure debt ledger...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Calculate chosen amount to pay
  let payableAmount = profile.currentBalance;
  if (payMode === "FULL") {
    payableAmount = profile.currentBalance;
  } else if (payMode === "CUSTOM") {
    payableAmount = Math.max(1, parseFloat(customAmount) || 0);
  } else if (payMode === "ORDER_SELECT") {
    payableAmount = profile.unpaidOrders
      .filter((o) => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + (o.creditAmount || o.totalAmount), 0);
  }

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oId) => oId !== id) : [...prev, id]
    );
    setCashfreeSessionId(null);
    setCashfreeOrderId(null);
  };

  const createCashfreeSession = async (): Promise<{
    paymentSessionId: string;
    orderId: string;
  } | null> => {
    if (cashfreeSessionId && cashfreeOrderId) {
      return { paymentSessionId: cashfreeSessionId, orderId: cashfreeOrderId };
    }
    if (payableAmount <= 0) {
      toast.authError("Amount must be greater than ₹0 to initiate checkout.", "Invalid Amount");
      return null;
    }

    try {
      setInitiating(true);

      const targetOrderIds =
        payMode === "ORDER_SELECT"
          ? selectedOrderIds
          : profile.unpaidOrders.map((o) => o.id);

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderAmount: payableAmount,
          orderCurrency: "INR",
          orderIds: targetOrderIds,
          customerDetails: {
            customerId: profile.id,
            customerName: profile.name,
            customerPhone: profile.mobile,
          },
          orderMeta: {
            orderType: "KHATA_SETTLEMENT",
            orderIds: targetOrderIds,
            notes: `Self-serve Udhaar payment by ${profile.name} (${profile.customerCode})`,
          },
        }),
      });

      const data = await res.json();
      if (!data.success || !data.payment_session_id) {
        throw new Error(data.error || "Failed to establish Cashfree payment session");
      }

      if (data.environment === "production" || data.environment === "sandbox") {
        setCashfreeEnv(data.environment);
      }
      setCashfreeSessionId(data.payment_session_id);
      setCashfreeOrderId(data.order_id);
      return {
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id,
      };
    } catch (err: any) {
      toast.authError(err.message, "Gateway Error");
      return null;
    } finally {
      setInitiating(false);
    }
  };

  const handleOpenCashfreeTab = async () => {
    const created = await createCashfreeSession();
    if (created) {
      setActiveFlowTab("CASHFREE_OPTIONS");
    }
  };

  const handleCashfreeSuccess = async (cfOrderId: string, cfPaymentId?: string) => {
    toast.info("Verifying transaction with banking network...", "Processing");

    try {
      const targetOrderIds =
        payMode === "ORDER_SELECT"
          ? selectedOrderIds
          : profile.unpaidOrders.map((o) => o.id);

      const res = await fetch("/api/customer/khata/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: targetOrderIds,
          amount: payableAmount,
          cashfreeOrderId: cfOrderId,
          cashfreePaymentId: cfPaymentId,
          paymentSessionId: cashfreeSessionId,
          notes: `Self-serve Udhaar settlement via Cashfree Elements (${profile.customerCode})`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentSuccessData({
          orderId: cfOrderId,
          paymentId: cfPaymentId,
          amount: payableAmount,
        });
        toast.authSuccess(
          `Payment of ${formatCurrency(payableAmount)} approved via Cashfree!`,
          "Udhaar Cleared"
        );
      } else {
        toast.authError(data.error || "Verification incomplete", "Warning");
      }
    } catch (err: any) {
      toast.authError(err.message, "Reconciliation Error");
    }
  };

  return (
    <div className="space-y-6 pb-16 bg-white max-w-4xl mx-auto">
      {/* 1. TOP NAVIGATION & DEDICATED PAYMENT FLOW TABS */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/customer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Khata</span>
          </Link>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <button
            type="button"
            onClick={() => setActiveFlowTab("SELECT_AMOUNT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFlowTab === "SELECT_AMOUNT"
                ? "bg-black text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>1. Select Bills &amp; Amount</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <button
            type="button"
            onClick={handleOpenCashfreeTab}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFlowTab === "CASHFREE_OPTIONS"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:border-amber-400"
            }`}
          >
            <span>2. Cashfree Payment Options Tab</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Cashfree PCI-DSS Secure</span>
        </div>
      </div>

      {/* 2. SUCCESS RECEIPT CARD (IF JUST PAID) */}
      {paymentSuccessData ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Payment Confirmed
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              {formatCurrency(paymentSuccessData.amount)} Paid Successfully!
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Your village Bahi-Khata ledger balance has been immediately credited.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-white border border-emerald-200 text-xs font-mono text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Cashfree Order:</span>
              <span className="font-bold text-slate-900">{paymentSuccessData.orderId}</span>
            </div>
            {paymentSuccessData.paymentId && (
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Ref ID:</span>
                <span className="font-bold text-slate-900">{paymentSuccessData.paymentId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Timestamp:</span>
              <span>{formatDateTime(new Date())}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/customer"
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs transition-all shadow-sm"
            >
              View Updated Ledger
            </Link>
          </div>
        </div>
      ) : activeFlowTab === "CASHFREE_OPTIONS" ? (
        /* DEDICATED TAB 2: CASHFREE CUSTOM ELEMENTS PAYMENT OPTIONS TAB */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Cashfree Payment Options Tab
              </h2>
              <p className="text-xs text-slate-500">
                Complete {formatCurrency(payableAmount)} online using customized Cashfree Elements below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveFlowTab("SELECT_AMOUNT")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Amount Selection</span>
            </button>
          </div>

          <CashfreeCheckoutModal
            isOpen={true}
            onBackToSelection={() => setActiveFlowTab("SELECT_AMOUNT")}
            paymentSessionId={cashfreeSessionId || ""}
            orderId={cashfreeOrderId || ""}
            environment={cashfreeEnv}
            amount={payableAmount}
            customerName={profile.name}
            customerMobile={profile.mobile}
            onCreateSession={createCashfreeSession}
            onSuccess={(ordId, payId) => handleCashfreeSuccess(ordId, payId)}
            onFailure={(err) => {
              toast.authError(String(err), "Payment Cancelled");
            }}
          />
        </div>
      ) : (
        /* TAB 1: SELECT BILLS & AMOUNT */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7 space-y-5">
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Clear Outstanding Udhaar
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your settlement amount and open the dedicated Cashfree Payment Options tab.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  Total Udhaar Balance Owed
                </span>
                <span className="text-2xl font-black text-rose-700 font-mono mt-0.5 block">
                  {formatCurrency(profile.currentBalance)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 font-mono">
                {profile.unpaidOrders.length} Unpaid Slips
              </span>
            </div>

            <div className="space-y-3">
              {/* Option A: Full Settlement */}
              <div
                onClick={() => {
                  setPayMode("FULL");
                  setCashfreeSessionId(null);
                  setCashfreeOrderId(null);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  payMode === "FULL"
                    ? "border-black bg-slate-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Clear Entire Balance (100% Full Payment)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pay all outstanding debt to reset your Khata to zero.
                    </p>
                  </div>
                  <span className="text-base font-black font-mono text-emerald-700">
                    {formatCurrency(profile.currentBalance)}
                  </span>
                </div>
              </div>

              {/* Option B: Specific Orders Checklist */}
              {profile.unpaidOrders.length > 0 && (
                <div
                  onClick={() => {
                    setPayMode("ORDER_SELECT");
                    setCashfreeSessionId(null);
                    setCashfreeOrderId(null);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    payMode === "ORDER_SELECT"
                      ? "border-black bg-slate-50/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Pay for Specific Bills / Slips
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Select which orders you wish to clear right now.
                      </p>
                    </div>
                  </div>

                  {payMode === "ORDER_SELECT" && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                      {profile.unpaidOrders.map((ord) => (
                        <label
                          key={ord.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.includes(ord.id)}
                              onChange={() => toggleOrderSelection(ord.id)}
                              className="rounded text-black focus:ring-black"
                            />
                            <div>
                              <span className="font-bold text-slate-900 font-mono">
                                #{ord.orderNumber}
                              </span>
                              <span className="text-slate-400 ml-1.5 font-mono">
                                ({formatDateTime(ord.orderDate)})
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-rose-600">
                            {formatCurrency(ord.creditAmount || ord.totalAmount)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Option C: Custom Amount */}
              <div
                onClick={() => {
                  setPayMode("CUSTOM");
                  setCashfreeSessionId(null);
                  setCashfreeOrderId(null);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  payMode === "CUSTOM"
                    ? "border-black bg-slate-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Custom Partial Amount</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pay any flexible installment toward your outstanding debt.
                    </p>
                  </div>
                </div>

                {payMode === "CUSTOM" && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Enter Amount to Pay (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={profile.currentBalance}
                      step="any"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setCashfreeSessionId(null);
                        setCashfreeOrderId(null);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SUMMARY & PROCEED TO DEDICATED CASHFREE TAB */}
          <div className="md:col-span-5 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Settlement Summary</h3>
                  <p className="text-xs text-slate-500">Cashfree Payment Gateway</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <BrandCashfreeIcon className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Account Holder:</span>
                  <span className="font-bold text-slate-900">{profile.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Khata Code:</span>
                  <span className="font-mono text-slate-900">{profile.customerCode}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Balance:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(profile.currentBalance)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-emerald-700 font-bold text-sm">
                  <span>Paying Online Now:</span>
                  <span className="font-mono">{formatCurrency(payableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-semibold">
                  <span>Balance After Payment:</span>
                  <span className="font-mono">
                    {formatCurrency(Math.max(0, profile.currentBalance - payableAmount))}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCashfreeTab}
                disabled={initiating || payableAmount <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <BrandCashfreeIcon className="w-4 h-4" />
                <span>
                  {initiating
                    ? "Initializing Cashfree Gateway..."
                    : `Open Cashfree Payment Options Tab (${formatCurrency(payableAmount)})`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerPayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CustomerPayContent />
    </Suspense>
  );
}
