/**
 * Pluggable Payment System - Core Types and Contracts
 * Decoupled payment module that can attach/detach any payment gateway.
 */

export type PaymentGatewayType = "CASHFREE" | "RAZORPAY" | "STRIPE" | "PHONEPE" | "MOCK";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "USER_DROPPED";

export interface PaymentCustomerDetails {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface PaymentOrderRequest {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerDetails: PaymentCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
  orderMeta?: Record<string, any>;
}

export interface PaymentOrderResponse {
  success: boolean;
  gateway: PaymentGatewayType;
  gatewayOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentSessionId?: string;
  checkoutUrl?: string;
  environment: "sandbox" | "production";
  raw?: any;
}

export interface PaymentStatusResponse {
  gatewayOrderId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  payments?: Array<{
    paymentId: string;
    amount: number;
    status: PaymentStatus;
    method?: string;
    paidAt?: string;
  }>;
  raw?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: PaymentStatus;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  paymentMethod: string;
  raw?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  gateway: PaymentGatewayType;
  eventType: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount?: number;
  status?: PaymentStatus;
  payload?: any;
}

export interface CheckoutTokenPayload {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  orderType: string;
  paymentSessionId: string;
  gateway: PaymentGatewayType;
  environment: "sandbox" | "production";
  returnUrl: string;
  cancelUrl: string;
  notes?: string;
  issuedAt: number;
  expiresAt: number;
}

