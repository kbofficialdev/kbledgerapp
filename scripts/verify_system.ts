import { chromium } from "playwright";
import prisma from "../src/lib/prisma";
import * as path from "path";
import { createAdminToken, createCustomerToken } from "../src/lib/auth-session";
import { registerActiveSessionInDb } from "../src/lib/session-db";

async function runVerification() {
  console.log("=== KB KHATA FULL END-TO-END VERIFICATION SUITE ===\n");

  // 1. Get test admin and customer from database
  const admin = await prisma.adminProfile.findFirst({ where: { username: "kbadmin" } });
  const customer = await prisma.customer.findFirst({ where: { email: "bhavithkumar9394@gmail.com" } });

  if (!admin || !customer) {
    throw new Error("Test admin or customer not found in DB!");
  }
  console.log(`[DB Check] Admin: ${admin.username} (${admin.id})`);
  console.log(`[DB Check] Customer: ${customer.name} (${customer.id}, ${customer.customerCode})`);

  const clientIp = "127.0.0.1";
  const now = Math.floor(Date.now() / 1000);
  const ttl = 7 * 24 * 3600;

  // Create Admin Token & Register Active Session
  const adminSessionId = `admin_sess_verify_${Date.now()}`;
  const adminToken = await createAdminToken("kbadmin", ttl, clientIp, adminSessionId);
  await registerActiveSessionInDb({
    identifier: "kbadmin",
    role: "ADMIN",
    token: adminToken,
    ipAddress: clientIp,
    userAgent: "Playwright-Verification",
    expiresAt: now + ttl,
  });
  console.log("[Auth] Admin token created & registered in ActiveSession DB.");

  // Create Customer Token & Register Active Session
  const customerSessionId = `cust_sess_verify_${Date.now()}`;
  const customerToken = await createCustomerToken(customer.id, ttl, clientIp, customerSessionId);
  await registerActiveSessionInDb({
    identifier: customer.id,
    role: "CUSTOMER",
    token: customerToken,
    ipAddress: clientIp,
    userAgent: "Playwright-Verification",
    expiresAt: now + ttl,
  });
  console.log("[Auth] Customer token created & registered in ActiveSession DB.");

  // Launch Playwright Chromium
  const browser = await chromium.launch({ headless: true });
  const artifactDir = "/home/user/.gemini/antigravity/brain/d30db3b0-68f0-4f66-af4a-a5d93a6fd429";

  try {
    // TEST 1: Guest visiting / should redirect to /login
    console.log("\n--- Test 1: Guest visiting / ---");
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto("http://127.0.0.1:3000/");
    const guestUrl = guestPage.url();
    console.log(`Guest at / redirected to: ${guestUrl}`);
    if (!guestUrl.includes("/login")) {
      throw new Error(`Expected guest to be redirected to /login, got ${guestUrl}`);
    }
    console.log("✓ PASS: Guest automatically redirected to /login");
    await guestContext.close();

    // TEST 2: Customer auto-redirect on / and /login
    console.log("\n--- Test 2: Customer Session Auto-Redirects ---");
    const customerContext = await browser.newContext();
    await customerContext.addCookies([
      {
        name: "kb_customer_session",
        value: customerToken,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const customerPage = await customerContext.newPage();

    // Visit /
    await customerPage.goto("http://127.0.0.1:3000/");
    console.log(`Customer visiting / redirected to: ${customerPage.url()}`);
    if (!customerPage.url().includes("/customer")) {
      throw new Error(`Expected customer visiting / to redirect to /customer, got ${customerPage.url()}`);
    }
    console.log("✓ PASS: Customer at / redirected to /customer");

    // Visit /login
    await customerPage.goto("http://127.0.0.1:3000/login");
    console.log(`Customer visiting /login redirected to: ${customerPage.url()}`);
    if (!customerPage.url().includes("/customer")) {
      throw new Error(`Expected customer visiting /login to redirect to /customer, got ${customerPage.url()}`);
    }
    console.log("✓ PASS: Customer at /login redirected to /customer");

    // TEST 3: Customer accessing /admin should be blocked/redirected to /customer
    console.log("\n--- Test 3: Route Segregation & Unauthorized Denial ---");
    await customerPage.goto("http://127.0.0.1:3000/admin");
    console.log(`Customer accessing /admin redirected to: ${customerPage.url()}`);
    if (customerPage.url().includes("/admin") && !customerPage.url().includes("/admin/login")) {
      throw new Error(`SECURITY BREACH: Customer was not denied access to /admin!`);
    }
    console.log("✓ PASS: Customer denied access to /admin and safely redirected to /customer");

    // TEST 4: Capture Customer Portal Pages
    console.log("\n--- Test 4: Customer Portal Pages & Visual Capture ---");

    // 4a. /customer
    await customerPage.goto("http://127.0.0.1:3000/customer");
    await customerPage.waitForLoadState("networkidle");
    await customerPage.screenshot({
      path: path.join(artifactDir, "customer_analytical_dashboard_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_analytical_dashboard_preview.png");

    // 4b. /customer/khata
    await customerPage.goto("http://127.0.0.1:3000/customer/khata");
    await customerPage.waitForLoadState("networkidle");
    await customerPage.screenshot({
      path: path.join(artifactDir, "customer_khata_settlement_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_khata_settlement_preview.png");

    // 4c. /customer/orders
    await customerPage.goto("http://127.0.0.1:3000/customer/orders");
    await customerPage.waitForLoadState("networkidle");
    await customerPage.screenshot({
      path: path.join(artifactDir, "customer_orders_directory_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_orders_directory_preview.png");

    // Click on 80mm slip button if available
    const printButtons = await customerPage.$$('button:has-text("80mm")');
    if (printButtons.length > 0) {
      await printButtons[0].click();
      await customerPage.waitForTimeout(1000);
      await customerPage.screenshot({
        path: path.join(artifactDir, "customer_thermal_slip_receipt_preview.png"),
        fullPage: false,
      });
      console.log("✓ Captured: customer_thermal_slip_receipt_preview.png");
    }

    // 4d. /customer/tickets
    await customerPage.goto("http://127.0.0.1:3000/customer/tickets");
    await customerPage.waitForLoadState("networkidle");
    await customerPage.screenshot({
      path: path.join(artifactDir, "customer_tickets_desk_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: customer_tickets_desk_preview.png");

    await customerContext.close();

    // TEST 5: Admin Session & Admin Pages Capture
    console.log("\n--- Test 5: Admin Session & Pages Capture ---");
    const adminContext = await browser.newContext();
    await adminContext.addInitScript(() => {
      localStorage.setItem("kb_grand_opening_tour_seen_v2", "true");
    });
    await adminContext.addCookies([
      {
        name: "kb_admin_session",
        value: adminToken,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const adminPage = await adminContext.newPage();

    // Visit /
    await adminPage.goto("http://127.0.0.1:3000/");
    console.log(`Admin visiting / redirected to: ${adminPage.url()}`);
    if (!adminPage.url().includes("/admin")) {
      throw new Error(`Expected admin visiting / to redirect to /admin, got ${adminPage.url()}`);
    }
    console.log("✓ PASS: Admin at / redirected to /admin");

    // 5a. /admin/tickets
    await adminPage.goto("http://127.0.0.1:3000/admin/tickets");
    await adminPage.waitForLoadState("networkidle");
    await adminPage.screenshot({
      path: path.join(artifactDir, "admin_tickets_desk_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: admin_tickets_desk_preview.png");

    // 5b. /admin/reports/village-collection
    await adminPage.goto("http://127.0.0.1:3000/admin/reports/village-collection");
    await adminPage.waitForLoadState("networkidle");
    await adminPage.screenshot({
      path: path.join(artifactDir, "admin_village_collection_sheet_preview.png"),
      fullPage: true,
    });
    console.log("✓ Captured: admin_village_collection_sheet_preview.png");

    await adminContext.close();

    // TEST 6: One IP, One Session, One Account Enforcement
    console.log("\n--- Test 6: One IP, One Session Concurrency Enforcement ---");
    const session1Id = `sess_concurrent_1_${Date.now()}`;
    const token1 = await createCustomerToken(customer.id, ttl, "192.168.1.100", session1Id);
    await registerActiveSessionInDb({
      identifier: customer.id,
      role: "CUSTOMER",
      token: token1,
      ipAddress: "192.168.1.100",
      userAgent: "Device-A",
      expiresAt: now + ttl,
    });

    const activeSessionsBefore = await prisma.activeSession.findMany({
      where: { identifier: customer.id, isActive: true },
    });
    console.log(`Active sessions for ${customer.id} after Device-A login: ${activeSessionsBefore.length}`);
    if (activeSessionsBefore.length !== 1 || activeSessionsBefore[0].ipAddress !== "192.168.1.100") {
      throw new Error("Device-A session was not registered properly!");
    }

    // Now log in from Device-B (different IP / session)
    const session2Id = `sess_concurrent_2_${Date.now()}`;
    const token2 = await createCustomerToken(customer.id, ttl, "192.168.1.200", session2Id);
    await registerActiveSessionInDb({
      identifier: customer.id,
      role: "CUSTOMER",
      token: token2,
      ipAddress: "192.168.1.200",
      userAgent: "Device-B",
      expiresAt: now + ttl,
    });

    const activeSessionsAfter = await prisma.activeSession.findMany({
      where: { identifier: customer.id, isActive: true },
    });
    console.log(`Active sessions for ${customer.id} after Device-B login: ${activeSessionsAfter.length}`);
    if (activeSessionsAfter.length !== 1 || activeSessionsAfter[0].ipAddress !== "192.168.1.200") {
      throw new Error("Device-B login failed to invalidate previous session!");
    }

    const invalidatedSession = await prisma.activeSession.findFirst({
      where: { identifier: customer.id, ipAddress: "192.168.1.100" },
    });
    console.log(`Device-A session isActive status: ${invalidatedSession?.isActive}`);
    if (invalidatedSession?.isActive !== false) {
      throw new Error("Previous session was not marked inactive!");
    }
    console.log("✓ PASS: One IP, One Session, One Account strictly enforced! Previous session revoked instantly.");

    console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error("\n❌ Verification Failed:", err);
  process.exit(1);
});
