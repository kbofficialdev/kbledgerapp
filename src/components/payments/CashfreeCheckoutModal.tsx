"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  QrCode,
  CreditCard,
  Lock,
  RefreshCw,
  Landmark,
  Wallet,
  ChevronRight,
  ArrowLeft,
  AtSign,
} from "lucide-react";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export interface CashfreeInlineElementsProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBackToSelection?: () => void;
  orderId?: string;
  paymentSessionId?: string;
  amount: number;
  customerName?: string;
  customerMobile?: string;
  environment?: "sandbox" | "production";
  onCreateSession?: () => Promise<{ paymentSessionId: string; orderId: string } | null>;
  onSuccess?: (orderId: string, paymentId?: string, verifiedOrder?: any) => void;
  onFailure?: (error: any) => void;
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentFailure?: (error: any) => void;
}

type PaymentMethodTab =
  | "UPI_ID"
  | "UPI_QR"
  | "UPI_APP"
  | "CARD"
  | "NETBANKING"
  | "WALLET";

const UPI_APPS = [
  { id: "gpay", label: "Google Pay", sub: "Instant UPI Intent" },
  { id: "phonepe", label: "PhonePe", sub: "PhonePe UPI App" },
  { id: "paytm", label: "Paytm UPI", sub: "Paytm UPI Transfer" },
  { id: "bhim", label: "BHIM UPI", sub: "NPCI BHIM App" },
] as const;

const NETBANKING_BANKS = [
  { code: "HDFCR", name: "HDFC Bank", tag: "Popular" },
  { code: "SBINR", name: "State Bank of India (SBI)", tag: "Popular" },
  { code: "ICICR", name: "ICICI Bank", tag: "Popular" },
  { code: "UTIBR", name: "Axis Bank", tag: "Popular" },
  { code: "KKBKR", name: "Kotak Mahindra Bank", tag: "NetBanking" },
  { code: "PUNBR", name: "Punjab National Bank", tag: "NetBanking" },
  { code: "TESTR", name: "Cashfree Test Bank", tag: "Sandbox" },
] as const;

const WALLET_PROVIDERS = [
  { id: "phonepe", name: "PhonePe Wallet" },
  { id: "paytm", name: "Paytm Wallet" },
  { id: "amazon", name: "Amazon Pay Balance" },
  { id: "freecharge", name: "Freecharge Wallet" },
  { id: "airtel", name: "Airtel Money" },
] as const;

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
        fontSize: "14px",
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
  onBackToSelection,
  orderId: propOrderId = "",
  paymentSessionId: propSessionId = "",
  amount,
  customerName = "",
  customerMobile = "",
  environment = "sandbox",
  onCreateSession,
  onSuccess,
  onFailure,
  onPaymentSuccess,
  onPaymentFailure,
}: CashfreeInlineElementsProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentMethodTab>("UPI_ID");
  const [activeSessionId, setActiveSessionId] = useState<string>(propSessionId);
  const [activeOrderId, setActiveOrderId] = useState<string>(propOrderId);
  const [creatingSession, setCreatingSession] = useState(false);

  const [elementError, setElementError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementComplete, setElementComplete] = useState(false);
  const [detectedCardBrand, setDetectedCardBrand] = useState<string | null>(null);
  const [processingPay, setProcessingPay] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [mountRetryCount, setMountRetryCount] = useState(0);

  // Method-specific selection state (single active custom element per tab)
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("gpay");
  const [selectedBankCode, setSelectedBankCode] = useState<string>("HDFCR");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("phonepe");

  const cashfreeInstanceRef = useRef<any>(null);
  const activeComponentsRef = useRef<any[]>([]);
  const payableComponentRef = useRef<any>(null);
  const saveCardComponentRef = useRef<any>(null);
  const completedRef = useRef(false);
  const inFlightVerifyRef = useRef(false);

  // Stable refs for values/callbacks so state updates NEVER destroy mounted Cashfree iframes
  const amountRef = useRef(amount);
  const customerNameRef = useRef(customerName);
  const customerMobileRef = useRef(customerMobile);
  amountRef.current = amount;
  customerNameRef.current = customerName;
  customerMobileRef.current = customerMobile;

  useEffect(() => {
    if (propSessionId) setActiveSessionId(propSessionId);
    if (propOrderId) setActiveOrderId(propOrderId);
  }, [propSessionId, propOrderId]);

  // 1. Load Cashfree.js v3 script from official CDN for Element mounting
  useEffect(() => {
    if (!isOpen) return;

    const initSdk = () => {
      if (window.Cashfree) {
        if (!cashfreeInstanceRef.current) {
          cashfreeInstanceRef.current = window.Cashfree({ mode: environment });
        }
        setSdkLoaded(true);
        return true;
      }
      return false;
    };

    if (initSdk()) return;

    const scriptId = "cashfree-elements-v3";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = () => initSdk();
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      initSdk();
    };
    script.onerror = () => {
      setElementError("Unable to load Cashfree payment elements. Check your internet connection.");
    };
    document.body.appendChild(script);
  }, [isOpen, environment]);

  // Helper to ensure a valid Cashfree payment_session_id exists
  const ensureSession = useCallback(async (): Promise<{
    paymentSessionId: string;
    orderId: string;
  } | null> => {
    if (activeSessionId && activeOrderId) {
      return { paymentSessionId: activeSessionId, orderId: activeOrderId };
    }
    if (!onCreateSession) return null;
    try {
      setCreatingSession(true);
      setElementError(null);
      const created = await onCreateSession();
      if (created && created.paymentSessionId && created.orderId) {
        setActiveSessionId(created.paymentSessionId);
        setActiveOrderId(created.orderId);
        return created;
      }
      return null;
    } catch (err: any) {
      setElementError(err?.message || "Could not initialize payment session.");
      return null;
    } finally {
      setCreatingSession(false);
    }
  }, [activeSessionId, activeOrderId, onCreateSession]);

  // Auto-initialize session on open if not yet created so QR and elements have session ready
  const autoSessionTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      autoSessionTriggeredRef.current = false;
      return;
    }
    if (!activeSessionId && !activeOrderId && onCreateSession && !autoSessionTriggeredRef.current) {
      autoSessionTriggeredRef.current = true;
      ensureSession().catch(() => {});
    }
  }, [isOpen, activeSessionId, activeOrderId, onCreateSession, ensureSession]);

  // 2. Webhook-Backed Verification & Reconciliation (Strictly single-flight & idempotent)
  const checkWebhookAndOrderStatus = useCallback(
    async (silent = false, targetOrderId?: string) => {
      const ordId = targetOrderId || activeOrderId;
      if (!ordId || completedRef.current || inFlightVerifyRef.current) return false;

      inFlightVerifyRef.current = true;
      if (!silent) setVerifying(true);

      try {
        const res = await fetch(
          `/api/payments/cashfree/webhook?orderId=${encodeURIComponent(ordId)}`
        );
        const data = await res.json();

        if (data.verified || data.orderStatus === "PAID") {
          if (!completedRef.current) {
            completedRef.current = true;
            setVerifiedSuccess(true);
            if (onPaymentSuccess) onPaymentSuccess(data);
            if (onSuccess) {
              onSuccess(
                ordId,
                data.paymentId || data.payment?.cashfreePaymentId,
                data.order || null
              );
            }
          }
          return true;
        }

        if (!silent) {
          const vRes = await fetch("/api/payments/cashfree/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: ordId, order_id: ordId }),
          });
          const vData = await vRes.json();
          if (vData.verified) {
            if (!completedRef.current) {
              completedRef.current = true;
              setVerifiedSuccess(true);
              if (onPaymentSuccess) onPaymentSuccess(vData);
              if (onSuccess) {
                onSuccess(
                  ordId,
                  vData.payment?.cashfreePaymentId || vData.payment?.cf_payment_id,
                  vData.order || null
                );
              }
            }
            return true;
          } else {
            setElementError(
              "Payment is awaiting confirmation from your bank/UPI app. Once approved, the Cashfree webhook settles your Khata automatically."
            );
          }
        }
      } catch (err: any) {
        if (!silent && onPaymentFailure) onPaymentFailure(err);
      } finally {
        inFlightVerifyRef.current = false;
        if (!silent) setVerifying(false);
      }
      return false;
    },
    [activeOrderId, onPaymentSuccess, onSuccess, onPaymentFailure]
  );

  // Check URL returnUrl parameter (?cf_order_id=...) if redirected back from Cashfree bank page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnedOrderId = params.get("cf_order_id") || params.get("order_id");
    if (returnedOrderId && !completedRef.current) {
      setActiveOrderId(returnedOrderId);
      checkWebhookAndOrderStatus(false, returnedOrderId);
    }
  }, [checkWebhookAndOrderStatus]);

  // 3. Continuous Webhook Polling + Visibility / Reconnect Listener + Midway-Drop Beacon
  useEffect(() => {
    if (!isOpen || !activeOrderId || verifiedSuccess) return;

    const pollInterval = setInterval(() => {
      checkWebhookAndOrderStatus(true, activeOrderId);
    }, 3500);

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === "visible") {
        checkWebhookAndOrderStatus(true, activeOrderId);
      }
    };

    const handleBeforeUnload = () => {
      if (!completedRef.current && activeOrderId && navigator.sendBeacon) {
        const payload = JSON.stringify({
          type: "CLIENT_MIDWAY_SYNC",
          order_id: activeOrderId,
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
  }, [isOpen, activeOrderId, verifiedSuccess, checkWebhookAndOrderStatus]);

  // 4. Clean up mounted Cashfree Elements before tab switch
  const destroyMountedElements = useCallback(() => {
    for (const comp of activeComponentsRef.current) {
      try {
        if (comp && typeof comp.destroy === "function") {
          comp.destroy();
        } else if (comp && typeof comp.unmount === "function") {
          comp.unmount();
        }
      } catch {
        // Ignore cleanup errors on unmounted nodes
      }
    }
    activeComponentsRef.current = [];
    payableComponentRef.current = null;
    saveCardComponentRef.current = null;
    setElementReady(false);
    setElementComplete(false);
    setDetectedCardBrand(null);
  }, []);

  // Build returnUrl on current page so redirecting back from bank/Cashfree reconciles in-page
  const getReturnUrl = useCallback((ordId: string) => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("cf_order_id", ordId);
    return url.toString();
  }, []);

  // Execute cashfree.pay() for the active Cashfree Element component
  const executeComponentPayment = useCallback(
    async (targetComponent?: any) => {
      const compToPay = targetComponent || payableComponentRef.current;
      if (!cashfreeInstanceRef.current || !compToPay || processingPay) return;

      setProcessingPay(true);
      setElementError(null);

      try {
        const sessionInfo = await ensureSession();
        if (!sessionInfo) {
          setProcessingPay(false);
          return;
        }

        const payOptions: Record<string, any> = {
          paymentMethod: compToPay,
          paymentSessionId: sessionInfo.paymentSessionId,
          returnUrl: getReturnUrl(sessionInfo.orderId),
          redirect: "if_required",
          redirectTarget: "_self",
        };

        if (activeTab === "CARD" && saveCardComponentRef.current) {
          payOptions.savePaymentInstrument = saveCardComponentRef.current;
        }

        const result = await cashfreeInstanceRef.current.pay(payOptions);

        if (result?.error) {
          const settledViaWebhook = await checkWebhookAndOrderStatus(true, sessionInfo.orderId);
          if (!settledViaWebhook) {
            setElementError(
              result.error.message ||
                "Payment could not be completed. If amount was debited, the webhook will reconcile automatically."
            );
            if (onFailure) onFailure(result.error.message || "Payment failed");
          }
        } else if (result?.paymentDetails || result?.redirect === false) {
          await checkWebhookAndOrderStatus(false, sessionInfo.orderId);
        } else {
          await checkWebhookAndOrderStatus(true, sessionInfo.orderId);
        }
      } catch (err: any) {
        const settledViaWebhook = await checkWebhookAndOrderStatus(true);
        if (!settledViaWebhook) {
          setElementError(
            err?.message || "Network interruption during payment. Checking status via webhook..."
          );
        }
      } finally {
        setProcessingPay(false);
      }
    },
    [
      processingPay,
      ensureSession,
      getReturnUrl,
      activeTab,
      checkWebhookAndOrderStatus,
      onFailure,
    ]
  );

  const executePaymentRef = useRef(executeComponentPayment);
  executePaymentRef.current = executeComponentPayment;

  const ensureSessionRef = useRef(ensureSession);
  ensureSessionRef.current = ensureSession;

  const checkWebhookRef = useRef(checkWebhookAndOrderStatus);
  checkWebhookRef.current = checkWebhookAndOrderStatus;

  const getReturnUrlRef = useRef(getReturnUrl);
  getReturnUrlRef.current = getReturnUrl;

  // 5. Mount Customized Cashfree Elements In-Page per Active Method Tab
  //    Strictly depends ONLY on tab/selection primitives so session state updates NEVER unmount iframes
  useEffect(() => {
    if (!isOpen || !sdkLoaded || !cashfreeInstanceRef.current) return;

    let cancelled = false;
    destroyMountedElements();
    setElementError(null);

    const cf = cashfreeInstanceRef.current;
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        if (activeTab === "UPI_ID") {
          const container = document.getElementById("cf-inline-upi-collect");
          if (!container) return;
          container.innerHTML = "";

          const upiCollectComp = cf.create(
            "upiCollect",
            buildCashfreeElementOptions({
              placeholder: "Enter UPI ID (e.g. yourname@okaxis)",
            })
          );

          upiCollectComp.on("ready", () => {
            if (!cancelled) setElementReady(true);
          });
          upiCollectComp.on("change", (data: any) => {
            if (!cancelled) {
              setElementComplete(Boolean(data?.complete));
              setElementError(data?.error?.message || null);
            }
          });
          upiCollectComp.on("loaderror", (data: any) => {
            if (!cancelled) {
              setElementError(
                data?.error?.message || "UPI ID element failed to load. Click Retry Mount below."
              );
            }
          });

          upiCollectComp.mount("#cf-inline-upi-collect");
          payableComponentRef.current = upiCollectComp;
          activeComponentsRef.current.push(upiCollectComp);
        } else if (activeTab === "UPI_QR") {
          const container = document.getElementById("cf-inline-upi-qr");
          if (!container) return;
          container.innerHTML = "";

          const qrComp = cf.create(
            "upiQr",
            buildCashfreeElementOptions({
              size: "220px",
            })
          );

          qrComp.on("ready", () => {
            if (!cancelled) {
              setElementReady(true);
              setElementComplete(true);
            }
          });
          qrComp.on("change", (data: any) => {
            if (!cancelled && data?.error?.message) {
              setElementError(data.error.message);
            }
          });
          qrComp.on("loaderror", (data: any) => {
            if (!cancelled) {
              setElementError(data?.error?.message || "Failed to load UPI QR element.");
            }
          });

          qrComp.mount("#cf-inline-upi-qr");
          payableComponentRef.current = qrComp;
          activeComponentsRef.current.push(qrComp);

          (async () => {
            const sessionInfo = await ensureSessionRef.current();
            if (!cancelled && sessionInfo && cashfreeInstanceRef.current) {
              cashfreeInstanceRef.current
                .pay({
                  paymentMethod: qrComp,
                  paymentSessionId: sessionInfo.paymentSessionId,
                  returnUrl: getReturnUrlRef.current(sessionInfo.orderId),
                  redirect: "if_required",
                })
                .then((res: any) => {
                  if (cancelled) return;
                  if (res?.error) {
                    setElementError(res.error.message || "QR generation error");
                  } else if (res?.paymentDetails) {
                    checkWebhookRef.current(false, sessionInfo.orderId);
                  }
                })
                .catch(() => {});
            }
          })();
        } else if (activeTab === "UPI_APP") {
          const appContainer = document.getElementById("cf-inline-upi-app-single");
          if (!appContainer) return;
          appContainer.innerHTML = "";

          const appObj = UPI_APPS.find((a) => a.id === selectedUpiApp) || UPI_APPS[0];
          const upiAppComp = cf.create(
            "upiApp",
            buildCashfreeElementOptions({
              upiApp: appObj.id,
              buttonText: `Pay ₹${Number(amountRef.current).toLocaleString("en-IN")} with ${appObj.label}`,
              buttonIcon: true,
            })
          );

          upiAppComp.on("ready", () => {
            if (!cancelled) {
              setElementReady(true);
              setElementComplete(true);
            }
          });
          upiAppComp.on("click", () => {
            executePaymentRef.current(upiAppComp);
          });
          upiAppComp.on("loaderror", (data: any) => {
            if (!cancelled && data?.error?.message) {
              setElementError(data.error.message);
            }
          });

          upiAppComp.mount("#cf-inline-upi-app-single");
          payableComponentRef.current = upiAppComp;
          activeComponentsRef.current.push(upiAppComp);
        } else if (activeTab === "CARD") {
          const numEl = document.getElementById("cf-inline-card-number");
          const holderEl = document.getElementById("cf-inline-card-holder");
          const expEl = document.getElementById("cf-inline-card-expiry");
          const cvvEl = document.getElementById("cf-inline-card-cvv");
          const saveEl = document.getElementById("cf-inline-save-card");
          if (!numEl || !holderEl || !expEl || !cvvEl) return;

          numEl.innerHTML = "";
          holderEl.innerHTML = "";
          expEl.innerHTML = "";
          cvvEl.innerHTML = "";
          if (saveEl) saveEl.innerHTML = "";

          const cardNumOptions = {
            ...buildCashfreeElementOptions({
              placeholder: "XXXX XXXX XXXX XXXX",
            }),
            hideBrandIcon: false,
          };
          const cardNumberComp = cf.create("cardNumber", cardNumOptions);
          const cardHolderComp = cf.create(
            "cardHolder",
            buildCashfreeElementOptions({
              placeholder: "Cardholder Full Name",
              ...(customerNameRef.current ? { cardHolder: customerNameRef.current } : {}),
            })
          );
          const cardExpiryComp = cf.create("cardExpiry", buildCashfreeElementOptions());
          const cardCvvComp = cf.create("cardCvv", buildCashfreeElementOptions());

          let saveComp: any = null;
          if (saveEl) {
            saveComp = cf.create(
              "savePaymentInstrument",
              buildCashfreeElementOptions({
                label: "Save card securely for future Khata payments",
              })
            );
          }

          cardNumberComp.on("ready", () => {
            if (!cancelled) setElementReady(true);
          });
          cardNumberComp.on("change", (data: any) => {
            if (cancelled) return;
            if (data?.value?.brand) {
              setDetectedCardBrand(String(data.value.brand).toUpperCase());
            }
            setElementComplete(Boolean(data?.complete));
            setElementError(data?.error?.message || null);
          });
          cardCvvComp.on("change", (data: any) => {
            if (cancelled) return;
            if (data?.complete) setElementComplete(true);
            if (data?.error?.message) setElementError(data.error.message);
          });

          cardNumberComp.mount("#cf-inline-card-number");
          cardHolderComp.mount("#cf-inline-card-holder");
          cardExpiryComp.mount("#cf-inline-card-expiry");
          cardCvvComp.mount("#cf-inline-card-cvv");
          if (saveComp) {
            saveComp.mount("#cf-inline-save-card");
            saveCardComponentRef.current = saveComp;
          }

          payableComponentRef.current = cardNumberComp;
          activeComponentsRef.current.push(
            cardNumberComp,
            cardHolderComp,
            cardExpiryComp,
            cardCvvComp,
            ...(saveComp ? [saveComp] : [])
          );
        } else if (activeTab === "NETBANKING") {
          const nbContainer = document.getElementById("cf-inline-netbanking");
          if (!nbContainer) return;
          nbContainer.innerHTML = "";

          const bankObj =
            NETBANKING_BANKS.find((b) => b.code === selectedBankCode) || NETBANKING_BANKS[0];

          const nbComp = cf.create(
            "netbanking",
            buildCashfreeElementOptions({
              netbankingBankName: bankObj.code,
              buttonText: `Redirect & Pay ₹${Number(amountRef.current).toLocaleString("en-IN")} via ${bankObj.name}`,
              buttonIcon: true,
            })
          );

          nbComp.on("ready", () => {
            if (!cancelled) {
              setElementReady(true);
              setElementComplete(true);
            }
          });
          nbComp.on("click", () => {
            executePaymentRef.current(nbComp);
          });
          nbComp.on("loaderror", (data: any) => {
            if (!cancelled && data?.error?.message) setElementError(data.error.message);
          });

          nbComp.mount("#cf-inline-netbanking");
          payableComponentRef.current = nbComp;
          activeComponentsRef.current.push(nbComp);
        } else if (activeTab === "WALLET") {
          const wContainer = document.getElementById("cf-inline-wallet");
          if (!wContainer) return;
          wContainer.innerHTML = "";

          const walletObj =
            WALLET_PROVIDERS.find((w) => w.id === selectedWalletId) || WALLET_PROVIDERS[0];
          const cleanPhone = String(customerMobileRef.current || "")
            .replace(/\D/g, "")
            .slice(-10);

          const walletComp = cf.create(
            "wallet",
            buildCashfreeElementOptions({
              provider: walletObj.id,
              ...(cleanPhone.length === 10 ? { phone: cleanPhone } : {}),
              buttonText: `Pay ₹${Number(amountRef.current).toLocaleString("en-IN")} with ${walletObj.name}`,
              buttonIcon: true,
            })
          );

          walletComp.on("ready", () => {
            if (!cancelled) {
              setElementReady(true);
              setElementComplete(true);
            }
          });
          walletComp.on("click", () => {
            executePaymentRef.current(walletComp);
          });
          walletComp.on("loaderror", (data: any) => {
            if (!cancelled && data?.error?.message) setElementError(data.error.message);
          });

          walletComp.mount("#cf-inline-wallet");
          payableComponentRef.current = walletComp;
          activeComponentsRef.current.push(walletComp);
        }
      } catch (err: any) {
        if (!cancelled) {
          setElementError(err?.message || "Error mounting Cashfree custom element.");
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      destroyMountedElements();
    };
  }, [
    isOpen,
    sdkLoaded,
    activeTab,
    selectedUpiApp,
    selectedBankCode,
    selectedWalletId,
    mountRetryCount,
    destroyMountedElements,
  ]);

  if (!isOpen) return null;

  const navOptions: Array<{
    id: PaymentMethodTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "UPI_ID",
      label: "UPI ID / VPA Collect",
      sublabel: "Enter UPI ID & approve in app",
      icon: AtSign,
    },
    {
      id: "UPI_QR",
      label: "Scan UPI QR Code",
      sublabel: "Scan with GPay, PhonePe, Paytm",
      icon: QrCode,
    },
    {
      id: "UPI_APP",
      label: "Pay by UPI App",
      sublabel: "GPay, PhonePe, Paytm, BHIM",
      icon: Smartphone,
    },
    {
      id: "CARD",
      label: "Debit / Credit Card",
      sublabel: "Visa, Mastercard, RuPay",
      icon: CreditCard,
    },
    {
      id: "NETBANKING",
      label: "Net Banking",
      sublabel: "HDFC, SBI, ICICI, Axis & more",
      icon: Landmark,
    },
    {
      id: "WALLET",
      label: "Mobile Wallets",
      sublabel: "PhonePe, Paytm, Amazon Pay",
      icon: Wallet,
    },
  ];

  const handleBackAction = onBackToSelection || onClose;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top Bar: Dedicated Payment Options Tab Header */}
      <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {handleBackAction && (
            <button
              type="button"
              onClick={handleBackAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Cashfree Payment Options (Custom Elements)
            </h3>
            <p className="text-[11px] text-slate-300">
              Choose a payment method on the left • Webhook-Protected Auto Ledger Sync
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeOrderId && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-1 rounded-md">
              Order: {activeOrderId}
            </span>
          )}
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-300 block">
              Payable Amount
            </span>
            <span className="text-base font-mono font-bold text-emerald-400">
              ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Verified Banner if Settled */}
      {verifiedSuccess ? (
        <div className="p-8 text-center space-y-3 bg-emerald-50/50">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            Payment Verified &amp; Recorded in Khata Ledger
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your payment of ₹{Number(amount).toLocaleString("en-IN")} has been confirmed via Cashfree Webhook and committed to the Bahi-Khata ledger.
          </p>
        </div>
      ) : (
        /* Split Layout: Left Payment Method Rail + Right Custom Element Canvas */
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[390px]">
          {/* Left Rail: Payment Methods List (4 cols on desktop) */}
          <div className="md:col-span-4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col overflow-x-auto">
            {navOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = activeTab === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveTab(opt.id)}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 text-left border-b border-slate-200/80 transition-colors shrink-0 md:shrink cursor-pointer ${
                    isSelected
                      ? "bg-white text-slate-900 font-bold border-l-4 border-l-slate-900 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 hidden sm:block truncate">
                        {opt.sublabel}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 hidden md:block shrink-0 ${
                      isSelected ? "text-slate-900" : "text-slate-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Canvas: Mounted Cashfree Custom Elements (8 cols on desktop) */}
          <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-white">
            <div className="space-y-4">
              {elementError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-2.5 text-xs text-rose-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">{elementError}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMountRetryCount((c) => c + 1)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-semibold text-[11px] hover:bg-rose-100 shrink-0 cursor-pointer"
                  >
                    Retry Mount
                  </button>
                </div>
              )}

              {/* TAB 1: UPI ID / VPA COLLECT (Isolated upiCollect custom element) */}
              {activeTab === "UPI_ID" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Pay via UPI ID / Virtual Payment Address
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enter your registered UPI ID below and approve the collect request in your UPI app.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
                      upiCollect Element
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Customer UPI ID / VPA
                    </label>
                    <div
                      id="cf-inline-upi-collect"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-2.5 py-1 focus-within:border-slate-900 transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => executeComponentPayment()}
                    disabled={processingPay || creatingSession || !elementReady}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {processingPay || creatingSession
                        ? "Sending UPI Collect Request..."
                        : `Verify & Pay ₹${Number(amount).toLocaleString("en-IN")} via UPI ID`}
                    </span>
                  </button>
                </div>
              )}

              {/* TAB 2: SCAN UPI QR CODE (Isolated upiQr custom element) */}
              {activeTab === "UPI_QR" && (
                <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                  <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white shadow-xs flex items-center justify-center min-w-[240px] min-h-[240px]">
                    <div
                      id="cf-inline-upi-qr"
                      className="flex items-center justify-center"
                    />
                  </div>
                  <div className="space-y-3 text-center sm:text-left flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      <QrCode className="w-3.5 h-3.5" />
                      Dynamic Cashfree UPI QR
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Scan with Google Pay, PhonePe, Paytm or any UPI App
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Open any UPI app on your mobile phone and scan this QR code. Even if you close this tab after paying, the Cashfree webhook automatically updates the Bahi-Khata ledger.
                    </p>
                    <button
                      type="button"
                      onClick={() => executeComponentPayment()}
                      disabled={processingPay || creatingSession}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate / Refresh QR Code</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: UPI APPS (Isolated single upiApp custom element) */}
              {activeTab === "UPI_APP" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Select Your Preferred UPI App
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose a UPI application below to mount its dedicated Cashfree UPI intent element:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {UPI_APPS.map((app) => {
                      const isSelected = selectedUpiApp === app.id;
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white font-bold"
                              : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-xs font-bold">{app.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {app.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <div
                      id="cf-inline-upi-app-single"
                      className="w-full min-h-[50px] rounded-xl border border-slate-300 bg-slate-50 p-1.5 flex items-center justify-center"
                    />
                    <button
                      type="button"
                      onClick={() => executeComponentPayment()}
                      disabled={processingPay || creatingSession}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>
                        {processingPay || creatingSession
                          ? "Launching UPI App Authorization..."
                          : `Proceed with ${UPI_APPS.find((a) => a.id === selectedUpiApp)?.label || "UPI App"} (₹${Number(amount).toLocaleString("en-IN")})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: DEBIT / CREDIT CARD (cardNumber, cardHolder, cardExpiry, cardCvv, savePaymentInstrument) */}
              {activeTab === "CARD" && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Enter Debit / Credit Card Details
                    </span>
                    {detectedCardBrand && (
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                        {detectedCardBrand}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Card Number
                    </label>
                    <div
                      id="cf-inline-card-number"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-2 py-0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cardholder Name
                    </label>
                    <div
                      id="cf-inline-card-holder"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-2 py-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Expiry Date (MM/YY)
                      </label>
                      <div
                        id="cf-inline-card-expiry"
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-2 py-0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        CVV / CVC
                      </label>
                      <div
                        id="cf-inline-card-cvv"
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-2 py-0.5"
                      />
                    </div>
                  </div>

                  <div id="cf-inline-save-card" className="min-h-[28px] pt-1" />

                  <button
                    type="button"
                    onClick={() => executeComponentPayment()}
                    disabled={processingPay || creatingSession || !elementReady}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {processingPay || creatingSession
                        ? "Redirecting to 3D Secure Bank Page..."
                        : `Pay ₹${Number(amount).toLocaleString("en-IN")} with Card`}
                    </span>
                  </button>
                </div>
              )}

              {/* TAB 5: NET BANKING (netbanking custom element) */}
              {activeTab === "NETBANKING" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      Select Your Bank for Net Banking
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Selecting a bank mounts the Cashfree NetBanking element and redirects to the bank portal:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {NETBANKING_BANKS.map((bank) => {
                      const isSelected = selectedBankCode === bank.code;
                      return (
                        <button
                          key={bank.code}
                          type="button"
                          onClick={() => setSelectedBankCode(bank.code)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white font-semibold"
                              : "border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="text-xs font-bold truncate">{bank.name}</div>
                            <div
                              className={`text-[10px] font-mono ${
                                isSelected ? "text-slate-300" : "text-slate-400"
                              }`}
                            >
                              Code: {bank.code}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-200/70 text-slate-600"
                            }`}
                          >
                            {bank.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 space-y-2">
                    <div
                      id="cf-inline-netbanking"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50 p-1.5 flex items-center justify-center"
                    />
                    <button
                      type="button"
                      onClick={() => executeComponentPayment()}
                      disabled={processingPay || creatingSession}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>
                        {processingPay || creatingSession
                          ? "Redirecting to Bank Login..."
                          : `Proceed to Bank Portal (₹${Number(amount).toLocaleString("en-IN")})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: MOBILE WALLETS (wallet custom element) */}
              {activeTab === "WALLET" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      Select Mobile Wallet Provider
                    </span>
                    {customerMobile && (
                      <p className="text-[11px] text-slate-500">
                        Registered Mobile Number:{" "}
                        <span className="font-mono font-semibold text-slate-700">
                          {customerMobile}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {WALLET_PROVIDERS.map((w) => {
                      const isSelected = selectedWalletId === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedWalletId(w.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white font-bold"
                              : "border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-xs font-bold">{w.name}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            Direct Debit / OTP
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 space-y-2">
                    <div
                      id="cf-inline-wallet"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50 p-1.5 flex items-center justify-center"
                    />
                    <button
                      type="button"
                      onClick={() => executeComponentPayment()}
                      disabled={processingPay || creatingSession}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>
                        {processingPay || creatingSession
                          ? "Connecting to Wallet..."
                          : `Pay ₹${Number(amount).toLocaleString("en-IN")} via Wallet`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer: Webhook Status Verification Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit PCI-DSS • Auto-Webhook Midway Recovery Enabled</span>
              </div>
              {activeOrderId && (
                <button
                  type="button"
                  onClick={() => checkWebhookAndOrderStatus(false, activeOrderId)}
                  disabled={verifying}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${verifying ? "animate-spin" : ""}`} />
                  <span>{verifying ? "Checking Bank Status..." : "Already Paid? Check Status"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
