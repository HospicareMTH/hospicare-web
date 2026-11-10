import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

const LOCAL_ENVIRONMENT_FILE = ".env.local";

if (existsSync(LOCAL_ENVIRONMENT_FILE)) {
  process.loadEnvFile(LOCAL_ENVIRONMENT_FILE);
}

const migrationDatabaseUrl = process.env.DATABASE_MIGRATION_URL;

if (!migrationDatabaseUrl) {
  throw new Error("Falta DATABASE_MIGRATION_URL para ejecutar migraciones.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/tables.ts",
  out: "./drizzle",
  dbCredentials: { url: migrationDatabaseUrl },
  strict: true,
  verbose: true,
});
