import { expect, test } from "@playwright/test";

test.describe("Airdrops page", () => {
  test("loads airdrops page successfully", async ({ page }) => {
    await page.goto("/airdrops");

    // Page should load without errors
    await expect(page).toHaveURL("/airdrops");
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/airdrops");

    // Header should be visible
    await expect(page.getByText("PayProof")).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  test("displays airdrops hero section", async ({ page }) => {
    await page.goto("/airdrops");

    // Hero content should be visible
    await expect(page.getByRole("heading", { name: "Private Airdrops", level: 1 })).toBeVisible();
    await expect(page.getByText("Coming Soon")).toBeVisible();
  });

  test("displays feature overview", async ({ page }) => {
    await page.goto("/airdrops");

    // Feature overview section should be visible
    await expect(page.getByRole("heading", { name: "Encrypted Eligibility & Distribution" })).toBeVisible();
    await expect(page.getByText(/Compute eligibility scores and allocations/i)).toBeVisible();
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/airdrops");

    // Feature cards should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("heading", { name: "Private Scoring" })).toBeVisible();
    await expect(page.getByText(/Eligibility criteria and scoring logic remain encrypted/i)).toBeVisible();

    await expect(page.getByRole("heading", { name: "Sybil Resistance" })).toBeVisible();
    await expect(page.getByText(/Combine FHE with ZK proofs/i)).toBeVisible();
  });

  test("displays why private airdrops section", async ({ page }) => {
    await page.goto("/airdrops");

    // Why section should be visible
    await expect(page.getByRole("heading", { name: "Why Private Airdrops?" })).toBeVisible();
    await expect(page.getByText(/Traditional public airdrops leak eligibility criteria/i)).toBeVisible();
    await expect(page.getByText(/Existing ZK airdrop solutions/i)).toBeVisible();
    await expect(page.getByText(/FHE for private scoring/i)).toBeVisible();
  });

  test("navigates back to home", async ({ page }) => {
    await page.goto("/airdrops");

    // Click back to home link
    const homeLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    // Should navigate to home page
    await expect(page).toHaveURL("/");
  });

  test("displays footer", async ({ page }) => {
    await page.goto("/airdrops");

    // Footer should be visible
    await expect(page.getByText(/Built for the Zama Special Bounty Track/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "coderlu" })).toBeVisible();
  });
});
