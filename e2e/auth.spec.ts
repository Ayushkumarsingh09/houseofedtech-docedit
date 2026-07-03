import { expect, test } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`;
}

test.describe("Authentication", () => {
  test("a new user can sign up and lands on the dashboard", async ({ page }) => {
    await page.goto("/signup");

    await page.getByLabel(/full name/i).fill("Playwright Test User");
    await page.getByLabel(/email/i).fill(uniqueEmail("signup"));
    await page.getByLabel(/^password$/i).fill("Password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("shows an error for invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill(uniqueEmail("nonexistent"));
    await page.getByLabel(/password/i).fill("WrongPassword123");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("protects the dashboard from unauthenticated access", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
