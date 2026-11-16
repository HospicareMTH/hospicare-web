import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const TEST_DATABASE_NAME_SUFFIX = "-test";
const MIGRATIONS_FOLDER = "./drizzle";
const RESETTABLE_TABLES = [
  "audit_log",
  "user_roles",
  "accounts",
  "sessions",
  "verifications",
  "rate_limits",
  "users",
];

// Repite la siembra de drizzle/0003 para devolver los roles de sistema a su estado inicial.
const SEED_ROLE_PERMISSIONS_SQL = `
  INSERT INTO "role_permissions" ("role_id", "permission")
  SELECT "id", 'documentation.app.view' FROM "roles" WHERE "system_key" = 'user'
`;

const CATALOG_SEED_MIGRATION = `${MIGRATIONS_FOLDER}/0013_catalog_options_audit_and_seed.sql`;
const MIGRATION_STATEMENT_SEPARATOR = "--> statement-breakpoint";
const CATALOG_SEED_STATEMENT_START = 'INSERT INTO "catalog_options"';

async function readCatalogSeedSql(): Promise<string> {
  const migration = await readFile(CATALOG_SEED_MIGRATION, "utf8");
  const seedStatement = migration
    .split(MIGRATION_STATEMENT_SEPARATOR)
    .map((statement) => statement.trim())
    .find((statement) => statement.startsWith(CATALOG_SEED_STATEMENT_START));
  if (!seedStatement) {
    throw new Error(
      `No se encontró la siembra de catálogos en ${CATALOG_SEED_MIGRATION}.`,
    );
  }
  return seedStatement;
}

export function assertTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    return;
  }

  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.slice(1),
  );
  if (!databaseName.endsWith(TEST_DATABASE_NAME_SUFFIX)) {
    throw new Error(
      `Las pruebas solo corren contra una base cuyo nombre termina en "${TEST_DATABASE_NAME_SUFFIX}". Revisá .env.test.local.`,
    );
  }
}

function getMigrationDatabaseUrl(): string {
  const migrationDatabaseUrl = process.env.DATABASE_MIGRATION_URL;
  assertTestDatabase(migrationDatabaseUrl);
  if (!migrationDatabaseUrl) {
    throw new Error("Falta DATABASE_MIGRATION_URL en .env.test.local.");
  }
  return migrationDatabaseUrl;
}

async function withMigrationPool(
  work: (pool: Pool) => Promise<void>,
): Promise<void> {
  const pool = new Pool({ connectionString: getMigrationDatabaseUrl() });
  try {
    await work(pool);
  } finally {
    await pool.end();
  }
}

export function migrateTestDatabase(): Promise<void> {
  return withMigrationPool((pool) =>
    migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER }),
  );
}

export function resetTestDatabase(): Promise<void> {
  const tableList = RESETTABLE_TABLES.map((table) => `"${table}"`).join(", ");
  return withMigrationPool(async (pool) => {
    await pool.query(
      `TRUNCATE "invitations", "user_roles", "role_permissions"`,
    );
    await pool.query(`DELETE FROM "roles" WHERE "system_key" IS NULL`);
    await pool.query(SEED_ROLE_PERMISSIONS_SQL);
    // CASCADE también vacía catalog_options, que referencia a users.
    await pool.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
    await pool.query(await readCatalogSeedSql());
    await pool.query(`TRUNCATE "audit_log" RESTART IDENTITY`);
  });
}
