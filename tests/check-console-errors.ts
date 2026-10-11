import { chromium } from "playwright";

const ROUTES = [
  "/",
  "/orders",
  "/orders/new",
  "/villages",
  "/customers",
  "/ledger",
  "/payments",
  "/reports",
  "/portal/login",
  "/portal",
  "/admin/login",
  "/admin/register",
  "/admin/ai",
  "/presentation",
];

async function main() {
  console.log("Launching headless browser to check console errors on all UI routes...");
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  const allErrors: { route: string; type: string; text: string }[] = [];

  // Set admin session cookie
  await page.context().addCookies([
    {
      name: "kb_admin_session",
      value: "kb_adm_test_session_token_12345",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      allErrors.push({ route: page.url(), type: "console.error", text: msg.text() });
    }
  });

  page.on("response", (res) => {
    if (res.status() === 404) {
      console.log(`404 detected on URL: ${res.url()} while visiting ${page.url()}`);
    }
  });

  page.on("pageerror", (err) => {
    allErrors.push({ route: page.url(), type: "pageerror", text: err.message });
  });

  for (const route of ROUTES) {
    console.log(`Testing route: http://127.0.0.1:3000${route}`);
    try {
      await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle", timeout: 10000 });
      await page.waitForTimeout(500); // Allow any hydration/effects to finish
    } catch (e: any) {
      console.warn(`  Navigation warning on ${route}:`, e.message);
    }
  }

  await browser.close();

  console.log("\n==========================================");
  console.log(`Total Errors Detected: ${allErrors.length}`);
  console.log("==========================================");
  for (const err of allErrors) {
    console.log(`[${err.type}] on ${err.route}:`);
    console.log(`   ${err.text}\n`);
  }

  if (allErrors.length > 0) {
    process.exit(1);
  } else {
    console.log("SUCCESS: Zero console or page errors across all routes!");
  }
}

main().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
