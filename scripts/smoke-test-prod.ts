import { chromium } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://houseofedtech-docedit.vercel.app";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = `prod-smoke-${Date.now()}@e2e.test`;

  console.log("1. Landing page...");
  await page.goto(BASE_URL);
  await page.waitForSelector("text=Write anywhere");
  console.log("   OK");

  console.log("2. Sign up...");
  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel(/full name/i).fill("Production Smoke Test");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill("Password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
  console.log("   OK — reached dashboard");

  console.log("3. Create a document...");
  await page
    .waitForSelector("a[href^='/documents/']", { timeout: 15_000 })
    .catch(() => null);
  await page
    .getByRole("button", { name: /new document/i })
    .first()
    .click();
  await page.waitForURL(/\/documents\/.+/, { timeout: 15_000 });
  console.log("   OK — document created:", page.url());

  console.log("4. Type into the editor...");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Hello from the production smoke test!");
  await page.waitForSelector("text=/synced|syncing/i", { timeout: 20_000 });
  console.log("   OK — sync status visible");

  console.log("5. Offline mode...");
  await context.setOffline(true);
  await page.keyboard.type(" (typed offline)");
  await page.waitForSelector("text=/offline/i", { timeout: 15_000 });
  console.log("   OK — offline indicator shown, editor still responsive");
  await context.setOffline(false);
  await page.waitForSelector("text=/synced|syncing/i", { timeout: 20_000 });
  console.log("   OK — reconnected and synced");

  console.log("6. Version history...");
  await page.getByRole("button", { name: /version history/i }).click();
  await page.waitForSelector("text=Version history", { timeout: 10_000 });
  console.log("   OK — version history dialog opens");

  console.log("\nAll production smoke checks passed against", BASE_URL);
  await browser.close();
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error);
  process.exitCode = 1;
});
