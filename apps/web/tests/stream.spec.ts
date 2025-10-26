import { expect, test } from "@playwright/test";

test.describe("Stream detail view", () => {
  test("requires wallet connection", async ({ page }) => {
    await page.goto("/stream/0xdeadbeef");

    await expect(page.getByRole("heading", { name: /Connect Your Wallet/i })).toBeVisible();
    await expect(page.getByText(/access confidential payroll streams/i)).toBeVisible();
  });

  test("hides decrypt controls while disconnected", async ({ page }) => {
    await page.goto("/stream/0x1234");

    await expect(page.getByRole("button", { name: /Connect MetaMask/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Decrypt/i })).toHaveCount(0);
  });
});
