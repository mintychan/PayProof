import { expect, test } from "@playwright/test";

test.describe("Employee flow", () => {
  test("decrypts payslip locally", async ({ page }) => {
    await page.goto("/employee");
    await expect(page.getByTestId("payslip-card")).toBeVisible();
    await expect(page.getByTestId("decryption-summary")).toContainText("Plaintext hidden");

    const decryptButton = page.getByTestId("toggle-decrypt");
    await expect(decryptButton).toBeEnabled({ timeout: 15000 });
    await decryptButton.click();
    await expect(page.getByTestId("decryption-summary")).toContainText("This period");
  });
});
