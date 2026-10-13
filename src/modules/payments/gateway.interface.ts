import {
  PaymentGatewayType,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentStatusResponse,
  PaymentVerificationResult,
  WebhookVerificationResult,
} from "./types";

/**
 * Standard Payment Gateway Interface
 * Implement this contract to attach any payment gateway (Cashfree, Razorpay, Stripe, PhonePe, Mock, etc.)
 */
export interface IPaymentGateway {
  /**
   * Unique identifier of the gateway implementation
   */
  getGatewayId(): PaymentGatewayType;

  /**
   * Returns human-readable name of the payment gateway
   */
  getDisplayName(): string;

  /**
   * Current operating environment: "sandbox" | "production"
   */
  getEnvironment(): "sandbox" | "production";

  /**
   * Initializes/creates an order on the gateway and returns checkout session credentials
   */
  createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse>;

  /**
   * Queries order details and payments status from the gateway
   */
  getOrderStatus(gatewayOrderId: string): Promise<PaymentStatusResponse>;

  /**
   * Verifies if a payment has succeeded on the gateway
   */
  verifyPayment(gatewayOrderId: string): Promise<PaymentVerificationResult>;

  /**
   * Cryptographically verifies webhook payload signature
   */
  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult>;

  /**
   * Gateway health check to verify credentials and connectivity
   */
  isHealthy(): Promise<{
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    message?: string;
    details?: any;
  }>;
}

