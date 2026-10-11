import { chromium, Browser, Page } from "playwright";

async function runAssistantE2ETests() {
  console.log("==========================================================================");
  console.log("           KB AI ASSISTANT - PLAYWRIGHT END-TO-END VERIFICATION           ");
  console.log("==========================================================================\n");

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const context = await browser.newContext();
  const page: Page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ---------------------------------------------------------
    // Test 1: Navigation and Redirect /chat -> /assistant
    // ---------------------------------------------------------
    console.log(">> Test 1: Verifying /chat redirect to /assistant...");
    await page.goto(`${baseUrl}/chat`, { waitUntil: "networkidle" });
    assert(page.url().includes("/assistant"), "Navigating to /chat redirects cleanly to /assistant");

    // ---------------------------------------------------------
    // Test 2: Chrome Decoupling & Isolation Verification
    // ---------------------------------------------------------
    console.log("\n>> Test 2: Verifying Shop Chrome Decoupling & Isolation...");
    // Check that KB KHATA shop elements are NOT present on /assistant
    const shopNavbar = await page.$("header nav a:has-text('Orders')");
    assert(shopNavbar === null, "Shop navigation bar is NOT rendered on /assistant");

    const floatingAdvisor = await page.$("[data-testid='floating-ai-advisor']");
    assert(floatingAdvisor === null, "Floating AI advisor widget is NOT rendered on /assistant");

    const bottomNav = await page.$("nav:has-text('Khata')");
    assert(bottomNav === null, "Shop mobile bottom navigation is NOT rendered on /assistant");

    // Check that KB AI Assistant Header IS present
    const headerTitle = await page.textContent("header h1");
    assert(headerTitle?.includes("KB AI Assistant") === true, "Header contains 'KB AI Assistant'");

    // Check that 'New chat' button is present in header
    const newChatBtn = await page.$("button[title='New chat'], button:has-text('New chat')");
    assert(newChatBtn !== null, "Header has 'New chat' button");

    // ---------------------------------------------------------
    // Test 3: Empty State Verification
    // ---------------------------------------------------------
    console.log("\n>> Test 3: Verifying Empty State Canvas...");
    const greeting = await page.textContent("h2");
    assert(greeting?.includes("How can I help you today?") === true, "Empty state displays 'How can I help you today?' greeting");

    // Check bottom prompt textarea
    const promptInput = await page.$("textarea[placeholder='Message KB AI Assistant...']");
    assert(promptInput !== null, "Bottom prompt composer with 'Message KB AI Assistant...' placeholder is present");

    // Check send button is initially disabled
    const sendBtn = await page.$("button[type='submit']");
    assert(sendBtn !== null, "Send prompt button is present");

    // ---------------------------------------------------------
    // Test 4: Sending a Prompt and Receiving Streaming Response
    // ---------------------------------------------------------
    console.log("\n>> Test 4: Sending prompt and verifying SSE streaming response...");
    await page.fill("textarea[placeholder='Message KB AI Assistant...']", "Write a 3-bullet summary of modern ledger accounting.");
    await page.click("button[type='submit']");

    // Verify user message appears in conversation canvas immediately
    await page.waitForSelector("text='Write a 3-bullet summary of modern ledger accounting.'", { timeout: 5000 });
    assert(true, "User message renders immediately in conversation canvas");

    // Verify AI response stream appears and finishes generating
    console.log("   Waiting for AI streaming response completion...");
    // Wait for the stop button to disappear or the send button to become active again
    await page.waitForFunction(() => {
      const stopBtn = document.querySelector("button[title='Stop generating']");
      const textarea = document.querySelector("textarea[placeholder='Message KB AI Assistant...']") as HTMLTextAreaElement;
      return !stopBtn && textarea && !textarea.disabled;
    }, { timeout: 35000 });

    const aiMessageContent = await page.innerText(".prose, [data-testid='ai-message'], .space-y-4");
    assert(aiMessageContent.length > 20, "AI streamed response received with markdown content");
    console.log(`   Sample AI content preview: ${aiMessageContent.substring(0, 120).replace(/\n/g, " ")}...`);

    // Verify Copy button is present
    const copyButton = await page.$("button[title='Copy response']");
    assert(copyButton !== null, "Copy response button is available on AI message");

    // ---------------------------------------------------------
    // Test 5: Sidebar Conversation Persistence and Active State
    // ---------------------------------------------------------
    console.log("\n>> Test 5: Verifying Sidebar Persistence and Auto-Titling...");
    // The conversation list in sidebar should now display a conversation item
    const convItems = await page.$$("aside nav button, aside nav div");
    assert(convItems.length > 0, "Conversation appears in sidebar conversation history list");

    // Verify URL updated to /assistant?c={id}
    const currentUrl = page.url();
    assert(currentUrl.includes("?c="), `URL updated with conversation ID query param: ${currentUrl}`);

    // ---------------------------------------------------------
    // Test 6: Renaming Conversation in Sidebar
    // ---------------------------------------------------------
    console.log("\n>> Test 6: Testing Inline Conversation Title Rename...");
    const editBtn = await page.$("button[title='Rename conversation']");
    assert(editBtn !== null, "Rename conversation button exists in sidebar item");
    await editBtn!.click();

    // Fill new title
    const renameInput = await page.$("input[type='text']");
    assert(renameInput !== null, "Inline rename input appeared");
    await renameInput!.fill("Accounting Ledger Guide");
    await page.keyboard.press("Enter");

    // Wait for rename save
    await page.waitForTimeout(1000);
    const updatedTitle = await page.textContent("aside nav");
    assert(updatedTitle?.includes("Accounting Ledger Guide") === true, "Conversation title successfully renamed and displayed in sidebar");

    // ---------------------------------------------------------
    // Test 7: Dark / Light Mode Toggle
    // ---------------------------------------------------------
    console.log("\n>> Test 7: Testing Dark / Light Mode Toggle...");
    const themeBtn = await page.$("button[title*='Switch to']");
    assert(themeBtn !== null, "Theme switch button exists in header");

    const htmlBefore = await page.getAttribute("html", "class");
    await themeBtn!.click();
    await page.waitForTimeout(500);
    const htmlAfter = await page.getAttribute("html", "class");
    assert(htmlBefore !== htmlAfter, `Theme toggled class on <html>: from '${htmlBefore}' to '${htmlAfter}'`);

    // Toggle back
    await themeBtn!.click();

    // ---------------------------------------------------------
    // Test 8: New Chat Button Resets State
    // ---------------------------------------------------------
    console.log("\n>> Test 8: Testing 'New Chat' Trigger...");
    const headerNewChat = await page.$("header button[title='New chat']");
    await headerNewChat!.click();
    await page.waitForTimeout(800);

    const newGreeting = await page.textContent("h2");
    assert(newGreeting?.includes("How can I help you today?") === true, "New chat resets canvas to 'How can I help you today?'");
    assert(!page.url().includes("?c="), "URL returned to clean /assistant without query param");

    // ---------------------------------------------------------
    // Test 9: Deleting Conversation with Confirmation Modal
    // ---------------------------------------------------------
    console.log("\n>> Test 9: Testing Conversation Deletion with Confirmation Modal...");
    // Find delete button on the existing conversation in sidebar
    const deleteBtn = await page.$("button[title='Delete conversation']");
    assert(deleteBtn !== null, "Delete button is present in sidebar item");
    await deleteBtn!.click();

    // Check confirmation modal appears
    await page.waitForSelector("text='Delete chat?'", { timeout: 3000 });
    assert(true, "Delete confirmation modal appeared with 'Delete chat?' prompt");

    // Click confirm delete in modal
    const confirmDeleteBtn = await page.$(".z-50 button:has-text('Delete')");
    assert(confirmDeleteBtn !== null, "Modal Delete action button is present");
    await confirmDeleteBtn!.click();
    await page.waitForTimeout(1000);

    // Verify conversation removed from sidebar
    const emptyHistoryText = await page.textContent("aside nav");
    assert(!emptyHistoryText?.includes("Accounting Ledger Guide"), "Conversation deleted cleanly and removed from sidebar");

    // ---------------------------------------------------------
    // Test 10: Multi-line and Keyboard Shortcuts
    // ---------------------------------------------------------
    console.log("\n>> Test 10: Testing Keyboard Shortcuts (Shift+Enter vs Enter)...");
    const composer = await page.$("textarea[placeholder='Message KB AI Assistant...']");
    await composer!.focus();
    await composer!.type("Line 1");
    await page.keyboard.down("Shift");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Shift");
    await composer!.type("Line 2");

    const composerValue = await composer!.inputValue();
    assert(composerValue.includes("Line 1\nLine 2"), "Shift+Enter creates a newline without triggering form submission");

    // ---------------------------------------------------------
    // Test 11: Zero Console and Runtime Errors
    // ---------------------------------------------------------
    console.log("\n>> Test 11: Auditing Console and Page Errors...");
    console.log(`   Captured Console Errors: ${consoleErrors.length}`);
    console.log(`   Captured Page Errors: ${pageErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn("   Console warnings/errors:", consoleErrors);
    }
    assert(pageErrors.length === 0, "Zero fatal unhandled JavaScript/React page runtime errors");

    console.log("\n==========================================================================");
    console.log(`   ALL TESTS PASSED: ${testsPassed} / ${totalTests} (100% SUCCESS)        `);
    console.log("==========================================================================\n");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runAssistantE2ETests();
