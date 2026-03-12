import { expect, test } from "@playwright/test";

test.describe("Proof of Employment page", () => {
  test("loads proof page successfully", async ({ page }) => {
    await page.goto("/employee/proof");
    await expect(page).toHaveURL("/employee/proof");
  });

  test("shows wallet connect prompt when not connected", async ({ page }) => {
    await page.goto("/employee/proof");
    await expect(
      page.getByRole("heading", { name: "Connect Your Wallet" })
    ).toBeVisible();
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/employee/proof");

    await expect(page.getByText("PayProof")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Home/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Payments/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Verify/i }).first()
    ).toBeVisible();
  });
});
