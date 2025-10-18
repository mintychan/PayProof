import { expect, test } from "@playwright/test";

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

  // TODO: Enable when wallet connection and fhEVM mocking is set up for tests
  test.skip("renders proof-of-income attestation form when wallet connected", async ({ page }) => {
    // This test requires:
    // 1. Mocked wallet connection with wagmi
    // 2. Mocked fhEVM provider initialized

    await page.goto("/verify");

    await expect(page.getByRole("heading", { name: "Verifier Console" })).toBeVisible();
    await expect(page.getByText("Request Proof-of-Income")).toBeVisible();

    // Form should have employer address, threshold, and lookback fields
    await expect(page.locator("input[name=employer]")).toBeVisible();
    await expect(page.locator("input[name=threshold]")).toBeVisible();
    await expect(page.locator("input[name=lookback]")).toBeVisible();
  });

  // TODO: Enable when wallet connection, fhEVM, and blockchain mocking is set up for tests
  test.skip("creates encrypted attestation and shows result", async ({ page }) => {
    // This test requires full integration with:
    // 1. Wallet connection
    // 2. fhEVM initialization and encryption
    // 3. IncomeOracle contract interaction
    // 4. Existing payroll stream between employer and employee

    await page.goto("/verify");

    // Fill in the attestation form
    // await page.fill("input[name=employer]", "0x1234567890123456789012345678901234567890");
    // await page.fill("input[name=threshold]", "1.5");
    // await page.fill("input[name=lookback]", "30");

    // Submit should trigger encryption and on-chain attestation
    // await page.click("button[type=submit]");

    // Should show encrypted threshold payload
    // const preview = page.getByTestId("threshold-ciphertext");
    // await expect(preview).toBeVisible();
    // await expect(preview).toContainText("Encrypted threshold payload");

    // Should show attestation success with encrypted handles
    // const result = page.getByTestId("attestation-result");
    // await expect(result).toBeVisible();
    // await expect(result).toContainText("On-chain Attestation Successful");
    // await expect(result).toContainText("Transaction Hash");
  });

  // TODO: Enable when wallet connection, fhEVM, and blockchain mocking is set up for tests
  test.skip("decrypts attestation result and shows tier", async ({ page }) => {
    // This test requires:
    // 1. Successful attestation (previous test scenario)
    // 2. fhEVM decryption capability

    await page.goto("/verify");

    // After creating attestation (mocked):
    // const decryptButton = page.getByRole("button", { name: /Decrypt Result/i });
    // await expect(decryptButton).toBeVisible();
    // await decryptButton.click();

    // Should show decrypted result with success/failure and tier
    // If threshold met:
    // await expect(page.getByText("Threshold Met!")).toBeVisible();
    // await expect(page.getByText(/Tier [ABC]/)).toBeVisible();

    // If threshold not met:
    // await expect(page.getByText("Threshold Not Met")).toBeVisible();
  });

  // TODO: Enable when wallet connection mocking is set up for tests
  test.skip("validates form inputs when wallet connected", async ({ page }) => {
    // This test requires mocked wallet connection

    await page.goto("/verify");

    // Should show error for invalid employer address
    // await page.fill("input[name=employer]", "invalid");
    // await page.fill("input[name=threshold]", "1");
    // await page.click("button[type=submit]");
    // await expect(page.getByText("Please enter a valid employer address")).toBeVisible();

    // Should check for stream existence
    // When no stream exists between employer and employee:
    // await expect(page.getByText(/No active stream found/)).toBeVisible();
  });
});
