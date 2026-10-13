import { IPaymentGateway } from "./gateway.interface";
import { CashfreeGateway } from "./gateways/cashfree.gateway";
import { MockPaymentGateway } from "./gateways/mock.gateway";
import { PaymentTokenService } from "./payment-token.service";
import {
  PaymentGatewayType,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerificationResult,
  WebhookVerificationResult,
} from "./types";
import { prisma } from "@/lib/prisma";
import { settleCashfreePaymentRecord } from "@/lib/cashfree-reconcile";

export interface CreateCheckoutSessionRequest {
  orderId?: string;
  amount: number;
  currency?: string;
  customerDetails: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  };
  orderType: "COUNTER_BILL" | "CUSTOMER_DIRECT" | "KHATA_SETTLEMENT";
  billingDraft?: any;
  orderIds?: string[];
  notes?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  token: string;
  checkoutUrl: string;
  orderId: string;
  paymentSessionId: string;
  amount: number;
  gateway: PaymentGatewayType;
  environment: "sandbox" | "production";
}

export class PaymentMicroservice {
  private static instance: PaymentMicroservice;
  private readonly gateways: Map<PaymentGatewayType, IPaymentGateway> = new Map();
  private activeGatewayType: PaymentGatewayType = "CASHFREE";

  constructor() {
    // Register default built-in gateways
    this.registerGateway(new CashfreeGateway());
    this.registerGateway(new MockPaymentGateway());

    const configuredGateway = (process.env.DEFAULT_PAYMENT_GATEWAY || "CASHFREE").toUpperCase();
    if (this.gateways.has(configuredGateway as PaymentGatewayType)) {
      this.activeGatewayType = configuredGateway as PaymentGatewayType;
    }
  }

  static getInstance(): PaymentMicroservice {
    if (!PaymentMicroservice.instance) {
      PaymentMicroservice.instance = new PaymentMicroservice();
    }
    return PaymentMicroservice.instance;
  }

  /**
   * Attach or register an external payment gateway
   */
  registerGateway(gateway: IPaymentGateway): void {
    this.gateways.set(gateway.getGatewayId(), gateway);
  }

  /**
   * Detach or remove a payment gateway
   */
  detachGateway(type: PaymentGatewayType): boolean {
    if (type === this.activeGatewayType) {
      throw new Error(`Cannot detach active gateway '${type}'. Switch active gateway first.`);
    }
    return this.gateways.delete(type);
  }

  /**
   * Set active payment gateway (e.g. switch between Cashfree, Mock, Razorpay, etc.)
   */
  setActiveGateway(type: PaymentGatewayType): void {
    if (!this.gateways.has(type)) {
      throw new Error(`Payment gateway '${type}' is not registered in PaymentMicroservice.`);
    }
    this.activeGatewayType = type;
  }

  /**
   * Returns currently active payment gateway
   */
  getActiveGateway(): IPaymentGateway {
    const gw = this.gateways.get(this.activeGatewayType);
    if (!gw) {
      throw new Error(`Active payment gateway '${this.activeGatewayType}' not found.`);
    }
    return gw;
  }

  getRegisteredGateways(): Array<{
    id: PaymentGatewayType;
    name: string;
    environment: "sandbox" | "production";
    isActive: boolean;
  }> {
    return Array.from(this.gateways.entries()).map(([id, gw]) => ({
      id,
      name: gw.getDisplayName(),
      environment: gw.getEnvironment(),
      isActive: id === this.activeGatewayType,
    }));
  }

  /**
   * Creates a new Payment Gateway Order, records pending status in DB,
   * signs an HMAC tamper-proof checkout session token, and returns the secure checkout URL.
   */
  async createCheckoutSession(
    req: CreateCheckoutSessionRequest
  ): Promise<CheckoutSessionResult> {
    const gateway = this.getActiveGateway();

    // Generate or use specified unique order ID
    const orderId =
      req.orderId ||
      `CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const defaultReturnUrl =
      req.returnUrl || `${appBaseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`;
    const defaultCancelUrl =
      req.cancelUrl || `${appBaseUrl}/checkout/failed?orderId=${encodeURIComponent(orderId)}&reason=user_cancelled`;

    // 1. Create order on active gateway provider
    const gwResponse = await gateway.createOrder({
      orderId,
      orderAmount: req.amount,
      orderCurrency: req.currency || "INR",
      customerDetails: req.customerDetails,
      returnUrl: defaultReturnUrl,
      notifyUrl: `${appBaseUrl}/api/payments/cashfree/webhook`,
      orderNote: req.notes || `KB Khata Order ${orderId}`,
      orderMeta: {
        orderType: req.orderType,
        billingDraft: req.billingDraft,
        orderIds: req.orderIds,
      },
    });

    if (!gwResponse.paymentSessionId) {
      throw new Error(
        `Payment gateway '${gateway.getGatewayId()}' did not return a valid payment_session_id.`
      );
    }

    // 2. Persist PENDING Payment record in PostgreSQL
    const paymentRef = `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    await prisma.payment.upsert({
      where: { cashfreeOrderId: orderId },
      create: {
        paymentRef,
        amount: req.amount,
        method: "CASHFREE_ELEMENTS",
        status: "PENDING",
        cashfreeOrderId: orderId,
        paymentSessionId: gwResponse.paymentSessionId,
        customerId: req.customerDetails.customerId,
        notes: req.notes || `Pending online payment via ${gateway.getDisplayName()}`,
        rawGatewayResponse: {
          gateway: gateway.getGatewayId(),
          environment: gateway.getEnvironment(),
          orderMeta: {
            orderType: req.orderType,
            billingDraft: req.billingDraft,
            orderIds: req.orderIds,
          },
          orderResponse: gwResponse.raw,
        },
      },
      update: {
        amount: req.amount,
        paymentSessionId: gwResponse.paymentSessionId,
        rawGatewayResponse: {
          gateway: gateway.getGatewayId(),
          environment: gateway.getEnvironment(),
          orderMeta: {
            orderType: req.orderType,
            billingDraft: req.billingDraft,
            orderIds: req.orderIds,
          },
          orderResponse: gwResponse.raw,
        },
      },
    });

    // 3. Cryptographically sign tamper-proof token
    const token = PaymentTokenService.signCheckoutToken({
      orderId,
      customerId: req.customerDetails.customerId,
      customerName: req.customerDetails.customerName,
      customerPhone: req.customerDetails.customerPhone,
      customerEmail: req.customerDetails.customerEmail,
      amount: req.amount,
      currency: req.currency || "INR",
      orderType: req.orderType,
      paymentSessionId: gwResponse.paymentSessionId,
      gateway: gateway.getGatewayId(),
      environment: gateway.getEnvironment(),
      returnUrl: defaultReturnUrl,
      cancelUrl: defaultCancelUrl,
      notes: req.notes,
      ttlSeconds: 1200, // 20 minutes
    });

    const checkoutUrl = `/checkout/pay?token=${encodeURIComponent(token)}`;

    return {
      token,
      checkoutUrl,
      orderId,
      paymentSessionId: gwResponse.paymentSessionId,
      amount: req.amount,
      gateway: gateway.getGatewayId(),
      environment: gateway.getEnvironment(),
    };
  }

  /**
   * Verifies payment with the active gateway and atomically settles the ledger
   */
  async verifyAndSettle(gatewayOrderId: string): Promise<PaymentVerificationResult> {
    const gateway = this.getActiveGateway();

    // 1. Query Gateway Provider
    const verification = await gateway.verifyPayment(gatewayOrderId);

    // 2. If Gateway reports success, settle in database
    if (verification.success) {
      await settleCashfreePaymentRecord({
        cfOrderId: gatewayOrderId,
        cfPaymentId: verification.gatewayPaymentId,
        gatewayPayload: verification.raw,
      });
    }

    return verification;
  }

  /**
   * Validates webhook signature and reconciles if valid
   */
  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    const gateway = this.getActiveGateway();
    const result = await gateway.verifyWebhookSignature(rawBody, headers);

    if (result.isValid && result.gatewayOrderId && result.status === "SUCCESS") {
      await settleCashfreePaymentRecord({
        cfOrderId: result.gatewayOrderId,
        cfPaymentId: result.gatewayPaymentId,
        gatewayPayload: result.payload,
      });
    }

    return result;
  }

  /**
   * Gateway health check
   */
  async getHealth(): Promise<{
    activeGateway: PaymentGatewayType;
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    message?: string;
    details?: any;
  }> {
    const active = this.getActiveGateway();
    const health = await active.isHealthy();
    return {
      activeGateway: active.getGatewayId(),
      ...health,
    };
  }
}
