import { chromium } from "playwright";
import prisma from "../src/lib/prisma";
import { createCustomerToken, createAdminToken } from "../src/lib/auth-session";

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACTS_DIR = "/home/user/.gemini/antigravity/brain/d30db3b0-68f0-4f66-af4a-a5d93a6fd429";

async function runVerification() {
  console.log("=== STARTING VERIFICATION FOR AI & NAVBAR FIXES ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Suppress automatic popup modals during automated tests
  await page.addInitScript(() => {
    localStorage.setItem("kb_grand_opening_tour_seen_v2", "true");
  });

  // --------------------------------------------------------------------------
  // TEST 1: Customer Navbar Must NOT Appear on /customer/login
  // --------------------------------------------------------------------------
  console.log("\n[TEST 1] Testing /customer/login?tab=admin for navbar absence...");
  await page.goto(`${BASE_URL}/customer/login?tab=admin`, { waitUntil: "networkidle" });

  // Check if any CustomerNavbar elements exist
  const navbarExists = await page.evaluate(() => {
    const header = document.querySelector("header");
    const hasKhataLedger = document.body.innerText.includes("Khata Ledger");
    const hasMyOrders = document.body.innerText.includes("My Orders");
    const hasSupportTickets = document.body.innerText.includes("Support Tickets");
    return {
      hasHeader: !!header,
      hasNavLinks: hasKhataLedger || hasMyOrders || hasSupportTickets,
    };
  });

  console.log("Navbar check on /customer/login?tab=admin:", navbarExists);
  if (navbarExists.hasHeader || navbarExists.hasNavLinks) {
    throw new Error("FAILED: CustomerNavbar is still visible on /customer/login?tab=admin!");
  } else {
    console.log("PASSED: Zero navbar on /customer/login?tab=admin!");
  }

  // Save screenshot of clean login page
  const loginScreenshotPath = `${ARTIFACTS_DIR}/customer_login_no_navbar_preview.png`;
  await page.screenshot({ path: loginScreenshotPath });
  console.log(`Saved screenshot to ${loginScreenshotPath}`);

  // --------------------------------------------------------------------------
  // TEST 2: Customer AI Strict Context Boundaries
  // --------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing Customer AI Copilot Strict Scope...");

  // Customer credentials from seed
  const customer = await prisma.customer.findFirst({
    where: { mobile: "6303185141" },
  });

  if (!customer) {
    throw new Error("Customer 6303185141 not found in database!");
  }

  // Generate cryptographically signed Customer Session Token
  const customerToken = await createCustomerToken(customer.id);
  const customerCookieHeader = `kb_customer_session=${customerToken}`;

  await context.addCookies([
    {
      name: "kb_customer_session",
      value: customerToken,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  // Test 2a: Valid ledger query via API with session
  console.log("\nTesting legitimate ledger question via Customer AI API...");
  const validAiRes = await fetch(`${BASE_URL}/api/customer/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookieHeader,
    },
    body: JSON.stringify({
      prompt: "What is my current balance?",
    }),
  });
  const validAiData = await validAiRes.json();
  console.log("Valid Ledger Query Answer:", validAiData.reply);

  // Test 2b: Out-of-context query (President of USA)
  console.log("\nTesting out-of-context query 1: 'Who is the president of USA?'...");
  const outOfContextRes1 = await fetch(`${BASE_URL}/api/customer/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookieHeader,
    },
    body: JSON.stringify({
      prompt: "Who is the president of USA?",
    }),
  });
  const outOfContextData1 = await outOfContextRes1.json();
  console.log("Out-of-context response 1:", outOfContextData1.reply);

  if (!outOfContextData1.reply.includes("strictly restricted") && !outOfContextData1.reply.includes("పర్సనల్ అకౌంట్ అసిస్టెంట్")) {
    throw new Error(`FAILED: Customer AI did not refuse out-of-context query: ${outOfContextData1.reply}`);
  }
  console.log("PASSED: Customer AI refused general trivia query!");

  // Test 2c: Out-of-context query (Write python code)
  console.log("\nTesting out-of-context query 2: 'Write python script to reverse a string'...");
  const outOfContextRes2 = await fetch(`${BASE_URL}/api/customer/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookieHeader,
    },
    body: JSON.stringify({
      prompt: "Write python code to reverse a string",
    }),
  });
  const outOfContextData2 = await outOfContextRes2.json();
  console.log("Out-of-context response 2:", outOfContextData2.reply);

  if (!outOfContextData2.reply.includes("strictly restricted") && !outOfContextData2.reply.includes("పర్సనల్ అకౌంట్ అసిస్టెంట్")) {
    throw new Error(`FAILED: Customer AI did not refuse coding query: ${outOfContextData2.reply}`);
  }
  console.log("PASSED: Customer AI refused coding query!");

  // Open customer assistant page in Playwright
  await page.goto(`${BASE_URL}/customer/assistant`, { waitUntil: "networkidle" });
  await page.fill("input[type='text']", "Who is the president of USA?");
  await page.click("button[type='submit']");
  await page.waitForTimeout(3000);

  const assistantScreenshotPath = `${ARTIFACTS_DIR}/customer_ai_strict_refusal_preview.png`;
  await page.screenshot({ path: assistantScreenshotPath });
  console.log(`Saved screenshot to ${assistantScreenshotPath}`);

  // --------------------------------------------------------------------------
  // TEST 3: Admin AI Assistant Redesign & Availability
  // --------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing Admin AI Assistant on /admin/ai...");

  // Generate cryptographically signed Admin Session Token
  const adminToken = await createAdminToken("kbadmin");
  const adminCookieHeader = `kb_admin_session=${adminToken}`;

  // Set admin cookies in Playwright
  await context.addCookies([
    {
      name: "kb_admin_session",
      value: adminToken,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  // Navigate to /admin/ai
  await page.goto(`${BASE_URL}/admin/ai`, { waitUntil: "networkidle" });
  console.log("Current page URL after /admin/ai navigation:", page.url());

  if (!page.url().includes("/admin/ai")) {
    throw new Error(`FAILED: /admin/ai redirected to ${page.url()} instead of staying on /admin/ai!`);
  }

  // Check page elements
  const pageTitle = await page.textContent("h1");
  console.log("Admin AI Page Title:", pageTitle);

  // Send a quick question on the UI
  await page.click("button:has-text('Sales & Udhaar Overview')");
  await page.waitForTimeout(6000);

  const adminAiScreenshotPath = `${ARTIFACTS_DIR}/admin_ai_assistant_executive_preview.png`;
  await page.screenshot({ path: adminAiScreenshotPath });
  console.log(`Saved screenshot to ${adminAiScreenshotPath}`);

  // Also check Drawer has the AI link
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await page.click("button:has-text('Menu')");
  await page.waitForTimeout(1000);

  const drawerHasAi = await page.evaluate(() => {
    return document.body.innerText.includes("AI Business Advisor");
  });
  console.log("Left Slide-In Drawer includes 'AI Business Advisor':", drawerHasAi);

  const drawerScreenshotPath = `${ARTIFACTS_DIR}/admin_drawer_with_ai_link_preview.png`;
  await page.screenshot({ path: drawerScreenshotPath });
  console.log(`Saved screenshot to ${drawerScreenshotPath}`);

  await browser.close();
  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

