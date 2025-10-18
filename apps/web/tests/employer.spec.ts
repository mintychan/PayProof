import { expect, test } from "@playwright/test";

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

  // TODO: Enable when wallet connection and fhEVM mocking is set up for tests
  test.skip("renders encrypted stream creation form when wallet connected", async ({ page }) => {
    // This test requires:
    // 1. Mocked wallet connection with wagmi
    // 2. Mocked fhEVM provider initialized
    // 3. Mocked blockchain connection for creating streams

    await page.goto("/employer");
    await expect(page.getByRole("heading", { name: "Create Encrypted Payroll Streams" })).toBeVisible();
    await expect(page.getByText("Create Confidential Stream")).toBeVisible();

    // Employer field should be auto-populated from connected wallet
    const employerInput = page.locator("input[name=employer]");
    await expect(employerInput).toBeDisabled();

    // Fill in the stream creation form
    await page.fill("input[name=employee]", "0x1234567890123456789012345678901234567890");
    await page.fill("input[name=rate]", "1.5");
    await page.selectOption("select[name=cadence]", { label: "Monthly" });

    // Submit should be disabled until fhEVM is ready
    const submitButton = page.getByRole("button", { name: /Encrypt & Create Stream/i });
    await expect(submitButton).toBeDisabled();
  });

  // TODO: Enable when wallet connection and fhEVM mocking is set up for tests
  test.skip("creates encrypted stream and shows result", async ({ page }) => {
    // This test requires full integration with:
    // 1. Wallet connection
    // 2. fhEVM initialization and encryption
    // 3. Contract interaction

    await page.goto("/employer");

    // After form submission with mocked successful transaction:
    // const preview = page.getByTestId("encryption-preview");
    // await expect(preview).toBeVisible();
    // await expect(preview).toContainText("Encrypted rate payload");

    // const result = page.getByTestId("stream-result");
    // await expect(result).toBeVisible();
    // await expect(result).toContainText("Stream Created!");
    // await expect(result).toContainText("Streaming 1.5 ETH/month");
  });

  // TODO: Enable when wallet connection and fhEVM mocking is set up for tests
  test.skip("displays created streams list when wallet connected", async ({ page }) => {
    // This test requires:
    // 1. Wallet connection
    // 2. Mocked streams from blockchain

    await page.goto("/employer");

    // Should show streams list section
    // await expect(page.getByRole("heading", { name: /Your Streams/ })).toBeVisible();

    // When streams exist, should show stream cards
    // Should be clickable links to /stream/[id]
  });
});
