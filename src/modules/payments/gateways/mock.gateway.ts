import { IPaymentGateway } from "../gateway.interface";
import {
  PaymentGatewayType,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentStatusResponse,
  PaymentVerificationResult,
  WebhookVerificationResult,
} from "../types";

/**
 * Mock Payment Gateway
 * Allows running deterministic tests and simulating alternative attached gateways.
 */
export class MockPaymentGateway implements IPaymentGateway {
  private readonly orders: Map<string, any> = new Map();

  getGatewayId(): PaymentGatewayType {
    return "MOCK";
  }

  getDisplayName(): string {
    return "Mock Test Payment Gateway (Simulated Provider)";
  }

  getEnvironment(): "sandbox" | "production" {
    return "sandbox";
  }

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `MOCK_ORDER_${request.orderId}`;
    const paymentSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const orderRecord = {
      orderId: request.orderId,
      gatewayOrderId,
      amount: request.orderAmount,
      currency: request.orderCurrency || "INR",
      status: "PENDING",
      paymentSessionId,
      customerDetails: request.customerDetails,
      payments: [],
    };

    this.orders.set(gatewayOrderId, orderRecord);
    this.orders.set(request.orderId, orderRecord);

    return {
      success: true,
      gateway: "MOCK",
      gatewayOrderId,
      orderId: request.orderId,
      amount: request.orderAmount,
      currency: request.orderCurrency || "INR",
      paymentSessionId,
      environment: "sandbox",
      raw: orderRecord,
    };
  }

  async getOrderStatus(gatewayOrderId: string): Promise<PaymentStatusResponse> {
    const record = this.orders.get(gatewayOrderId);
    if (!record) {
      throw new Error(`Mock order ${gatewayOrderId} not found.`);
    }

    return {
      gatewayOrderId,
      orderId: record.orderId,
      status: record.status,
      amount: record.amount,
      currency: record.currency,
      payments: record.payments,
      raw: record,
    };
  }

  async verifyPayment(gatewayOrderId: string): Promise<PaymentVerificationResult> {
    const record = this.orders.get(gatewayOrderId);
    if (!record) {
      return {
        success: false,
        status: "FAILED",
        gatewayOrderId,
        amount: 0,
        paymentMethod: "MOCK",
      };
    }

    const isSuccess = record.status === "SUCCESS";
    return {
      success: isSuccess,
      status: isSuccess ? "SUCCESS" : "PENDING",
      gatewayOrderId,
      gatewayPaymentId: record.payments?.[0]?.paymentId || `MOCK_PAY_${Date.now()}`,
      amount: record.amount,
      paymentMethod: "MOCK_UPI",
      raw: record,
    };
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    try {
      const payload = JSON.parse(rawBody);
      return {
        isValid: true,
        gateway: "MOCK",
        eventType: payload.type || "PAYMENT_SUCCESS",
        gatewayOrderId: payload.orderId || payload.data?.order?.order_id,
        gatewayPaymentId: payload.paymentId || "MOCK_PAY_WH",
        amount: payload.amount || payload.data?.payment?.payment_amount,
        status: "SUCCESS",
        payload,
      };
    } catch {
      return {
        isValid: false,
        gateway: "MOCK",
        eventType: "PARSE_ERROR",
      };
    }
  }

  /**
   * Helper to simulate successful payment for testing
   */
  simulatePaymentSuccess(orderId: string, paymentId?: string): void {
    const record = this.orders.get(orderId);
    if (record) {
      record.status = "SUCCESS";
      record.payments = [
        {
          paymentId: paymentId || `MOCK_PAY_${Date.now()}`,
          amount: record.amount,
          status: "SUCCESS",
          method: "MOCK_UPI",
          paidAt: new Date().toISOString(),
        },
      ];
    }
  }

  async isHealthy(): Promise<{
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    message?: string;
  }> {
    return {
      status: "HEALTHY",
      message: "Mock payment gateway ready for testing.",
    };
  }
}

