import type { PlaywrightTestConfig } from "@playwright/test";

const PORT = 3100;

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E_TEST: "1",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry"
  }
};

export default config;
