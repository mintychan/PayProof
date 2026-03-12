import { expect, test } from "@playwright/test";

test.describe("Vesting page", () => {
  test("loads vesting page successfully", async ({ page }) => {
    await page.goto("/vesting");

    // Page should load without errors
    await expect(page).toHaveURL("/vesting");
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/vesting");

    // Header should be visible
    await expect(page.getByText("PayProof").first()).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  test("displays vesting hero section", async ({ page }) => {
    await page.goto("/vesting");

    // Hero content should be visible (use .first() to get h1, not h2)
    await expect(page.getByRole("heading", { name: "Encrypted Vesting", level: 1 })).toBeVisible();
    await expect(page.getByText(/Encrypted vesting/i).first()).toBeVisible();
  });

  test("displays feature overview", async ({ page }) => {
    await page.goto("/vesting");

    await expect(page.getByRole("heading", { name: "Encrypted Vesting", level: 1 })).toBeVisible();
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/vesting");
    await expect(page.getByText(/Lookup confidential vesting schedules/i).first()).toBeVisible();
  });

  test("displays comparison section", async ({ page }) => {
    await page.goto("/vesting");

    // Comparison section should be visible
    await expect(page.getByRole("heading", { name: "Why Encrypted Vesting?" })).toBeVisible();
    await expect(page.getByText(/vesting tools like Sablier/i)).toBeVisible();
    await expect(page.getByText(/OpenZeppelin/i)).toBeVisible();
  });

  test("navigates back to home", async ({ page }) => {
    await page.goto("/vesting");

    // Click back to home link
    const homeLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    // Should navigate to home page
    await expect(page).toHaveURL("/");
  });

  test("displays footer", async ({ page }) => {
    await page.goto("/vesting");

    // Footer should be visible
    await expect(page.getByText(/Built for the Zama Special Bounty Track/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "coderlu" })).toBeVisible();
  });
});
