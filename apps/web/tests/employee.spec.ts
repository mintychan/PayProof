import { expect, test } from "@playwright/test";

test.describe("Employee flow", () => {
  test("decrypts payslip locally", async ({ page }) => {
    await page.goto("/employee");
    await expect(page.getByTestId("payslip-card")).toBeVisible();
    await expect(page.getByTestId("decryption-summary")).toContainText("Plaintext hidden");

    await page.getByTestId("toggle-decrypt").click();
    await expect(page.getByTestId("decryption-summary")).toContainText("This period");
  });
});
