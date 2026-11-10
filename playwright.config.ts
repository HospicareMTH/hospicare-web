import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

import { assertTestDatabase } from "./src/platform/database/test-database";

const E2E_PORT = 3100;
const BASE_URL = `http://localhost:${E2E_PORT}`;
const TEST_ENVIRONMENT_FILE = ".env.test.local";

if (existsSync(TEST_ENVIRONMENT_FILE)) {
  process.loadEnvFile(TEST_ENVIRONMENT_FILE);
}
assertTestDatabase(process.env.DATABASE_URL);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Las pruebas comparten la base de pruebas y el límite de intentos de ingreso.
  workers: 1,
  use: { baseURL: BASE_URL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run start --port ${E2E_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
