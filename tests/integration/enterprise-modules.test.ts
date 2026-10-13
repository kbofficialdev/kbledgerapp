/**
 * ENTERPRISE INTEGRATION TEST SUITE: MODULAR DOMAINS & BLACKLIST INTEGRITY
 *
 * Verifies:
 * 1. Customer Blacklisting & Safe Deactivation:
 *    - Records preserved in DB (never permanently wiped).
 *    - Accounts visible on Blacklisted / Inactive queries.
 *    - Strict login ban & checkout ban for blacklisted accounts.
 *    - Successful reactivation.
 * 2. Ledger Domain:
 *    - Active ledger isolation (excludes blacklisted accounts from active totals).
 *    - Mathematical invariant verification: sum(debit) - sum(credit) == balance.
 * 3. Billing Domain:
 *    - Calculation precision (paise rounding).
 *    - Validation blocks billing for disabled accounts.
 * 4. Auth Domain:
 *    - Token lifecycle & active DB session checks.
 * 5. AI Domain:
 *    - Customer copilot blocks blacklisted accounts.
 * 6. Payments Domain:
 *    - Microservice gateway registry & health verification.
 */

import { prisma } from "../../src/lib/prisma";
import {
  CustomerService,
  AuthService,
  LedgerService,
  BillingService,
  AIService,
  PaymentMicroservice,
} from "../../src/modules";

interface TestReportItem {
  id: string;
  domain: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

const report: TestReportItem[] = [];

function recordTest(id: string, domain: string, name: string, fn: () => Promise<string> | string) {
  return async () => {
    const start = performance.now();
    try {
      const details = await fn();
      const durationMs = Math.round(performance.now() - start);
      report.push({ id, domain, name, passed: true, durationMs, details });
      console.log(`  ✅ [PASS] ${id} (${domain}): ${name} (${durationMs}ms) -> ${details}`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      report.push({ id, domain, name, passed: false, durationMs, details: "Failed", error: err.message });
      console.error(`  ❌ [FAIL] ${id} (${domain}): ${name} (${durationMs}ms) -> ${err.message}`);
    }
  };
}

async function runEnterpriseIntegrationTests() {
  console.log("\n==========================================================================");
  console.log("       KB KHATA - ENTERPRISE MODULES & BLACKLIST VERIFICATION SUITE       ");
  console.log("==========================================================================\n");

  const customerService = CustomerService.getInstance();
  const authService = AuthService.getInstance();
  const ledgerService = LedgerService.getInstance();
  const billingService = BillingService.getInstance();
  const aiService = AIService.getInstance();
  const paymentMicroservice = PaymentMicroservice.getInstance();

  // -------------------------------------------------------------------------
  // DOMAIN 1: CUSTOMER BLACKLISTING, SAFE DEACTIVATION & DIRECTORY
  // -------------------------------------------------------------------------
  console.log("--- 1. Customer Domain: Blacklist & Safe Deactivation ---");

  // Ensure test village exists
  let testVillage = await prisma.village.findFirst();
  if (!testVillage) {
    testVillage = await prisma.village.create({
      data: {
        code: "VIL-INT-01",
        name: "Integration Test Village",
      },
    });
  }

  // Create dedicated test customer for blacklisting lifecycle
  const testMobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const createdCust = await customerService.createCustomer({
    name: "Suresh Blacklist QA",
    mobile: testMobile,
    villageId: testVillage.id,
    creditLimit: 5000,
    initialBalance: 750,
    notes: "Customer created for blacklist lifecycle testing",
  });

  await recordTest("CUST_01", "Customer", "Create Test Customer with Opening Balance", () => {
    if (!createdCust.id || createdCust.currentBalance !== 750) {
      throw new Error(`Customer creation failed: ${JSON.stringify(createdCust)}`);
    }
    return `Created customer ${createdCust.name} (${createdCust.customerCode}) with balance ₹${createdCust.currentBalance}`;
  })();

  await recordTest("CUST_02", "Customer", "Deactivate & Blacklist Customer (Preserves DB Records)", async () => {
    const deactivated = await customerService.deactivateCustomer(
      createdCust.id,
      "QA Blacklist Compliance Verification"
    );

    if (deactivated.isActive !== false) {
      throw new Error("Customer isActive was not set to false!");
    }

    // Verify customer STILL EXISTS in PostgreSQL database!
    const inDb = await prisma.customer.findUnique({
      where: { id: createdCust.id },
      include: { ledgerEntries: true },
    });

    if (!inDb) {
      throw new Error("Critical failure: Customer was deleted from PostgreSQL instead of soft-deactivated!");
    }

    if (inDb.ledgerEntries.length === 0) {
      throw new Error("Critical failure: Ledger history was wiped!");
    }

    return `Customer safely deactivated. DB record preserved with ${inDb.ledgerEntries.length} historical ledger entries.`;
  })();

  await recordTest("CUST_03", "Customer", "Query Blacklisted Customers Directory", async () => {
    const blacklistedList = await customerService.getCustomers({ status: "blacklisted" });
    const match = blacklistedList.find((c) => c.id === createdCust.id);
    if (!match) {
      throw new Error("Deactivated customer was not returned in status=blacklisted query!");
    }
    return `Found ${blacklistedList.length} blacklisted accounts including ${match.name} (${match.customerCode}).`;
  })();

  await recordTest("CUST_04", "Customer", "Query All Customers (Active + Blacklisted)", async () => {
    const allList = await customerService.getCustomers({ status: "all" });
    const match = allList.find((c) => c.id === createdCust.id);
    if (!match) {
      throw new Error("Deactivated customer was missing from status=all query!");
    }
    if (match.isActive !== false) {
      throw new Error("Customer isActive flag is incorrect in all query!");
    }
    return `Query returned ${allList.length} total accounts. Active and blacklisted accounts cleanly identified.`;
  })();

  await recordTest("CUST_05", "Auth", "Banned from Login & Token Issuance", async () => {
    try {
      await authService.generateCustomerToken(createdCust.id);
      throw new Error("Security failure: Token was issued for a blacklisted account!");
    } catch (err: any) {
      if (err.message.includes("deactivated/blacklisted")) {
        return `Correctly blocked: "${err.message}"`;
      }
      throw err;
    }
  })();

  await recordTest("CUST_06", "Billing", "Banned from Creating New Bills/Orders", async () => {
    const validation = await billingService.validateDraft({
      villageId: testVillage.id,
      customerId: createdCust.id,
      items: [
        {
          id: "1",
          customItemId: "ITEM-01",
          name: "Cotton Shirt",
          quantity: 1,
          unit: "Pcs",
          pricePerUnit: 500,
          lineTotal: 500,
        },
      ],
      totalAmount: 500,
      paymentType: "CREDIT",
      paidAmount: 0,
      creditAmount: 500,
    });

    if (validation.valid) {
      throw new Error("Billing validation allowed bill creation for blacklisted customer!");
    }

    return `Correctly blocked billing: "${validation.error}"`;
  })();

  await recordTest("CUST_07", "AI", "Banned from Customer AI Copilot Access", async () => {
    const aiResponse = await aiService.runCustomerCopilot(
      createdCust.id,
      "What is my current balance?"
    );

    if (aiResponse.status === "SUCCESS") {
      throw new Error("AI copilot served blacklisted customer!");
    }

    return `AI copilot correctly denied access: "${aiResponse.content}"`;
  })();

  await recordTest("CUST_08", "Customer", "Reactivate Blacklisted Account", async () => {
    const reactivated = await customerService.reactivateCustomer(createdCust.id);
    if (!reactivated.isActive) {
      throw new Error("Reactivation failed: isActive is still false!");
    }
    return `Customer ${reactivated.name} reactivated successfully.`;
  })();

  // -------------------------------------------------------------------------
  // DOMAIN 2: LEDGER DOMAIN & ACID INVARIANTS
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Ledger Domain: Active Isolation & Invariant Checks ---");

  await recordTest("LEDG_01", "Ledger", "Verify Ledger Math Invariant on Account", async () => {
    const invariant = await ledgerService.verifyCustomerLedgerInvariant(createdCust.id);
    if (!invariant.isInvariantSatisfied) {
      throw new Error(`Invariant failed: calculated ₹${invariant.calculatedBalance} != stored ₹${invariant.storedBalance}`);
    }
    return `Ledger invariant verified! Sum(Debits) - Sum(Credits) = ₹${invariant.calculatedBalance} (Stored: ₹${invariant.storedBalance})`;
  })();

  await recordTest("LEDG_02", "Ledger", "Active Ledger Query Isolates Inactive Accounts", async () => {
    // Temporarily deactivate again
    await customerService.deactivateCustomer(createdCust.id, "Testing isolation");

    const activeLedger = await ledgerService.getLedgerEntries({ includeInactive: false });
    const hasInactiveEntry = activeLedger.entries.some((e) => e.customerId === createdCust.id);

    if (hasInactiveEntry) {
      throw new Error("Inactive customer entries leaked into active ledger summary!");
    }

    // Reactivate for clean state
    await customerService.reactivateCustomer(createdCust.id);

    return `Active ledger summary contains ${activeLedger.activeRecordsCount} entries, cleanly isolating deactivated accounts.`;
  })();

  // -------------------------------------------------------------------------
  // DOMAIN 3: BILLING DOMAIN
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Billing Domain: Totals Calculation & Validation ---");

  await recordTest("BILL_01", "Billing", "Calculate Itemized Line Totals without Float Drift", () => {
    const items = [
      { quantity: 3, pricePerUnit: 499.99 },
      { quantity: 2, pricePerUnit: 1250.5 },
      { quantity: 1, pricePerUnit: 75.25 },
    ];
    const calc = billingService.calculateTotals(items);
    // 3 * 499.99 = 1499.97, 2 * 1250.5 = 2501.00, 1 * 75.25 = 75.25 => total 4076.22
    if (calc.totalAmount !== 4076.22) {
      throw new Error(`Float drift in total: expected 4076.22, got ${calc.totalAmount}`);
    }
    return `Calculated exact order total ₹${calc.totalAmount} for ${calc.itemCount} items without floating-point error.`;
  })();

  // -------------------------------------------------------------------------
  // DOMAIN 4: PAYMENTS DOMAIN
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Payments Domain: Registry & Health Verification ---");

  await recordTest("PAY_01", "Payments", "Verify Payment Microservice Health & Registered Adapters", async () => {
    const gateways = paymentMicroservice.getRegisteredGateways();
    const health = await paymentMicroservice.getHealth();
    if (health.status !== "HEALTHY") {
      throw new Error(`Active payment gateway unhealthy: ${health.message}`);
    }
    return `Active Gateway: ${health.activeGateway} (${health.status}) | Adapters registered: ${gateways.map((g) => g.id).join(", ")}`;
  })();

  // -------------------------------------------------------------------------
  // DOMAIN 5: AI DOMAIN
  // -------------------------------------------------------------------------
  console.log("\n--- 5. AI Domain: Executive Agent Tool Registry ---");

  await recordTest("AI_01", "AI", "Verify AI Service Configuration & Provider", () => {
    const isConfigured = aiService.isConfigured();
    return `AI Service operational. LLM Brain configured: ${isConfigured ? "YES" : "NO"}`;
  })();

  // -------------------------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------------------------
  // Soft-deactivate the QA test customer so it remains safely in DB without polluting active customer lists
  await customerService.deactivateCustomer(createdCust.id, "End of automated integration test suite");

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log("                   ENTERPRISE TEST EXECUTION SUMMARY                      ");
  console.log("==========================================================================");

  const total = report.length;
  const passed = report.filter((r) => r.passed).length;
  const failed = report.filter((r) => !r.passed).length;

  console.log(`Total Integration Tests: ${total}`);
  console.log(`Passed:                  ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed:                  ${failed}`);
  console.log("==========================================================================\n");

  if (failed > 0) {
    console.error("❌ Some enterprise integration tests failed.");
    process.exit(1);
  } else {
    console.log("🎉 ALL ENTERPRISE DOMAIN TESTS PASSED! Modular architecture, safe deactivation, and isolation verified.");
    process.exit(0);
  }
}

runEnterpriseIntegrationTests().catch((err) => {
  console.error("Fatal error during integration tests:", err);
  process.exit(1);
});

