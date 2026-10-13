import crypto from "crypto";
import { IPaymentGateway } from "../gateway.interface";
import {
  PaymentGatewayType,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentStatusResponse,
  PaymentVerificationResult,
  WebhookVerificationResult,
  PaymentStatus,
} from "../types";

export interface CashfreeGatewayConfig {
  appId?: string;
  secretKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  environment?: "sandbox" | "production";
}

export class CashfreeGateway implements IPaymentGateway {
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly environment: "sandbox" | "production";

  constructor(config?: CashfreeGatewayConfig) {
    this.appId = config?.appId || process.env.CASHFREE_APP_ID || "";
    this.secretKey = config?.secretKey || process.env.CASHFREE_SECRET_KEY || "";
    this.baseUrl =
      config?.baseUrl ||
      process.env.CASHFREE_BASE_URL ||
      "https://sandbox.cashfree.com/pg";
    this.apiVersion =
      config?.apiVersion || process.env.CASHFREE_API_VERSION || "2023-08-01";
    this.environment =
      config?.environment ||
      ((process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() as
        | "sandbox"
        | "production");
  }

  getGatewayId(): PaymentGatewayType {
    return "CASHFREE";
  }

  getDisplayName(): string {
    return "Cashfree Payment Gateway (v3 Custom Elements)";
  }

  getEnvironment(): "sandbox" | "production" {
    return this.environment;
  }

  private getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-version": this.apiVersion,
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      ...extra,
    };
  }

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const url = `${this.baseUrl}/orders`;

    const cleanedPhone = String(request.customerDetails.customerPhone || "")
      .replace(/[^0-9]/g, "")
      .slice(-10);

    if (cleanedPhone.length !== 10) {
      throw new Error(
        "A valid 10-digit customer mobile number is required for Cashfree checkout."
      );
    }

    const customerDetailsPayload: Record<string, string> = {
      customer_id: request.customerDetails.customerId,
      customer_name: request.customerDetails.customerName || "Customer",
      customer_phone: cleanedPhone,
    };
    if (request.customerDetails.customerEmail) {
      customerDetailsPayload.customer_email = request.customerDetails.customerEmail;
    }

    const payload: Record<string, any> = {
      order_id: request.orderId,
      order_amount: Math.round(request.orderAmount * 100) / 100,
      order_currency: request.orderCurrency || "INR",
      customer_details: customerDetailsPayload,
      order_meta: {
        return_url: request.returnUrl || null,
        notify_url: request.notifyUrl || null,
        payment_methods: null,
      },
      order_note: request.orderNote || "KB Khata & Fashions Store Order",
    };

    const idempotencyKey = `idemp_${request.orderId}_${Date.now()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getAuthHeaders({
        "x-idempotency-key": idempotencyKey,
      }),
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

    return {
      success: true,
      gateway: "CASHFREE",
      gatewayOrderId: data.order_id || request.orderId,
      orderId: request.orderId,
      amount: data.order_amount || request.orderAmount,
      currency: data.order_currency || "INR",
      paymentSessionId: data.payment_session_id,
      environment: this.environment,
      raw: data,
    };
  }

  async getOrderStatus(gatewayOrderId: string): Promise<PaymentStatusResponse> {
    const url = `${this.baseUrl}/orders/${encodeURIComponent(gatewayOrderId)}`;
    const paymentsUrl = `${this.baseUrl}/orders/${encodeURIComponent(
      gatewayOrderId
    )}/payments`;

    const [orderRes, paymentsRes] = await Promise.all([
      fetch(url, { method: "GET", headers: this.getAuthHeaders() }),
      fetch(paymentsUrl, { method: "GET", headers: this.getAuthHeaders() }).catch(
        () => null
      ),
    ]);

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(
        orderData.message || `Cashfree query failed with HTTP ${orderRes.status}`
      );
    }

    let paymentsList: any[] = [];
    if (paymentsRes && paymentsRes.ok) {
      paymentsList = await paymentsRes.json().catch(() => []);
    }

    let status: PaymentStatus = "PENDING";
    if (orderData.order_status === "PAID") {
      status = "SUCCESS";
    } else if (
      orderData.order_status === "EXPIRED" ||
      orderData.order_status === "TERMINATED"
    ) {
      status = "FAILED";
    }

    const payments = Array.isArray(paymentsList)
      ? paymentsList.map((p) => ({
          paymentId: String(p.cf_payment_id || p.payment_id || ""),
          amount: Number(p.payment_amount || 0),
          status: (p.payment_status === "SUCCESS"
            ? "SUCCESS"
            : p.payment_status === "FAILED"
            ? "FAILED"
            : "PENDING") as PaymentStatus,
          method: String(p.payment_group || p.payment_method || "ONLINE"),
          paidAt: p.payment_time || p.created_at,
        }))
      : [];

    return {
      gatewayOrderId,
      orderId: orderData.order_id,
      status,
      amount: Number(orderData.order_amount || 0),
      currency: orderData.order_currency || "INR",
      payments,
      raw: { order: orderData, payments: paymentsList },
    };
  }

  async verifyPayment(gatewayOrderId: string): Promise<PaymentVerificationResult> {
    const orderStatus = await this.getOrderStatus(gatewayOrderId);

    const successfulPayment = orderStatus.payments?.find(
      (p) => p.status === "SUCCESS"
    );

    const isSuccess = orderStatus.status === "SUCCESS" || !!successfulPayment;

    return {
      success: isSuccess,
      status: isSuccess ? "SUCCESS" : orderStatus.status,
      gatewayOrderId,
      gatewayPaymentId: successfulPayment?.paymentId,
      amount: successfulPayment?.amount || orderStatus.amount,
      paymentMethod: successfulPayment?.method || "CASHFREE_ELEMENTS",
      raw: orderStatus.raw,
    };
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    const getHeader = (key: string) => {
      const val = headers[key] || headers[key.toLowerCase()];
      return Array.isArray(val) ? val[0] : val;
    };

    const signature = getHeader("x-webhook-signature");
    const timestamp = getHeader("x-webhook-timestamp");

    let parsedPayload: any = null;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        gateway: "CASHFREE",
        eventType: "PARSE_ERROR",
      };
    }

    if (!signature || !timestamp) {
      // In sandbox development with local testing fallback
      if (this.environment === "sandbox" && parsedPayload?.data?.order) {
        const order = parsedPayload.data.order;
        const payment = parsedPayload.data.payment;
        return {
          isValid: true,
          gateway: "CASHFREE",
          eventType: parsedPayload.type || "PAYMENT_SUCCESS_WEBHOOK",
          gatewayOrderId: order.order_id,
          gatewayPaymentId: String(payment?.cf_payment_id || ""),
          amount: Number(payment?.payment_amount || order.order_amount || 0),
          status: payment?.payment_status === "SUCCESS" ? "SUCCESS" : "PENDING",
          payload: parsedPayload,
        };
      }
      return {
        isValid: false,
        gateway: "CASHFREE",
        eventType: "MISSING_SIGNATURE",
        payload: parsedPayload,
      };
    }

    // Verify HMAC-SHA256 signature
    const signaturePayload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(signaturePayload)
      .digest("base64");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    const isValid =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    const order = parsedPayload?.data?.order;
    const payment = parsedPayload?.data?.payment;

    return {
      isValid,
      gateway: "CASHFREE",
      eventType: parsedPayload?.type || "UNKNOWN",
      gatewayOrderId: order?.order_id,
      gatewayPaymentId: String(payment?.cf_payment_id || ""),
      amount: Number(payment?.payment_amount || order?.order_amount || 0),
      status: payment?.payment_status === "SUCCESS" ? "SUCCESS" : "PENDING",
      payload: parsedPayload,
    };
  }

  async isHealthy(): Promise<{
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    message?: string;
    details?: any;
  }> {
    if (!this.appId || !this.secretKey) {
      return {
        status: "UNHEALTHY",
        message: "Cashfree APP_ID or SECRET_KEY missing in environment.",
      };
    }

    try {
      // Test connectivity by querying sandbox API
      const testOrderId = `CF_HEALTH_${Date.now()}`;
      const url = `${this.baseUrl}/orders/${encodeURIComponent(testOrderId)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      // HTTP 404 with valid JSON means credentials authenticated successfully!
      if (res.status === 404 || res.status === 200) {
        return {
          status: "HEALTHY",
          message: `Cashfree (${this.environment.toUpperCase()}) Gateway online and authenticated.`,
          details: { baseUrl: this.baseUrl, env: this.environment },
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: "UNHEALTHY",
          message: "Cashfree authentication failed: invalid client ID or secret.",
          details: { httpStatus: res.status },
        };
      }

      return {
        status: "DEGRADED",
        message: `Cashfree returned HTTP ${res.status}`,
        details: { httpStatus: res.status },
      };
    } catch (err: any) {
      return {
        status: "UNHEALTHY",
        message: `Could not reach Cashfree endpoint: ${err.message}`,
      };
    }
  }
}
