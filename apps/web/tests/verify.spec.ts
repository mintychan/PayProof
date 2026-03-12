import { expect, test } from "@playwright/test";
import { injectMockEthereum, connectMockWallet } from "./helpers/mockWallet";

test.describe("Verifier flow", () => {
  test("loads verify page successfully", async ({ page }) => {
    await page.goto("/verify");

    // Page should load without errors
    await expect(page).toHaveURL("/verify");
  });

  test("shows wallet connect prompt when not connected", async ({ page }) => {
    await page.goto("/verify");

    // Should show wallet connect prompt when not connected
    await expect(page.getByRole("heading", { name: "Connect Your Wallet" })).toBeVisible();
    await expect(page.getByText(/access confidential payroll streams/i)).toBeVisible();
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/verify");

    // Header should be visible
    await expect(page.getByText("PayProof")).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  test("renders proof-of-income form when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/verify");
    await connectMockWallet(page);

    // Should show the main content
    await expect(page.getByRole("heading", { name: "Payment Streams" })).toBeVisible();

    // Should show Request Proof-of-Income heading
    await expect(page.getByText("Request Proof-of-Income")).toBeVisible();

    // Should show the form inputs
    await expect(page.getByText("Employer Address")).toBeVisible();
    await expect(page.getByText("Threshold (ETH)")).toBeVisible();
    await expect(page.getByText("Lookback window (days)")).toBeVisible();

    // Should show submit button
    await expect(page.getByRole("button", { name: /Encrypt & Request Proof/i })).toBeVisible();
  });

  test("shows attestation tiers info when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/verify");
    await connectMockWallet(page);

    // Should show attestation tiers
    await expect(page.getByText("Attestation Tiers")).toBeVisible();
    await expect(page.getByText("Premium")).toBeVisible();
    await expect(page.getByText("Standard")).toBeVisible();
    await expect(page.getByText("Basic")).toBeVisible();
  });

  test("shows best practices section when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/verify");
    await connectMockWallet(page);

    // Should show best practices
    await expect(page.getByText("Best Practices")).toBeVisible();
    await expect(page.getByText("Client-side encryption")).toBeVisible();
    await expect(page.getByText("Audit trail")).toBeVisible();
  });

  test("shows privacy guarantee when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/verify");
    await connectMockWallet(page);

    // Should show privacy guarantee
    await expect(page.getByText("Privacy Guarantee")).toBeVisible();
    await expect(page.getByText(/tiered attestation results/i)).toBeVisible();
  });
});
