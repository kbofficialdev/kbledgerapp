import { chromium } from "playwright";

interface RouteAuditResult {
  route: string;
  authenticated: boolean;
  finalUrl: string;
  status: number;
  consoleErrors: string[];
  pageErrors: string[];
  passed: boolean;
}

async function runConsoleAudit() {
  console.log("==========================================================================");
  console.log("       KB KHATA & FASHIONS - PLAYWRIGHT CONSOLE & HYDRATION AUDIT         ");
  console.log("       Crawling all UI pages to ensure zero runtime or console errors     ");
  console.log("==========================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const results: RouteAuditResult[] = [];

  // Phase 1: Unauthenticated Route Guards
  console.log(">> [Phase 1/2] Verifying Unauthenticated Access Guards...");
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

    unauthPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    unauthPage.on("pageerror", (err) => pageErrors.push(err.message));

    const response = await unauthPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const finalUrl = unauthPage.url();
    const redirectedToLogin = finalUrl.includes("/admin/login");

    const passed = redirectedToLogin;
    results.push({
      route,
      authenticated: false,
      finalUrl,
      status: response?.status() || 0,
      consoleErrors,
      pageErrors,
      passed,
    });

    console.log(`   ${passed ? "✓ [PASS]" : "✗ [FAIL]"} Unauthenticated ${route} -> ${redirectedToLogin ? "Redirected to /admin/login" : "UNPROTECTED: " + finalUrl}`);
  }

  // Phase 1b: Verify Public Entry Pages (Unauthenticated)
  console.log("\n>> [Phase 1b] Verifying Public Entry Pages (Zero Console & Hydration Errors)...");
  const publicRoutes = ["/admin/login", "/portal/login", "/portal"];
  for (const route of publicRoutes) {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    const consoleHandler = (msg: any) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("mediaDevices") && !text.includes("getUserMedia") && !text.includes("Requested device not found")) {
          consoleErrors.push(text);
        }
      }
    };
    const pageErrorHandler = (err: any) => {
      pageErrors.push(err.message);
    };

    unauthPage.on("console", consoleHandler);
    unauthPage.on("pageerror", pageErrorHandler);

    const response = await unauthPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const finalUrl = unauthPage.url();

    const hasHydrationError = consoleErrors.some((e) =>
      e.includes("425") || e.includes("418") || e.includes("423") || e.includes("Hydration")
    );
    const isClean = consoleErrors.length === 0 && pageErrors.length === 0 && !hasHydrationError;

    results.push({
      route,
      authenticated: false,
      finalUrl,
      status: response?.status() || 0,
      consoleErrors,
      pageErrors,
      passed: isClean,
    });

    console.log(`   ${isClean ? "✓ [PASS]" : "✗ [FAIL]"} Public ${route} -> Clean render (0 console errors, 0 hydration errors, HTTP ${response?.status()})`);

    unauthPage.off("console", consoleHandler);
    unauthPage.off("pageerror", pageErrorHandler);
  }

  // Phase 2: Authenticated Route Console & Hydration Verification
  console.log("\n>> [Phase 2/2] Verifying Authenticated Routes (Zero Console & Hydration Errors)...");
  const authContext = await browser.newContext();

  // Inject valid admin session cookie
  await authContext.addCookies([
    {
      name: "kb_admin_session",
      value: "kb_adm_verified_playwright_audit_session_2026",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const authPage = await authContext.newPage();

  // Also set localStorage for client session consistency
  await authPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await authPage.evaluate(() => {
    localStorage.setItem("kb_admin_session", "kb_adm_verified_playwright_audit_session_2026");
  });

  const routesToAudit = [
    "/",
    "/admin/ai",
    "/orders",
    "/orders/new",
    "/villages",
    "/customers",
    "/ledger",
    "/payments",
    "/reports",
    "/presentation",
  ];

  for (const route of routesToAudit) {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    const consoleHandler = (msg: any) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore expected camera not found warnings in headless environment
        if (!text.includes("mediaDevices") && !text.includes("getUserMedia") && !text.includes("Requested device not found")) {
          consoleErrors.push(text);
        }
      }
    };
    const pageErrorHandler = (err: any) => {
      pageErrors.push(err.message);
    };

    authPage.on("console", consoleHandler);
    authPage.on("pageerror", pageErrorHandler);

    const response = await authPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const finalUrl = authPage.url();

    // Check for React Hydration errors (#418, #423, #425)
    const hasHydrationError = consoleErrors.some((e) =>
      e.includes("425") || e.includes("418") || e.includes("423") || e.includes("Hydration")
    );

    const isClean = consoleErrors.length === 0 && pageErrors.length === 0 && !hasHydrationError;

    results.push({
      route,
      authenticated: true,
      finalUrl,
      status: response?.status() || 0,
      consoleErrors,
      pageErrors,
      passed: isClean,
    });

    if (isClean) {
      console.log(`   ✓ [PASS] ${route} -> Clean render (0 console errors, 0 hydration errors, HTTP ${response?.status()})`);
    } else {
      console.error(`   ✗ [FAIL] ${route} -> Errors detected!`);
      if (consoleErrors.length > 0) console.error(`     Console Errors:`, consoleErrors);
      if (pageErrors.length > 0) console.error(`     Page Errors:`, pageErrors);
    }

    authPage.off("console", consoleHandler);
    authPage.off("pageerror", pageErrorHandler);
  }

  await browser.close();

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
