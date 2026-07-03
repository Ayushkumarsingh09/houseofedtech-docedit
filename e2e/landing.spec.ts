import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("shows the hero, primary CTA, and footer attribution", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /write anywhere/i,
    );
    await expect(page.getByRole("link", { name: /start writing free/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "LinkedIn" })).toBeVisible();
  });

  test("is keyboard navigable to the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
