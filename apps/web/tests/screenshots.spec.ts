import { test } from "@playwright/test";
import path from "path";

const screenshotDir = path.resolve(__dirname, "../../../screenshots");

test.describe("Screenshots", () => {
  test("capture landing page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "landing-page.png"),
      fullPage: true,
    });
  });

  test("capture employer page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/employer");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "employer-page.png"),
      fullPage: true,
    });
  });

  test("capture employee page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/employee");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "employee-page.png"),
      fullPage: true,
    });
  });

  test("capture vesting page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/vesting");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "vesting-page.png"),
      fullPage: true,
    });
  });

  test("capture airdrops page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/airdrops");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "airdrops-page.png"),
      fullPage: true,
    });
  });

  test("capture verify page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/verify");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "verify-page.png"),
      fullPage: true,
    });
  });

  test("capture analytics page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/employer/analytics");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "analytics-page.png"),
      fullPage: true,
    });
  });

  test("capture proof page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/employee/proof");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "proof-page.png"),
      fullPage: true,
    });
  });
});
