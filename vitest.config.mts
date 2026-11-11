import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const TEST_ENVIRONMENT_FILE = ".env.test.local";

if (existsSync(TEST_ENVIRONMENT_FILE)) {
  process.loadEnvFile(TEST_ENVIRONMENT_FILE);
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    // Las pruebas de base comparten hospicare-web-test y la vacían entre casos.
    fileParallelism: false,
  },
});
