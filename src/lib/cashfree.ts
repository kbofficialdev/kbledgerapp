import crypto from "crypto";

export interface CashfreeCustomerDetails {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone: string;
}

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerDetails: CashfreeCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id?: number | string;
  order_id: string;
  entity?: string;
  order_currency: string;
  order_amount: number;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED";
  payment_session_id?: string;
  order_expiry_time?: string;
  order_note?: string;
  customer_details?: {
    customer_id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone: string;
  };
  message?: string;
  code?: string;
  type?: string;
}

export class CashfreeGatewayService {
  private static instance: CashfreeGatewayService;
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || "";
    this.secretKey = process.env.CASHFREE_SECRET_KEY || "";
    this.baseUrl =
      process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com/pg";
    this.apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";
  }

  static getInstance(): CashfreeGatewayService {
    if (!CashfreeGatewayService.instance) {
      CashfreeGatewayService.instance = new CashfreeGatewayService();
    }
    return CashfreeGatewayService.instance;
  }

  getAppId(): string {
    return this.appId;
  }

  getEnvironment(): "sandbox" | "production" {
    return (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() as "sandbox" | "production";
  }

  /**
   * Creates a new Cashfree PG Order and returns the payment_session_id
   * for Custom Web Checkout Elements.
   */
  async createOrder(params: CreateOrderParams): Promise<CashfreeOrderResponse> {
    const url = `${this.baseUrl}/orders`;

    // Cashfree requires numeric phone formatted to 10 digits
    const cleanedPhone = (params.customerDetails.customerPhone || "9999999999")
      .replace(/[^0-9]/g, "")
      .slice(-10) || "9999999999";

    const payload = {
      order_id: params.orderId,
      order_amount: Math.round(params.orderAmount * 100) / 100,
      order_currency: params.orderCurrency || "INR",
      customer_details: {
        customer_id: params.customerDetails.customerId || `cust_${Date.now()}`,
        customer_name: params.customerDetails.customerName || "KB Customer",
        customer_email: params.customerDetails.customerEmail || "customer@kbkhata.store",
        customer_phone: cleanedPhone,
      },
      order_meta: {
        return_url:
          params.returnUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/billing/receipt?order_id={order_id}`,
        notify_url:
          params.notifyUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/cashfree/webhook`,
        payment_methods: "upi,cc,dc,nb",
      },
      order_note: params.orderNote || "KB Khata & Fashions Store Order",
    };

    const idempotencyKey = `idemp_${params.orderId}_${Date.now()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": this.apiVersion,
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.message ||
        data.error_message ||
        `Cashfree Order Creation Failed with HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as CashfreeOrderResponse;
  }

  /**
   * Retrieves an Order status from Cashfree
   */
  async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    const url = `${this.baseUrl}/orders/${encodeURIComponent(orderId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-version": this.apiVersion,
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to fetch Cashfree order: ${response.status}`);
    }

    return data as CashfreeOrderResponse;
  }

  /**
   * Retrieves payment transactions for a given Order
   */
  async getOrderPayments(orderId: string): Promise<any[]> {
    const url = `${this.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-version": this.apiVersion,
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return [];
    }

    return Array.isArray(data) ? data : [];
  }

  /**
   * Computes expected Cashfree Webhook Signature for testing / verification
   */
  generateWebhookSignature(rawBody: string, timestamp: string): string {
    const dataToSign = timestamp + rawBody;
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(dataToSign)
      .digest("base64");
  }

  /**
   * Verifies Cashfree Webhook Signature
   * Signature is computed as base64(hmac-sha256(timestamp + rawBody, secretKey))
   */
  verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
    try {
      if (!signature || !timestamp || !rawBody) return false;

      const dataToSign = timestamp + rawBody;
      const expectedSignature = crypto
        .createHmac("sha256", this.secretKey)
        .update(dataToSign)
        .digest("base64");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "utf-8"),
        Buffer.from(expectedSignature, "utf-8")
      );
    } catch {
      return false;
    }
  }
}

export const cashfreeGateway = CashfreeGatewayService.getInstance();

