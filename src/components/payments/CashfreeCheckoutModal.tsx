"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  Smartphone,
  QrCode,
  CreditCard,
  Lock,
  RefreshCw,
} from "lucide-react";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

interface CashfreeCheckoutModalProps {
  isOpen?: boolean;
  onClose: () => void;
  orderId: string;
  paymentSessionId: string;
  amount: number;
  customerName?: string;
  customerMobile?: string;
  onSuccess?: (orderId: string, paymentId?: string) => void;
  onFailure?: (error: any) => void;
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentFailure?: (error: any) => void;
}

type ElementTab = "UPI_COLLECT" | "UPI_QR" | "CARD";

/**
 * Build Cashfree.js Custom Element configuration object
 * Strictly follows https://www.cashfree.com/docs/payments/online/element/customize
 * Supports: classes, style (base, complete, empty, invalid + pseudo-classes), fonts, values, disabled, loader
 */
export function buildCashfreeElementOptions(
  values: Record<string, any> = {},
  disabled = false
) {
  return {
    classes: {
      base: "cf-kb-element-base",
      complete: "cf-kb-element-complete",
      empty: "cf-kb-element-empty",
      focus: "cf-kb-element-focus",
      invalid: "cf-kb-element-invalid",
      disabled: "cf-kb-element-disabled",
    },
    fonts: [
      {
        cssSrc:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    style: {
      base: {
        color: "#0f172a",
        fontSize: "15px",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        backgroundColor: "#ffffff",
        padding: "10px 12px",
        "::placeholder": {
          color: "#94a3b8",
        },
        ":hover": {
          backgroundColor: "#f8fafc",
        },
        ":focus": {
          outline: "none",
          borderColor: "#0f172a",
        },
        ":disabled": {
          backgroundColor: "#f1f5f9",
          color: "#94a3b8",
        },
      },
      complete: {
        color: "#047857",
      },
      empty: {},
      invalid: {
        color: "#dc2626",
      },
    },
    values,
    disabled,
    loader: true,
  };
}

export default function CashfreeCheckoutModal({
  isOpen = true,
  onClose,
  orderId,
  paymentSessionId,
  amount,
  customerName,
  onSuccess,
  onFailure,
  onPaymentSuccess,
  onPaymentFailure,
}: CashfreeCheckoutModalProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ElementTab>("UPI_COLLECT");
  const [elementError, setElementError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementComplete, setElementComplete] = useState(false);
  const [detectedCardBrand, setDetectedCardBrand] = useState<string | null>(null);
  const [processingPay, setProcessingPay] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [vpaPreset, setVpaPreset] = useState("testsuccess@gocash");

  const cashfreeInstanceRef = useRef<any>(null);
  const activeComponentsRef = useRef<any[]>([]);
  const payableComponentRef = useRef<any>(null);
  const saveCardComponentRef = useRef<any>(null);
  const completedRef = useRef(false);

  // 1. Load Cashfree.js v3 script from official CDN for Element mounting
  useEffect(() => {
    if (!isOpen) return;

    if (window.Cashfree) {
      cashfreeInstanceRef.current = window.Cashfree({ mode: "sandbox" });
      setSdkLoaded(true);
      return;
    }

    const scriptId = "cashfree-elements-v3";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.Cashfree) {
        cashfreeInstanceRef.current = window.Cashfree({ mode: "sandbox" });
        setSdkLoaded(true);
      } else {
        existing.addEventListener("load", () => {
          if (window.Cashfree) {
            cashfreeInstanceRef.current = window.Cashfree({ mode: "sandbox" });
            setSdkLoaded(true);
          }
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        cashfreeInstanceRef.current = window.Cashfree({ mode: "sandbox" });
        setSdkLoaded(true);
      }
    };
    script.onerror = () => {
      setElementError("Unable to load payment elements. Check your network connection.");
    };
    document.body.appendChild(script);
  }, [isOpen]);

  // 2. Webhook-Backed Verification & Reconciliation
  const checkWebhookAndOrderStatus = useCallback(
    async (silent = false) => {
      if (!orderId || completedRef.current) return false;
      if (!silent) setVerifying(true);

      try {
        const res = await fetch(
          `/api/payments/cashfree/webhook?orderId=${encodeURIComponent(orderId)}`
        );
        const data = await res.json();

        if (data.verified || data.orderStatus === "PAID") {
          completedRef.current = true;
          setVerifiedSuccess(true);
          if (onPaymentSuccess) onPaymentSuccess(data);
          if (onSuccess) onSuccess(orderId, data.paymentId || data.payment?.cashfreePaymentId);
          return true;
        }

        if (!silent) {
          // Also check /api/payments/cashfree/verify as secondary confirmation
          const vRes = await fetch("/api/payments/cashfree/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          const vData = await vRes.json();
          if (vData.verified) {
            completedRef.current = true;
            setVerifiedSuccess(true);
            if (onPaymentSuccess) onPaymentSuccess(vData);
            if (onSuccess) onSuccess(orderId, vData.payment?.cashfreePaymentId);
            return true;
          } else {
            setElementError(
              "Payment is still awaiting confirmation from your bank/UPI app. Once approved, the webhook will settle your Khata automatically."
            );
          }
        }
      } catch (err: any) {
        if (!silent && onPaymentFailure) onPaymentFailure(err);
      } finally {
        if (!silent) setVerifying(false);
      }
      return false;
    },
    [orderId, onPaymentSuccess, onSuccess, onPaymentFailure]
  );

  // 3. Continuous Webhook Polling + Visibility / Reconnect Listener + Midway-Drop Beacon
  useEffect(() => {
    if (!isOpen || !orderId || verifiedSuccess) return;

    const pollInterval = setInterval(() => {
      checkWebhookAndOrderStatus(true);
    }, 3500);

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === "visible") {
        checkWebhookAndOrderStatus(true);
      }
    };

    const handleBeforeUnload = () => {
      if (!completedRef.current && orderId && navigator.sendBeacon) {
        const payload = JSON.stringify({
          type: "CLIENT_MIDWAY_SYNC",
          order_id: orderId,
        });
        navigator.sendBeacon("/api/payments/cashfree/webhook", payload);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrOnline);
    window.addEventListener("online", handleVisibilityOrOnline);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityOrOnline);
      window.removeEventListener("online", handleVisibilityOrOnline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen, orderId, verifiedSuccess, checkWebhookAndOrderStatus]);

  // 4. Clean up mounted Cashfree Elements helper
  const destroyMountedElements = useCallback(() => {
    for (const comp of activeComponentsRef.current) {
      try {
        if (comp && typeof comp.unmount === "function") comp.unmount();
        if (comp && typeof comp.destroy === "function") comp.destroy();
      } catch {
        // ignore unmount errors on unmounted nodes
      }
    }
    activeComponentsRef.current = [];
    payableComponentRef.current = null;
    saveCardComponentRef.current = null;
  }, []);

  // 5. Mount Customized Cashfree.js Elements per activeTab
  useEffect(() => {
    if (!isOpen || !sdkLoaded || !paymentSessionId || verifiedSuccess) return;
    const cf = cashfreeInstanceRef.current;
    if (!cf || typeof cf.create !== "function") return;

    destroyMountedElements();
    setElementError(null);
    setElementReady(false);
    setElementComplete(false);
    setDetectedCardBrand(null);

    const timer = setTimeout(() => {
      try {
        if (activeTab === "UPI_COLLECT") {
          const container = document.getElementById("cf-element-upi-collect");
          if (!container) return;

          const upiCollectOptions = buildCashfreeElementOptions(
            {
              placeholder: "Enter UPI ID (e.g. name@okaxis)",
              upiId: vpaPreset,
            },
            false
          );

          const upiCollect = cf.create("upiCollect", upiCollectOptions);
          activeComponentsRef.current.push(upiCollect);
          payableComponentRef.current = upiCollect;

          upiCollect.on("ready", () => {
            setElementReady(true);
            if (vpaPreset) setElementComplete(true);
          });
          upiCollect.on("change", (data: any) => {
            setElementError(null);
            setElementComplete(Boolean(data?.complete));
          });
          upiCollect.on("complete", () => {
            setElementError(null);
            setElementComplete(true);
          });
          upiCollect.on("invalid", (data: any) => {
            setElementComplete(false);
            if (data?.error?.message) {
              setElementError(data.error.message);
            }
          });
          upiCollect.on("loaderror", (data: any) => {
            setElementError(data?.error?.message || "Could not mount UPI Collect element.");
          });

          upiCollect.mount("#cf-element-upi-collect");
        } else if (activeTab === "UPI_QR") {
          const container = document.getElementById("cf-element-upi-qr");
          if (!container) return;

          const upiQrOptions = buildCashfreeElementOptions(
            {
              size: "200px",
            },
            false
          );

          const upiQr = cf.create("upiQr", upiQrOptions);
          activeComponentsRef.current.push(upiQr);
          payableComponentRef.current = upiQr;

          upiQr.on("ready", () => {
            setElementReady(true);
            setElementComplete(true);
          });
          upiQr.on("loaderror", (data: any) => {
            setElementError(data?.error?.message || "Could not mount UPI QR element.");
          });

          upiQr.mount("#cf-element-upi-qr");
        } else if (activeTab === "CARD") {
          const numContainer = document.getElementById("cf-element-card-number");
          const holderContainer = document.getElementById("cf-element-card-holder");
          const expContainer = document.getElementById("cf-element-card-expiry");
          const cvvContainer = document.getElementById("cf-element-card-cvv");
          const saveContainer = document.getElementById("cf-element-save-card");
          if (!numContainer || !holderContainer || !expContainer || !cvvContainer) return;

          const cardNumber = cf.create(
            "cardNumber",
            buildCashfreeElementOptions({
              placeholder: "4111 •••• •••• ••••",
              hideBrandIcon: false,
            })
          );
          const cardHolder = cf.create(
            "cardHolder",
            buildCashfreeElementOptions({
              cardHolder: customerName || "KB Customer",
            })
          );
          const cardExpiry = cf.create("cardExpiry", buildCashfreeElementOptions({}));
          const cardCvv = cf.create("cardCvv", buildCashfreeElementOptions({}));

          activeComponentsRef.current.push(cardNumber, cardHolder, cardExpiry, cardCvv);
          payableComponentRef.current = cardNumber;

          if (saveContainer) {
            const saveCard = cf.create(
              "savePaymentInstrument",
              buildCashfreeElementOptions({
                label: "Save card securely for future Khata payments",
              })
            );
            activeComponentsRef.current.push(saveCard);
            saveCardComponentRef.current = saveCard;
            saveCard.mount("#cf-element-save-card");
          }

          const syncCardCompletion = () => {
            try {
              const c1 = cardNumber.data?.()?.complete;
              const c2 = cardHolder.data?.()?.complete;
              const c3 = cardExpiry.data?.()?.complete;
              const c4 = cardCvv.data?.()?.complete;
              const brand = cardNumber.data?.()?.value?.brand;
              if (brand) setDetectedCardBrand(String(brand).toUpperCase());
              setElementComplete(Boolean(c1 && c2 && c3 && c4));
            } catch {
              // ignore before ready
            }
          };

          cardNumber.on("ready", () => setElementReady(true));
          [cardNumber, cardHolder, cardExpiry, cardCvv].forEach((comp) => {
            comp.on("change", syncCardCompletion);
            comp.on("complete", syncCardCompletion);
            comp.on("invalid", (d: any) => {
              syncCardCompletion();
              if (d?.error?.message) setElementError(d.error.message);
            });
          });

          cardNumber.mount("#cf-element-card-number");
          cardHolder.mount("#cf-element-card-holder");
          cardExpiry.mount("#cf-element-card-expiry");
          cardCvv.mount("#cf-element-card-cvv");
        }
      } catch (err: any) {
        setElementError(err?.message || "Failed to initialize Cashfree Element.");
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      destroyMountedElements();
    };
  }, [
    isOpen,
    sdkLoaded,
    paymentSessionId,
    activeTab,
    vpaPreset,
    customerName,
    verifiedSuccess,
    destroyMountedElements,
  ]);

  // 6. Execute Payment via cashfree.pay({ paymentMethod, paymentSessionId, redirect: "if_required" })
  const handlePayWithElement = async () => {
    const cf = cashfreeInstanceRef.current;
    const comp = payableComponentRef.current;
    if (!cf || !comp || !paymentSessionId) {
      setElementError("Payment element is still initializing. Please wait a moment.");
      return;
    }

    setProcessingPay(true);
    setElementError(null);

    try {
      // Disable active input components during submission per Customize docs
      for (const c of activeComponentsRef.current) {
        try {
          if (typeof c.disable === "function") c.disable();
        } catch {
          // ignore if component kind does not support disable()
        }
      }

      const payOptions: Record<string, any> = {
        paymentMethod: comp,
        paymentSessionId,
        redirect: "if_required",
      };

      if (activeTab === "CARD" && saveCardComponentRef.current) {
        payOptions.savePaymentInstrument = saveCardComponentRef.current;
      }

      const result = await cf.pay(payOptions);

      // Re-enable components after response
      for (const c of activeComponentsRef.current) {
        try {
          if (typeof c.enable === "function") c.enable();
        } catch {
          // ignore
        }
      }

      if (result?.error) {
        setElementError(
          result.error.message || "Payment authorization was declined or interrupted."
        );
        if (onFailure) onFailure(result.error.message);
      } else if (result?.paymentDetails || result?.redirect === false) {
        await checkWebhookAndOrderStatus(false);
      }
    } catch (err: any) {
      setElementError(err?.message || "Payment execution interrupted.");
    } finally {
      setProcessingPay(false);
    }
  };

  // 7. Safe Midway Close Handler — Triggers background webhook sync so no paid order is ever lost
  const handleSafeClose = () => {
    destroyMountedElements();
    if (!completedRef.current && orderId) {
      fetch("/api/payments/cashfree/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          type: "CLIENT_MIDWAY_SYNC",
          order_id: orderId,
        }),
      }).catch(() => {});
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Brand Gateway Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-slate-950 flex items-center justify-center font-black text-xs tracking-tight">
              KB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">KB Fashions &amp; Khata Checkout</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                  Cashfree Elements
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Order: {orderId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Summary Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Customer Account
            </span>
            <span className="font-semibold text-slate-900">{customerName || "KB Store Customer"}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Payable Amount
            </span>
            <span className="text-base font-black text-emerald-700 font-mono">
              ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {verifiedSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Payment Settled via Webhook &amp; ACID Ledger!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} has been verified and credited to the customer&apos;s Bahi-Khata ledger.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Continue to Receipt
              </button>
            </div>
          ) : (
            <>
              {/* Payment Method Selector Tabs (Custom Elements) */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("UPI_COLLECT")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "UPI_COLLECT"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("UPI_QR")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "UPI_QR"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("CARD")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "CARD"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>

              {/* Custom Element Mounting Area */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                {activeTab === "UPI_COLLECT" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Enter UPI ID / VPA (Cashfree Custom Element)
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Instant UPI Collect
                      </span>
                    </div>

                    {/* Mounted Cashfree upiCollect Element */}
                    <div id="cf-element-upi-collect" className="w-full" />

                    {/* Quick Sandbox Test VPAs */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Test VPAs:</span>
                      {["testsuccess@gocash", "success@upi"].map((vpa) => (
                        <button
                          key={vpa}
                          type="button"
                          onClick={() => setVpaPreset(vpa)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            vpaPreset === vpa
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {vpa}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "UPI_QR" && (
                  <div className="space-y-3 text-center">
                    <p className="text-xs font-semibold text-slate-800">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM
                    </p>
                    <div className="mx-auto w-[220px] min-h-[210px] rounded-xl border border-slate-200 bg-white flex items-center justify-center p-2 shadow-sm">
                      <div id="cf-element-upi-qr" className="w-full flex items-center justify-center" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Click &ldquo;Generate &amp; Scan UPI QR&rdquo; below to render your dynamic QR code.
                    </p>
                  </div>
                )}

                {activeTab === "CARD" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Card Number</label>
                      {detectedCardBrand && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold">
                          {detectedCardBrand}
                        </span>
                      )}
                    </div>
                    <div id="cf-element-card-number" className="w-full" />

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Card Holder Name
                      </label>
                      <div id="cf-element-card-holder" className="w-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          Expiry (MM/YY)
                        </label>
                        <div id="cf-element-card-expiry" className="w-full" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          CVV / CVC
                        </label>
                        <div id="cf-element-card-cvv" className="w-full" />
                      </div>
                    </div>

                    <div id="cf-element-save-card" className="w-full pt-1" />
                  </div>
                )}
              </div>

              {elementError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{elementError}</span>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handlePayWithElement}
                  disabled={!sdkLoaded || processingPay || verifying}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {processingPay
                      ? "Processing Payment..."
                      : activeTab === "UPI_QR"
                        ? `Generate & Scan UPI QR (₹${amount.toFixed(2)})`
                        : `Pay ₹${amount.toFixed(2)} Securely`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => checkWebhookAndOrderStatus(false)}
                  disabled={verifying}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {verifying
                      ? "Checking Webhook & Bank Status..."
                      : "Sync Webhook Status (I Have Paid)"}
                  </span>
                </button>
              </div>

              {/* Webhook Protection Guarantee Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PCI-DSS Cashfree Custom Elements</span>
                </span>
                <span className="font-medium text-emerald-700">
                  Auto-Webhook Protected (Safe if closed midway)
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
