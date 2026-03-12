import { expect, test } from "@playwright/test";

test.describe("Analytics page", () => {
  test("loads analytics page successfully", async ({ page }) => {
    await page.goto("/employer/analytics");
    await expect(page).toHaveURL("/employer/analytics");
  });

  test("shows wallet connect prompt when not connected", async ({ page }) => {
    await page.goto("/employer/analytics");
    await expect(
      page.getByRole("heading", { name: "Connect Your Wallet" })
    ).toBeVisible();
  });

  test("displays header navigation", async ({ page }) => {
    await page.goto("/employer/analytics");

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
