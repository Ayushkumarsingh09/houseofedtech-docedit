import { expect, test, type Page } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`;
}

async function signUp(page: Page, name: string) {
  await page.goto("/signup");
  await page.getByLabel(/full name/i).fill(name);
  await page.getByLabel(/email/i).fill(uniqueEmail("editor"));
  await page.getByLabel(/^password$/i).fill("Password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function createDocument(page: Page) {
  await page
    .getByRole("button", { name: /new document/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/documents\/.+/, { timeout: 10_000 });
}

test.describe("Document editor", () => {
  test("creates a document, types offline-first, and shows a synced state", async ({
    page,
  }) => {
    await signUp(page, "Editor Test User");
    await createDocument(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.type("Hello, Nimbus Docs! This is a local-first editor.");

    await expect(page.getByText(/\d+ words/)).toBeVisible();
    await expect(page.getByText(/synced|syncing/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("persists content locally across a reload", async ({ page }) => {
    await signUp(page, "Reload Test User");
    await createDocument(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.type("Content that must survive a reload.");

    // Give the debounce + sync a moment to flush before reloading.
    await page.waitForTimeout(1500);
    await page.reload();

    await expect(page.locator(".ProseMirror")).toContainText(
      "Content that must survive a reload.",
    );
  });

  test("renames a document via the title field", async ({ page }) => {
    await signUp(page, "Rename Test User");
    await createDocument(page);

    const titleInput = page.getByLabel(/document title/i);
    await titleInput.fill("My Renamed Document");
    await page.waitForTimeout(1200);
    await page.reload();

    await expect(page.getByLabel(/document title/i)).toHaveValue("My Renamed Document");
  });

  test("opens the version history dialog", async ({ page }) => {
    await signUp(page, "History Test User");
    await createDocument(page);

    await page.locator(".ProseMirror").click();
    await page.locator(".ProseMirror").type("Some content to snapshot.");

    await page.getByRole("button", { name: /version history/i }).click();
    await expect(page.getByRole("heading", { name: /version history/i })).toBeVisible();
  });
});
