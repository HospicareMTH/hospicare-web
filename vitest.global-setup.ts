import {
  assertTestDatabase,
  migrateTestDatabase,
} from "./src/platform/database/test-database";

export async function setup() {
  assertTestDatabase(process.env.DATABASE_URL);
  if (process.env.DATABASE_MIGRATION_URL) {
    await migrateTestDatabase();
  }
}
