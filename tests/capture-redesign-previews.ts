import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function capturePreviews() {
  const artifactDir = "/home/user/.gemini/antigravity/brain/d30db3b0-68f0-4f66-af4a-a5d93a6fd429";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject admin session cookie
  await context.addCookies([
    {
      name: "kb_admin_session",
      value: "kb_adm_verified_playwright_audit_session_2026",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "kb_customer_session",
      value: "kb_cust_verified_audit_session_2026",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  // Helper
  const capture = async (url: string, filename: string, waitMs = 1200) => {
    console.log(`Capturing ${url} -> ${filename}...`);
    await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(waitMs);
    const target = path.join(artifactDir, filename);
    await page.screenshot({ path: target, fullPage: false });
    console.log(`Saved ${target}`);
  };

  await capture("/admin", "admin_analytical_dashboard_preview.png");
  await capture("/admin/billing", "admin_billing_entry_preview.png");
  await capture("/admin/customers", "admin_customers_villages_preview.png");
  await capture("/admin/reports", "admin_reports_carbon_preview.png");
  await capture("/admin/payments", "admin_cashfree_hub_preview.png");
  await capture("/customer/pay", "customer_cashfree_pay_preview.png");

  // Also capture left slide-in drawer
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("kb:open-nav-drawer"));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, "admin_left_drawer_preview.png") });

  await browser.close();
  console.log("Screenshots captured successfully!");
}

capturePreviews().catch(console.error);

