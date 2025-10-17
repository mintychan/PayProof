import { expect, test } from "@playwright/test";

test.describe("Employer flow", () => {
  test("renders form and shows encryption preview", async ({ page }) => {
    await page.goto("/employer");
    await expect(page.getByRole("heading", { name: "Stream encrypted payroll to your team" })).toBeVisible();

    await page.fill("input[name=employer]", "0x1234");
    await page.fill("input[name=employee]", "0xabcd");
    await page.fill("input[name=rate]", "250");
    await page.click("button[type=submit]");

    const preview = page.getByTestId("encryption-preview");
    await expect(preview).toBeVisible();
    await expect(page.getByTestId("stream-result")).toContainText("will accrue 250 units");
  });
});
