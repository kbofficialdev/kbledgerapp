import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { chromium } from "playwright";

interface RouteAuditResult {
  route: string;
  role: "UNAUTH" | "PUBLIC" | "ADMIN" | "CUSTOMER";
  finalUrl: string;
  status: number;
  consoleErrors: string[];
  consoleWarnings: string[];
  consoleLogs: string[];
  pageErrors: string[];
  failedResponses: string[];
  passed: boolean;
}

async function runConsoleAudit() {
  console.log("==========================================================================");
  console.log("       KB KHATA & FASHIONS - PLAYWRIGHT CONSOLE & HYDRATION AUDIT         ");
  console.log("       Crawling all UI pages to ensure zero runtime or console errors     ");
  console.log("==========================================================================\n");

  const { prisma } = await import("../src/lib/prisma");
  const { createAdminToken, createCustomerToken } = await import("../src/lib/auth-session");
  const { registerActiveSessionInDb, invalidateSessionInDb } = await import("../src/lib/session-db");

  const adminToken = await createAdminToken("ADMIN_CONSOLE_AUDIT", 3600, "127.0.0.1");
  await registerActiveSessionInDb({
    identifier: "ADMIN_CONSOLE_AUDIT",
    role: "ADMIN",
    token: adminToken,
    ipAddress: "127.0.0.1",
    userAgent: "Playwright-Audit",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  });

  const sampleCustomer = await prisma.customer.findFirst({ include: { village: true } });
  let customerToken = "";
  if (sampleCustomer) {
    customerToken = await createCustomerToken(
      sampleCustomer.id,
      sampleCustomer.mobile,
      sampleCustomer.customerCode,
      3600,
      "127.0.0.1"
    );
    await registerActiveSessionInDb({
      identifier: sampleCustomer.id,
      role: "CUSTOMER",
      token: customerToken,
      ipAddress: "127.0.0.1",
      userAgent: "Playwright-Audit",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const results: RouteAuditResult[] = [];

  try {
    // Phase 1: Unauthenticated Route Guards
    console.log(">> [Phase 1/4] Verifying Unauthenticated Access Guards...");
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();

    const protectedRoutes = [
      "/",
      "/orders",
      "/orders/new",
      "/villages",
      "/customers",
      "/ledger",
      "/payments",
      "/reports",
      "/admin",
    ];

    for (const route of protectedRoutes) {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      const onConsole = (msg: any) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      };
      const onPageError = (err: any) => pageErrors.push(err.message);

      unauthPage.on("console", onConsole);
      unauthPage.on("pageerror", onPageError);

      const response = await unauthPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const finalUrl = unauthPage.url();
      const redirectedToLogin =
        finalUrl.includes("/login") || finalUrl.includes("/admin/login") || finalUrl.includes("/customer/login");

      results.push({
        route,
        role: "UNAUTH",
        finalUrl,
        status: response?.status() || 0,
        consoleErrors,
        consoleWarnings: [],
        consoleLogs: [],
        pageErrors,
        failedResponses: [],
        passed: redirectedToLogin && consoleErrors.length === 0 && pageErrors.length === 0,
      });

      console.log(
        `   ${redirectedToLogin ? "✓ [PASS]" : "✗ [FAIL]"} Unauthenticated ${route} -> ${finalUrl} (errs: ${consoleErrors.length})`
      );

      unauthPage.off("console", onConsole);
      unauthPage.off("pageerror", onPageError);
    }

    // Phase 2: Public Entry Pages
    console.log("\n>> [Phase 2/4] Verifying Public Entry Pages...");
    const publicRoutes = ["/login", "/admin/login", "/customer/login", "/portal/login", "/portal", "/presentation"];
    for (const route of publicRoutes) {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const consoleLogs: string[] = [];
      const pageErrors: string[] = [];
      const failedResponses: string[] = [];

      const onConsole = (msg: any) => {
        const text = msg.text();
        if (msg.type() === "error") consoleErrors.push(text);
        else if (msg.type() === "warning") consoleWarnings.push(text);
        else if (msg.type() === "log") consoleLogs.push(text);
      };
      const onPageError = (err: any) => pageErrors.push(err.message);
      const onResponse = (res: any) => {
        if (res.status() >= 400 && !res.url().includes("favicon")) {
          failedResponses.push(`${res.status()} ${res.url()}`);
        }
      };

      unauthPage.on("console", onConsole);
      unauthPage.on("pageerror", onPageError);
      unauthPage.on("response", onResponse);

      const response = await unauthPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const finalUrl = unauthPage.url();
      const isClean = consoleErrors.length === 0 && pageErrors.length === 0 && failedResponses.length === 0;

      results.push({
        route,
        role: "PUBLIC",
        finalUrl,
        status: response?.status() || 0,
        consoleErrors,
        consoleWarnings,
        consoleLogs,
        pageErrors,
        failedResponses,
        passed: isClean,
      });

      console.log(
        `   ${isClean ? "✓ [PASS]" : "✗ [FAIL]"} Public ${route} -> errs=${consoleErrors.length}, logs=${consoleLogs.length}, badHttp=${failedResponses.length}`
      );
      if (!isClean || consoleLogs.length > 0) {
        if (consoleErrors.length) console.log("     Console Errors:", consoleErrors);
        if (failedResponses.length) console.log("     Failed HTTP:", failedResponses);
        if (consoleLogs.length) console.log("     Console Logs:", consoleLogs);
      }

      unauthPage.off("console", onConsole);
      unauthPage.off("pageerror", onPageError);
      unauthPage.off("response", onResponse);
    }

    // Phase 3: Admin Authenticated Routes
    console.log("\n>> [Phase 3/4] Verifying Admin Routes...");
    const adminContext = await browser.newContext();
    await adminContext.addCookies([
      {
        name: "kb_admin_session",
        value: adminToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    if (sampleCustomer) {
      const plainCust = {
        id: sampleCustomer.id,
        name: sampleCustomer.name,
        customerCode: sampleCustomer.customerCode,
        mobile: sampleCustomer.mobile,
        villageId: sampleCustomer.villageId,
        villageName: sampleCustomer.village.name,
        currentBalance: Number(sampleCustomer.currentBalance || 0),
        creditLimit: Number(sampleCustomer.creditLimit || 25000),
      };
      await adminPage.evaluate((cust) => {
        sessionStorage.setItem(
          "kb_active_billing_slip",
          JSON.stringify({
            villageId: cust.villageId,
            villageName: cust.villageName,
            customerId: cust.id,
            customerName: cust.name,
            customerCode: cust.customerCode,
            customerMobile: cust.mobile,
            currentBalance: cust.currentBalance,
            creditLimit: cust.creditLimit,
            items: [
              {
                id: "item-1",
                customItemId: "ITM-101",
                name: "Cotton Saree",
                quantity: 1,
                unit: "pcs",
                pricePerUnit: 850,
                lineTotal: 850,
              },
            ],
            subtotal: 850,
            grandTotal: 850,
          })
        );
        sessionStorage.setItem(
          "kb_last_receipt",
          JSON.stringify({
            orderId: "ord-1",
            orderNumber: "ORD-TEST-101",
            orderDate: new Date().toISOString(),
            customerName: cust.name,
            customerCode: cust.customerCode,
            customerMobile: cust.mobile,
            villageName: cust.villageName,
            items: [
              {
                id: "item-1",
                customItemId: "ITM-101",
                name: "Cotton Saree",
                quantity: 1,
                unit: "pcs",
                pricePerUnit: 850,
                lineTotal: 850,
              },
            ],
            subtotal: 850,
            totalAmount: 850,
            paidAmount: 850,
            creditAmount: 0,
            paymentType: "DEBIT",
            paymentMethod: "CASH",
            previousBalance: cust.currentBalance,
            newBalance: cust.currentBalance,
          })
        );
      }, plainCust);
    }

    const adminRoutes = [
      "/admin",
      "/admin/billing",
      "/admin/billing/payment",
      "/admin/billing/receipt",
      "/admin/customers",
      "/admin/payments",
      "/admin/reports",
      "/admin/reports/village-collection",
      "/admin/tickets",
      "/admin/ai",
      "/admin/security",
      "/admin/register",
      "/ledger",
      "/assistant",
    ];

    for (const route of adminRoutes) {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const consoleLogs: string[] = [];
      const pageErrors: string[] = [];
      const failedResponses: string[] = [];

      const onConsole = (msg: any) => {
        const text = msg.text();
        if (msg.type() === "error") consoleErrors.push(text);
        else if (msg.type() === "warning") consoleWarnings.push(text);
        else if (msg.type() === "log") consoleLogs.push(text);
      };
      const onPageError = (err: any) => pageErrors.push(err.message);
      const onResponse = (res: any) => {
        if (res.status() >= 400 && !res.url().includes("favicon")) {
          failedResponses.push(`${res.status()} ${res.url()}`);
        }
      };

      adminPage.on("console", onConsole);
      adminPage.on("pageerror", onPageError);
      adminPage.on("response", onResponse);

      const response = await adminPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const finalUrl = adminPage.url();
      const isClean = consoleErrors.length === 0 && pageErrors.length === 0 && failedResponses.length === 0;

      results.push({
        route,
        role: "ADMIN",
        finalUrl,
        status: response?.status() || 0,
        consoleErrors,
        consoleWarnings,
        consoleLogs,
        pageErrors,
        failedResponses,
        passed: isClean,
      });

      console.log(
        `   ${isClean ? "✓ [PASS]" : "✗ [FAIL]"} Admin ${route} -> errs=${consoleErrors.length}, logs=${consoleLogs.length}, badHttp=${failedResponses.length}`
      );
      if (!isClean || consoleLogs.length > 0) {
        if (consoleErrors.length) console.log("     Console Errors:", consoleErrors);
        if (pageErrors.length) console.log("     Page Errors:", pageErrors);
        if (failedResponses.length) console.log("     Failed HTTP:", failedResponses);
        if (consoleLogs.length) console.log("     Console Logs:", consoleLogs);
      }

      adminPage.off("console", onConsole);
      adminPage.off("pageerror", onPageError);
      adminPage.off("response", onResponse);
    }

    // Phase 4: Customer Authenticated Routes
    if (customerToken) {
      console.log("\n>> [Phase 4/4] Verifying Customer Routes...");
      const customerContext = await browser.newContext();
      await customerContext.addCookies([
        {
          name: "kb_customer_session",
          value: customerToken,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);
      const customerPage = await customerContext.newPage();

      const customerRoutes = [
        "/customer",
        "/customer/khata",
        "/customer/orders",
        "/customer/pay",
        "/customer/tickets",
        "/customer/assistant",
      ];

      for (const route of customerRoutes) {
        const consoleErrors: string[] = [];
        const consoleWarnings: string[] = [];
        const consoleLogs: string[] = [];
        const pageErrors: string[] = [];
        const failedResponses: string[] = [];

        const onConsole = (msg: any) => {
          const text = msg.text();
          if (msg.type() === "error") consoleErrors.push(text);
          else if (msg.type() === "warning") consoleWarnings.push(text);
          else if (msg.type() === "log") consoleLogs.push(text);
        };
        const onPageError = (err: any) => pageErrors.push(err.message);
        const onResponse = (res: any) => {
          if (res.status() >= 400 && !res.url().includes("favicon")) {
            failedResponses.push(`${res.status()} ${res.url()}`);
          }
        };

        customerPage.on("console", onConsole);
        customerPage.on("pageerror", onPageError);
        customerPage.on("response", onResponse);

        const response = await customerPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        const finalUrl = customerPage.url();
        const isClean = consoleErrors.length === 0 && pageErrors.length === 0 && failedResponses.length === 0;

        results.push({
          route,
          role: "CUSTOMER",
          finalUrl,
          status: response?.status() || 0,
          consoleErrors,
          consoleWarnings,
          consoleLogs,
          pageErrors,
          failedResponses,
          passed: isClean,
        });

        console.log(
          `   ${isClean ? "✓ [PASS]" : "✗ [FAIL]"} Customer ${route} -> errs=${consoleErrors.length}, logs=${consoleLogs.length}, badHttp=${failedResponses.length}`
        );
        if (!isClean || consoleLogs.length > 0) {
          if (consoleErrors.length) console.log("     Console Errors:", consoleErrors);
          if (pageErrors.length) console.log("     Page Errors:", pageErrors);
          if (failedResponses.length) console.log("     Failed HTTP:", failedResponses);
          if (consoleLogs.length) console.log("     Console Logs:", consoleLogs);
        }

        customerPage.off("console", onConsole);
        customerPage.off("pageerror", onPageError);
        customerPage.off("response", onResponse);
      }
    }
  } finally {
    await browser.close();
    await invalidateSessionInDb(adminToken);
    if (customerToken) await invalidateSessionInDb(customerToken);
    await prisma.$disconnect();
  }

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log("\n==========================================================================");
  console.log("                     PLAYWRIGHT AUDIT SUMMARY                             ");
  console.log("==========================================================================");
  console.log(`Total Routes Audited : ${total}`);
  console.log(`Passed Routes        : ${passedCount} (${Math.round((passedCount / total) * 100)}%)`);
  console.log(`Failed Routes        : ${failedCount}`);
  console.log("==========================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("SUCCESS: 100% of all UI routes are error-free and hydration-clean!\n");
    process.exit(0);
  }
}

runConsoleAudit().catch((err) => {
  console.error("Fatal Playwright test runner error:", err);
  process.exit(1);
});
