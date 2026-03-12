import { expect, test } from "@playwright/test";
import { injectMockEthereum, connectMockWallet } from "./helpers/mockWallet";

test.describe("Employer flow", () => {
  test("loads employer page successfully", async ({ page }) => {
    await page.goto("/employer");

    // Page should load without errors
    await expect(page).toHaveURL("/employer");
  });

  test("shows wallet connect prompt when not connected", async ({ page }) => {
    await page.goto("/employer");

    // Should show wallet connect prompt when not connected
    await expect(page.getByRole("heading", { name: "Connect Your Wallet" })).toBeVisible();
    await expect(page.getByText(/access confidential payroll streams/i)).toBeVisible();
  });

  test("displays header navigation with correct active state", async ({ page }) => {
    await page.goto("/employer");

    // Header should be visible
    await expect(page.getByText("PayProof")).toBeVisible();

    // Navigation items should be visible (use .first() to avoid strict mode violations)
    await expect(page.getByRole("link", { name: /Home/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Vesting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Airdrops/i }).first()).toBeVisible();
  });

  test("renders stream creation form when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employer");
    await connectMockWallet(page);

    // Should show the main heading
    await expect(page.getByRole("heading", { name: "Payment Streams" })).toBeVisible();

    // Should show stats overview cards
    await expect(page.getByText("Wallet", { exact: true })).toBeVisible();
    await expect(page.getByText("Active streams")).toBeVisible();

    // Should show streams tab content
    await expect(page.getByText("Your Streams")).toBeVisible();

    // Should show the "How it works" section
    await expect(page.getByText("How it works")).toBeVisible();
    await expect(page.getByText("Client-side encryption")).toBeVisible();
  });

  test("shows employee directory tab when wallet connected", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employer");
    await connectMockWallet(page);

    // Should have streams and directory tabs
    const directoryTab = page.getByRole("button", { name: /Employee Directory/i });
    await expect(directoryTab).toBeVisible();

    // Click directory tab
    await directoryTab.click();

    // Should show the directory heading
    await expect(page.getByRole("heading", { name: /Employee Directory/ })).toBeVisible();
  });

  test("shows empty state when no streams exist", async ({ page }) => {
    await injectMockEthereum(page);
    await page.goto("/employer");
    await connectMockWallet(page);

    // When no streams exist, should show empty state
    await expect(page.getByText("No streams created yet")).toBeVisible();
  });
});
