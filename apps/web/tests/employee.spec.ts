import { expect, test } from "@playwright/test";

test.describe("Employee flow", () => {
  test("loads employee page successfully", async ({ page }) => {
    await page.goto("/employee");

    // Page should load without errors
    await expect(page).toHaveURL("/employee");
  });

  test("shows wallet connect prompt when not connected", async ({ page }) => {
    await page.goto("/employee");

    // Should show wallet connect prompt when not connected
    await expect(page.getByRole("heading", { name: "Connect Your Wallet" })).toBeVisible();
    await expect(page.getByText(/access confidential payroll streams/i)).toBeVisible();
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/employee");

    // Header should be visible
    await expect(page.getByText("PayProof")).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  // TODO: Enable when wallet connection and blockchain mocking is set up for tests
  test.skip("displays encrypted streams list when wallet connected", async ({ page }) => {
    // This test requires:
    // 1. Mocked wallet connection with wagmi
    // 2. Mocked blockchain data for streams

    await page.goto("/employee");

    await expect(page.getByRole("heading", { name: "Your Encrypted Payroll Streams" })).toBeVisible();
    await expect(page.getByText("Active Streams")).toBeVisible();

    // When no streams exist
    // await expect(page.getByText("No streams found for your address")).toBeVisible();

    // When streams exist, should show:
    // - Stream cards with employer address
    // - Stream status (Active/Paused/Cancelled)
    // - Encrypted rate handle
    // - Privacy protection notice
  });

  // TODO: Enable when wallet connection and blockchain mocking is set up for tests
  test.skip("navigates to stream detail page for decryption", async ({ page }) => {
    // This test requires:
    // 1. Mocked wallet connection
    // 2. Mocked streams from blockchain

    await page.goto("/employee");

    // Clicking a stream should navigate to /stream/[id] page
    // where the actual decryption happens

    // const streamCard = page.locator('a[href^="/stream/"]').first();
    // await expect(streamCard).toBeVisible();
    // await streamCard.click();

    // Should be on stream detail page
    // await expect(page).toHaveURL(/\/stream\/.+/);
  });

  // TODO: Enable when wallet connection mocking is set up for tests
  test.skip("shows proof generation link when wallet connected", async ({ page }) => {
    // This test requires mocked wallet connection

    await page.goto("/employee");

    // Should show link to proof generation page
    // const proofLink = page.getByRole("link", { name: "Generate Proof" });
    // await expect(proofLink).toBeVisible();
    // await expect(proofLink).toHaveAttribute("href", "/verify");
  });
});
