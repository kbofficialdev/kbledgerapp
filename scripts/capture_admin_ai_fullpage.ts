import { chromium } from "playwright";
import { createAdminToken } from "../src/lib/auth-session";

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACTS_DIR = "/home/user/.gemini/antigravity/brain/d30db3b0-68f0-4f66-af4a-a5d93a6fd429";

async function captureFullPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem("kb_grand_opening_tour_seen_v2", "true");
  });

  const adminToken = await createAdminToken("kbadmin");
  await context.addCookies([
    {
      name: "kb_admin_session",
      value: adminToken,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto(`${BASE_URL}/admin/ai`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Take screenshot of initial state with banner and quick prompt chips
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/admin_ai_executive_banner_preview.png`,
    fullPage: false,
  });

  // Click on quick prompt
  await page.click("button:has-text('Sales & Udhaar Overview')");
  // Wait for Gemini response to appear
  await page.waitForSelector("button:has-text('Copy Analysis')", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(10000);

  // Take full page screenshot with response
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/admin_ai_executive_fullpage_preview.png`,
    fullPage: true,
  });

  await browser.close();
  console.log("Full page screenshots saved successfully!");
}

captureFullPage().catch(console.error);
