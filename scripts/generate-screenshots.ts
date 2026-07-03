/**
 * Generates the marketing/README screenshots under `docs/screenshots/`.
 *
 * Usage: `npm run screenshots` (expects the app to already be running,
 * see the `screenshots:serve` helper invoked by CI/manual runs).
 */
import { chromium, devices, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3100";
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots");

const DEMO_EMAIL = "demo@nimbusdocs.dev";
const DEMO_PASSWORD = "Password123";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  // 1. Landing page (light)
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "01-landing.png") });
    await context.close();
  }

  // 2. Login page
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, "02-auth-login.png") });
    await context.close();
  }

  // 3. Dashboard + 4. Editor + 5. Version history + 8. Settings (shared session)
  let firstDocumentUrl = "";
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page);
    await page.waitForSelector("a[href^='/documents/']", { timeout: 15_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, "03-dashboard.png") });

    await page.locator("a[href^='/documents/']").first().click();
    await page.waitForURL(/\/documents\/.+/);
    firstDocumentUrl = page.url();
    await page.locator(".ProseMirror").click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, "04-editor.png") });

    await page.getByRole("button", { name: /version history/i }).click();
    await page
      .getByText(/^v\d+$/)
      .first()
      .waitFor({ timeout: 10_000 });
    await page
      .getByText(/^v\d+$/)
      .first()
      .click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "05-version-history.png") });
    await page.keyboard.press("Escape");

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "08-settings.png") });

    await context.close();
  }

  // 6. Dark mode
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
    await login(page);
    await page.waitForSelector("a[href^='/documents/']", { timeout: 15_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, "06-dark-mode.png") });
    await context.close();
  }

  // 7. Offline mode
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page);
    if (firstDocumentUrl) {
      await page.goto(firstDocumentUrl);
    } else {
      await page.waitForSelector("a[href^='/documents/']", { timeout: 15_000 });
      await page.locator("a[href^='/documents/']").first().click();
    }
    await page.locator(".ProseMirror").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await context.setOffline(true);
    await page.locator(".ProseMirror").click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("This paragraph was written entirely offline.");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, "07-offline-mode.png") });
    await context.setOffline(false);
    await context.close();
  }

  // 9. Mobile view
  {
    const context = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await context.newPage();
    await login(page);
    await page.waitForSelector("a[href^='/documents/']", { timeout: 15_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, "09-mobile-view.png") });
    await context.close();
  }

  await browser.close();
  console.log(`Screenshots written to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
