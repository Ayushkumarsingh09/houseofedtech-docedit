import { expect, test } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`;
}

test.describe("Offline-first behavior", () => {
  test("continues to work while offline and reflects the offline status", async ({
    page,
    context,
  }) => {
    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Offline Test User");
    await page.getByLabel(/email/i).fill(uniqueEmail("offline"));
    await page.getByLabel(/^password$/i).fill("Password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    await page
      .getByRole("button", { name: /new document/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/documents\/.+/);

    await context.setOffline(true);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.type("Written entirely offline.");

    await expect(page.getByText(/offline/i).first()).toBeVisible({ timeout: 15_000 });
    // The UI must never block editing while offline.
    await expect(editor).toContainText("Written entirely offline.");

    await context.setOffline(false);
    await expect(page.getByText(/synced|syncing/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
