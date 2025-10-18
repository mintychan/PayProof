import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test("loads home page successfully", async ({ page }) => {
    await page.goto("/");

    // Page should load without errors
    await expect(page).toHaveURL("/");
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/");

    // Header should be visible
    await expect(page.getByText("PayProof")).toBeVisible();
    await expect(page.getByText("Privacy-preserving payroll").first()).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  test("displays hero section", async ({ page }) => {
    await page.goto("/");

    // Hero content should be visible
    await expect(page.getByRole("heading", { name: "Privacy-Preserving Payroll", level: 1 })).toBeVisible();
    await expect(page.getByText(/Stream encrypted salaries/i)).toBeVisible();
  });

  test("displays three feature cards", async ({ page }) => {
    await page.goto("/");

    // Card headings should be visible
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vesting" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Airdrops" })).toBeVisible();

    // Card descriptions should be visible
    await expect(page.getByText(/Stream encrypted payroll with real-time accrual/i)).toBeVisible();
  });

  test("navigates to payments page from card", async ({ page }) => {
    await page.goto("/");

    // Click on Payments card
    const paymentsCard = page.locator('a[href="/employer"]').first();
    await paymentsCard.click();

    // Should navigate to employer page
    await expect(page).toHaveURL("/employer");
  });

  test("navigates to vesting page from card", async ({ page }) => {
    await page.goto("/");

    // Click on Vesting card
    const vestingCard = page.locator('a[href="/vesting"]').first();
    await vestingCard.click();

    // Should navigate to vesting page
    await expect(page).toHaveURL("/vesting");
  });

  test("navigates to airdrops page from card", async ({ page }) => {
    await page.goto("/");

    // Click on Airdrops card
    const airdropsCard = page.locator('a[href="/airdrops"]').first();
    await airdropsCard.click();

    // Should navigate to airdrops page
    await expect(page).toHaveURL("/airdrops");
  });

  test("displays footer with contact info", async ({ page }) => {
    await page.goto("/");

    // Footer should be visible
    await expect(page.getByText(/Built for the Zama Builder Track/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "coderlu" })).toBeVisible();

    // Footer link should have correct mailto
    const emailLink = page.getByRole("link", { name: "coderlu" });
    await expect(emailLink).toHaveAttribute("href", "mailto:xiaoyilu.au@gmail.com");
  });
});
