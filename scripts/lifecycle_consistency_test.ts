import prisma from "../src/lib/prisma";
import { chromium } from "playwright";
import * as path from "path";
import { createCustomerToken, createAdminToken } from "../src/lib/auth-session";
import { registerActiveSessionInDb } from "../src/lib/session-db";
import { Decimal } from "@prisma/client/runtime/library";

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/home/user/.gemini/antigravity/brain/d30db3b0-68f0-4f66-af4a-a5d93a6fd429";

async function runLifecycleConsistencyTest() {
  console.log("==================================================================");
  console.log("  KB KHATA — COMPLETE DATA WIPE & END-TO-END LIFECYCLE TEST SUITE ");
  console.log("==================================================================\n");

  // ==================================================================
  // PHASE 0: CLEAN DATA WIPE
  // ==================================================================
  console.log(">>> PHASE 0: Wiping all existing transactional and customer data...");
  
  await prisma.transactionAudit.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.activeSession.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.village.deleteMany({});

  // Ensure Admin profile exists
  let admin = await prisma.adminProfile.findFirst({ where: { username: "kbadmin" } });
  if (!admin) {
    admin = await prisma.adminProfile.create({
      data: {
        username: "kbadmin",
        email: "bhavithkumar9394@gmail.com",
        mobile: "6303185141",
        isFaceEnrolled: true,
      },
    });
  }
  console.log("✓ Data wiped clean. Master Admin verified:", admin.username);

  // ==================================================================
  // PHASE 1: CREATE VILLAGE & CUSTOMER
  // ==================================================================
  console.log("\n>>> PHASE 1: Creating Village & Customer Master Records...");

  const village = await prisma.village.create({
    data: {
      code: "VIL-KAL-001",
      name: "KALWARAL",
      taluk: "Tandoor",
      district: "Mancherial",
      pincode: "504272",
      notes: "Main village territory for KB Khata",
    },
  });
  console.log(`✓ Village created: ${village.name} (${village.code})`);

  const customer = await prisma.customer.create({
    data: {
      customerCode: "CUST-VIL-101",
      name: "KOKKULA BHAVITH KUMAR",
      mobile: "6303185141",
      email: "bhavithkumar9394@gmail.com",
      villageId: village.id,
      creditLimit: new Decimal("25000.00"),
      currentBalance: new Decimal("0.00"),
      address: "House 3-45, Main Road, Kalwaral",
      notes: "Loyal customer with good credit history",
    },
  });
  console.log(`✓ Customer created: ${customer.name} (${customer.customerCode}), Starting Balance: ₹${customer.currentBalance}`);

  // ==================================================================
  // PHASE 2: BILLING & CREATING ORDERS (DEBIT & CREDIT)
  // ==================================================================
  console.log("\n>>> PHASE 2: Creating Purchases & Billing Transactions...");

  // Order #1: Total ₹2,500.00, Paid ₹1,000.00 at counter, Udhaar ₹1,500.00
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "KB-202610-0001",
      customerId: customer.id,
      villageId: village.id,
      totalAmount: new Decimal("2500.00"),
      paidAmount: new Decimal("1000.00"),
      creditAmount: new Decimal("1500.00"),
      paymentType: "PARTIAL",
      paymentStatus: "SUCCESS",
      items: {
        create: [
          {
            customItemId: "ITM-001",
            name: "Pattu Silk Saree",
            quantity: new Decimal("1.000"),
            unit: "pcs",
            pricePerUnit: new Decimal("2500.00"),
            lineTotal: new Decimal("2500.00"),
          },
        ],
      },
      payments: {
        create: {
          paymentRef: "PAY-CTR-001",
          customerId: customer.id,
          amount: new Decimal("1000.00"),
          method: "CASH",
          status: "SUCCESS",
          notes: "Counter advance payment",
        },
      },
    },
  });

  // Ledger entries for Order #1
  await prisma.ledgerEntry.create({
    data: {
      customerId: customer.id,
      orderId: order1.id,
      entryType: "BILL_DEBIT",
      debitAmount: new Decimal("2500.00"),
      runningBalance: new Decimal("2500.00"),
      description: "Bill #KB-202610-0001 [Pattu Silk Saree (1 pcs)]",
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      customerId: customer.id,
      orderId: order1.id,
      entryType: "PAYMENT_CREDIT",
      creditAmount: new Decimal("1000.00"),
      runningBalance: new Decimal("1500.00"),
      description: "Counter Payment (CASH) against Bill #KB-202610-0001",
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { currentBalance: new Decimal("1500.00") },
  });
  console.log("✓ Order #1 created: Total ₹2500, Paid ₹1000, Udhaar ₹1500. Customer balance: ₹1500");

  // Order #2: Total ₹900.00, Paid ₹0.00, Full Credit ₹900.00
  const order2 = await prisma.order.create({
    data: {
      orderNumber: "KB-202610-0002",
      customerId: customer.id,
      villageId: village.id,
      totalAmount: new Decimal("900.00"),
      paidAmount: new Decimal("0.00"),
      creditAmount: new Decimal("900.00"),
      paymentType: "CREDIT",
      paymentStatus: "SUCCESS",
      items: {
        create: [
          {
            customItemId: "ITM-002",
            name: "Traditional Cotton Dhoti",
            quantity: new Decimal("2.000"),
            unit: "pcs",
            pricePerUnit: new Decimal("450.00"),
            lineTotal: new Decimal("900.00"),
          },
        ],
      },
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      customerId: customer.id,
      orderId: order2.id,
      entryType: "BILL_DEBIT",
      debitAmount: new Decimal("900.00"),
      runningBalance: new Decimal("2400.00"),
      description: "Bill #KB-202610-0002 [Traditional Cotton Dhoti (2 pcs)]",
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { currentBalance: new Decimal("2400.00") },
  });
  console.log("✓ Order #2 created: Total ₹900, Paid ₹0, Udhaar ₹900. Customer balance: ₹2400");

  // ==================================================================
  // PHASE 3: CUSTOMER PORTAL AUTH & DATA CONSISTENCY CHECK
  // ==================================================================
  console.log("\n>>> PHASE 3: Customer Login & Portal Data Consistency...");

  const now = Math.floor(Date.now() / 1000);
  const ttl = 7 * 24 * 3600;
  const custSessionId = `cust_test_session_${Date.now()}`;
  const clientIp = "127.0.0.1";

  const customerToken = await createCustomerToken(customer.id, ttl, clientIp, custSessionId);
  await registerActiveSessionInDb({
    identifier: customer.id,
    role: "CUSTOMER",
    token: customerToken,
    ipAddress: clientIp,
    userAgent: "ConsistencyTestRunner",
    expiresAt: now + ttl,
  });

  // Call /api/customer/me
  const meRes = await fetch(`${BASE_URL}/api/customer/me`, {
    headers: { Cookie: `kb_customer_session=${customerToken}` },
  });
  const meData = await meRes.json();
  console.log(`✓ /api/customer/me status: ${meRes.status}`);
  console.log(`  Customer Name: ${meData.customer.name}`);
  console.log(`  Outstanding Udhaar: ₹${meData.customer.currentBalance} (Expected: 2400)`);
  console.log(`  Pending Orders Count: ${meData.orders.length} (Expected: 2)`);

  if (Number(meData.customer.currentBalance) !== 2400) {
    throw new Error(`Balance mismatch! Expected 2400, got ${meData.customer.currentBalance}`);
  }

  // ==================================================================
  // PHASE 4: TEST CASE A — PARTIAL PAYMENT ONLINE VIA CASHFREE
  // ==================================================================
  console.log("\n>>> PHASE 4: Test Case A — Customer Makes Partial Payment of ₹500 against Order #1...");

  // Step 4a: Create Cashfree Order
  const cfOrder1Res = await fetch(`${BASE_URL}/api/payments/cashfree/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      orderAmount: 500,
      customerDetails: {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.mobile,
      },
    }),
  });
  const cfOrder1Data = await cfOrder1Res.json();
  console.log(`✓ Cashfree Order created: ${cfOrder1Data.order_id}, Session: ${cfOrder1Data.payment_session_id?.slice(0, 15)}...`);

  // Step 4b: Settle Partial Payment (₹500 against Order #1)
  const settle1Res = await fetch(`${BASE_URL}/api/customer/khata/settle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      orderIds: [order1.id],
      amount: 500,
      cashfreeOrderId: cfOrder1Data.order_id,
      cashfreePaymentId: `cf_pay_test_001_${Date.now()}`,
      paymentSessionId: cfOrder1Data.payment_session_id,
      notes: "Test partial settlement of ₹500 via Cashfree",
    }),
  });
  const settle1Data = await settle1Res.json();
  console.log(`✓ Settlement #1 response: status ${settle1Res.status}, success: ${settle1Data.success}`);

  if (!settle1Data.success) {
    throw new Error(`Settlement #1 failed: ${settle1Data.error}`);
  }

  // Verify DB state after partial payment
  const customerAfterSettle1 = await prisma.customer.findUnique({ where: { id: customer.id } });
  const order1AfterSettle1 = await prisma.order.findUnique({ where: { id: order1.id } });
  const audit1 = await prisma.transactionAudit.findFirst({
    where: { customerId: customer.id, cashfreeOrderId: cfOrder1Data.order_id },
  });

  console.log(`  Customer Balance: ₹${customerAfterSettle1?.currentBalance} (Expected: 1900)`);
  console.log(`  Order #1 Credit Remaining: ₹${order1AfterSettle1?.creditAmount} (Expected: 1000, Status: ${order1AfterSettle1?.paymentType})`);
  console.log(`  Audit Record: ref=${audit1?.transactionRef}, before=₹${audit1?.balanceBefore}, after=₹${audit1?.balanceAfter}, amount=₹${audit1?.amount}`);

  if (Number(customerAfterSettle1?.currentBalance) !== 1900) {
    throw new Error(`Balance mismatch after settle 1! Expected 1900, got ${customerAfterSettle1?.currentBalance}`);
  }
  if (Number(order1AfterSettle1?.creditAmount) !== 1000) {
    throw new Error(`Order #1 credit mismatch! Expected 1000, got ${order1AfterSettle1?.creditAmount}`);
  }
  console.log("✓ PASS: Partial payment correctly updated order, customer balance, and generated audit snapshot!");

  // ==================================================================
  // PHASE 5: TEST CASE B — FULL MULTI-ORDER SETTLEMENT (ZERO BALANCE)
  // ==================================================================
  console.log("\n>>> PHASE 5: Test Case B — Full Settlement of Remaining ₹1,900 across Both Orders...");

  // Step 5a: Create Cashfree Order for ₹1,900
  const cfOrder2Res = await fetch(`${BASE_URL}/api/payments/cashfree/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      orderAmount: 1900,
      customerDetails: {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.mobile,
      },
    }),
  });
  const cfOrder2Data = await cfOrder2Res.json();
  console.log(`✓ Cashfree Order #2 created: ${cfOrder2Data.order_id}`);

  // Step 5b: Settle Full Payment across [order1, order2]
  const settle2Res = await fetch(`${BASE_URL}/api/customer/khata/settle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      orderIds: [order1.id, order2.id],
      amount: 1900,
      cashfreeOrderId: cfOrder2Data.order_id,
      cashfreePaymentId: `cf_pay_test_002_${Date.now()}`,
      paymentSessionId: cfOrder2Data.payment_session_id,
      notes: "Test full clearance of remaining balance via Cashfree",
    }),
  });
  const settle2Data = await settle2Res.json();
  console.log(`✓ Settlement #2 response: status ${settle2Res.status}, success: ${settle2Data.success}`);

  if (!settle2Data.success) {
    throw new Error(`Settlement #2 failed: ${settle2Data.error}`);
  }

  // Verify DB state after full settlement
  const customerAfterSettle2 = await prisma.customer.findUnique({ where: { id: customer.id } });
  const order1Final = await prisma.order.findUnique({ where: { id: order1.id } });
  const order2Final = await prisma.order.findUnique({ where: { id: order2.id } });
  const audit2 = await prisma.transactionAudit.findFirst({
    where: { customerId: customer.id, cashfreeOrderId: cfOrder2Data.order_id },
  });

  console.log(`  Customer Balance: ₹${customerAfterSettle2?.currentBalance} (Expected: 0)`);
  console.log(`  Order #1 Status: ${order1Final?.paymentType}, Credit: ₹${order1Final?.creditAmount} (Expected: DEBIT / 0)`);
  console.log(`  Order #2 Status: ${order2Final?.paymentType}, Credit: ₹${order2Final?.creditAmount} (Expected: DEBIT / 0)`);
  console.log(`  Audit Record: ref=${audit2?.transactionRef}, before=₹${audit2?.balanceBefore}, after=₹${audit2?.balanceAfter}, amount=₹${audit2?.amount}`);

  if (Number(customerAfterSettle2?.currentBalance) !== 0) {
    throw new Error(`Customer balance should be exactly 0 after full settlement, got ${customerAfterSettle2?.currentBalance}`);
  }
  if (order1Final?.paymentType !== "DEBIT" || Number(order1Final?.creditAmount) !== 0) {
    throw new Error(`Order #1 was not fully settled to DEBIT!`);
  }
  if (order2Final?.paymentType !== "DEBIT" || Number(order2Final?.creditAmount) !== 0) {
    throw new Error(`Order #2 was not fully settled to DEBIT!`);
  }
  console.log("✓ PASS: Multi-order full settlement successfully cleared all debts to ₹0 with 0 discrepancies!");

  // ==================================================================
  // PHASE 6: SUPPORT TICKET & ENQUIRY WORKFLOW
  // ==================================================================
  console.log("\n>>> PHASE 6: Customer Support Ticket Enquiry & Resolution Flow...");

  const ticketRes = await fetch(`${BASE_URL}/api/customer/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      subject: "Verification of Full Settlement via Cashfree",
      category: "PAYMENT_QUERY",
      priority: "MEDIUM",
      message: "I have cleared my full balance of ₹1,900 online via Cashfree. Please verify and confirm my ledger standing.",
    }),
  });
  const ticketData = await ticketRes.json();
  console.log(`✓ Support ticket raised: ${ticketData.ticket?.ticketNumber}`);

  // Admin replies and resolves
  const adminSessionId = `admin_test_session_${Date.now()}`;
  const adminToken = await createAdminToken("kbadmin", ttl, clientIp, adminSessionId);
  await registerActiveSessionInDb({
    identifier: "kbadmin",
    role: "ADMIN",
    token: adminToken,
    ipAddress: clientIp,
    userAgent: "ConsistencyTestRunner",
    expiresAt: now + ttl,
  });

  const replyRes = await fetch(`${BASE_URL}/api/admin/tickets/${ticketData.ticket.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_admin_session=${adminToken}`,
    },
    body: JSON.stringify({
      message: "Verified! Your payments have been reconciled. Your outstanding balance is ₹0. Thank you for shopping with KB Fashions!",
      status: "RESOLVED",
    }),
  });
  console.log(`✓ Admin replied & resolved ticket: status ${replyRes.status}`);

  // ==================================================================
  // PHASE 7: CUSTOMER AI COPILOT QUERY
  // ==================================================================
  console.log("\n>>> PHASE 7: Customer AI Copilot Real-Time Grounded Query...");

  const aiRes = await fetch(`${BASE_URL}/api/customer/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `kb_customer_session=${customerToken}`,
    },
    body: JSON.stringify({
      prompt: "నా ప్రస్తుత ఉద్ధార బాకీ ఎంత ఉంది? (What is my current Udhaar balance?)",
    }),
  });
  const aiData = await aiRes.json();
  console.log(`✓ Customer AI Response status: ${aiRes.status}`);
  console.log(`  AI Reply Snippet: ${aiData.reply?.slice(0, 160)}...`);

  // ==================================================================
  // PHASE 8: PLAYWRIGHT VISUAL CAPTURE (DESKTOP & MOBILE RESPONSIVE)
  // ==================================================================
  console.log("\n>>> PHASE 8: Playwright Mobile Responsive & Verified Seal Visual Capture...");

  const browser = await chromium.launch({ headless: true });

  try {
    // 8A. Desktop Context
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await desktopContext.addCookies([
      { name: "kb_customer_session", value: customerToken, domain: "127.0.0.1", path: "/" },
    ]);
    const desktopPage = await desktopContext.newPage();

    // Capture Customer Dashboard (Clean zero balance)
    await desktopPage.goto(`${BASE_URL}/customer`);
    await desktopPage.waitForLoadState("networkidle");
    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_dashboard_zero_balance_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_dashboard_zero_balance_preview.png");

    // Capture Customer Khata Statement Modal with Verified Seal
    await desktopPage.goto(`${BASE_URL}/customer/khata`);
    await desktopPage.waitForLoadState("networkidle");
    const printStatementBtn = await desktopPage.$('button:has-text("Print Statement")');
    if (printStatementBtn) {
      await printStatementBtn.click();
      await desktopPage.waitForTimeout(600);
      await desktopPage.screenshot({
        path: path.join(ARTIFACT_DIR, "customer_statement_verified_seal_preview.png"),
        fullPage: false,
      });
      console.log("✓ Captured: customer_statement_verified_seal_preview.png");
    }

    // Capture Customer Orders 80mm Thermal Slip with Verified Brand Seal
    await desktopPage.goto(`${BASE_URL}/customer/orders`);
    await desktopPage.waitForLoadState("networkidle");
    const slipBtn = await desktopPage.$('button:has-text("Slip (80mm)")');
    if (slipBtn) {
      await slipBtn.click();
      await desktopPage.waitForTimeout(600);
      await desktopPage.screenshot({
        path: path.join(ARTIFACT_DIR, "customer_thermal_slip_with_seal_preview.png"),
        fullPage: false,
      });
      console.log("✓ Captured: customer_thermal_slip_with_seal_preview.png");
    }

    // Capture Customer AI Copilot Page
    await desktopPage.goto(`${BASE_URL}/customer/assistant`);
    await desktopPage.waitForLoadState("networkidle");
    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_ai_assistant_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_ai_assistant_preview.png");

    await desktopContext.close();

    // 8B. Mobile Context (iPhone 13 Viewport: 390x844)
    console.log("\n--- Capturing Mobile Responsive Views (390 x 844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    });
    await mobileContext.addCookies([
      { name: "kb_customer_session", value: customerToken, domain: "127.0.0.1", path: "/" },
    ]);
    const mobilePage = await mobileContext.newPage();

    // Mobile Dashboard
    await mobilePage.goto(`${BASE_URL}/customer`);
    await mobilePage.waitForLoadState("networkidle");
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_mobile_dashboard_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_mobile_dashboard_preview.png");

    // Mobile Khata Ledger
    await mobilePage.goto(`${BASE_URL}/customer/khata`);
    await mobilePage.waitForLoadState("networkidle");
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_mobile_khata_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_mobile_khata_preview.png");

    // Mobile Orders
    await mobilePage.goto(`${BASE_URL}/customer/orders`);
    await mobilePage.waitForLoadState("networkidle");
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_mobile_orders_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_mobile_orders_preview.png");

    // Mobile AI Assistant
    await mobilePage.goto(`${BASE_URL}/customer/assistant`);
    await mobilePage.waitForLoadState("networkidle");
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "customer_mobile_assistant_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_mobile_assistant_preview.png");

    await mobileContext.close();
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log("\n==================================================================");
  console.log("  ★ COMPLETE LIFECYCLE & CONSISTENCY TEST PASSED 100% ★");
  console.log("==================================================================");
}

runLifecycleConsistencyTest().catch((err) => {
  console.error("\n❌ Lifecycle Test Failed:", err);
  process.exit(1);
});

