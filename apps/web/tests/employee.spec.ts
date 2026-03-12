import { expect, test } from "@playwright/test";
import { injectMockEthereum, connectMockWallet } from "./helpers/mockWallet";

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

  test("displays employee dashboard when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employee");
    await connectMockWallet(page);

    // Should show the main heading
    await expect(page.getByRole("heading", { name: "Payment Streams" })).toBeVisible();

    // Should show stats cards
    await expect(page.getByText("Wallet", { exact: true })).toBeVisible();
    await expect(page.getByText("Active streams")).toBeVisible();
    await expect(page.getByText("Network")).toBeVisible();

    // Should show "Your Streams" section
    await expect(page.getByText(/Your Streams/)).toBeVisible();

    // When no streams exist, should show empty state
    await expect(page.getByText("No Streams Found")).toBeVisible();
  });

  test("shows about encrypted streams section when connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employee");
    await connectMockWallet(page);

    // Should show the info card about encrypted streams
    await expect(page.getByText("About Encrypted Streams")).toBeVisible();
    await expect(page.getByText(/fully homomorphic encryption/i)).toBeVisible();
  });

  test("shows navigation tabs when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employee");
    await connectMockWallet(page);

    // Should show role tabs
    await expect(page.getByRole("link", { name: /As sender/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /As recipient/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Proof of Income/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Employment Proof/i })).toBeVisible();
  });
});
