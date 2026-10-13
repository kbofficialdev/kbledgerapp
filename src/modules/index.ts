/**
 * KB KHATA ENTERPRISE DOMAIN MODULES
 *
 * Centralized, decoupled microservice architecture:
 * 1. Auth: Authentication, token verification, session tracking, role guards
 * 2. Customers: Customer lifecycle, safe deactivation/blacklisting, village territory directory
 * 3. Ledger: ACID accounting, running balance invariants, active account isolation
 * 4. Billing: Counter billing, line items, receipt formatting
 * 5. Payments: Pluggable gateway adapters (Cashfree, Mock, Razorpay), HMAC security tokens
 * 6. AI: LangGraph store executive agents & customer conversational copilot
 */

export * from "./auth";
export * from "./customers";
export * from "./ledger";
export * from "./billing";
export * from "./payments";
export * from "./ai";

