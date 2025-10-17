import { expect, test } from "@playwright/test";

test.describe("Verifier flow", () => {
  test("returns attestation result", async ({ page }) => {
    await page.goto("/verify");
    await page.fill("input[name=threshold]", "3000");
    await page.fill("input[name=lookback]", "30");
    await page.click("button[type=submit]");

    const result = page.getByTestId("attestation-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Threshold met");
    await expect(result).toContainText("Tier: B");
  });
});
