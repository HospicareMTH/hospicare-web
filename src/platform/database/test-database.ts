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

const MIGRATION_STATEMENT_SEPARATOR = "--> statement-breakpoint";

type MigrationStatement = {
  migration: string;
  statementStart: string;
};

const CATALOG_SEED_STATEMENTS: readonly MigrationStatement[] = [
  {
    migration: `${MIGRATIONS_FOLDER}/0013_catalog_options_audit_and_seed.sql`,
    statementStart: 'INSERT INTO "catalog_options"',
  },
  {
    migration: `${MIGRATIONS_FOLDER}/0017_admission_interviews_audit.sql`,
    statementStart: 'UPDATE "catalog_options" SET "system_key"',
  },
  {
    migration: `${MIGRATIONS_FOLDER}/0024_physical_admission_evaluations_audit.sql`,
    statementStart: 'UPDATE "catalog_options" SET "system_key"',
  },
];

const SYSTEM_SETTINGS_SEED_STATEMENTS: readonly MigrationStatement[] = [
  {
    migration: `${MIGRATIONS_FOLDER}/0020_guests_and_settings_audit.sql`,
    statementStart: 'INSERT INTO "system_settings"',
  },
  {
    migration: `${MIGRATIONS_FOLDER}/0026_daily_evolutions_audit.sql`,
    statementStart: 'INSERT INTO "system_settings"',
  },
];

async function readMigrationStatement({
  migration,
  statementStart,
}: MigrationStatement): Promise<string> {
  const migrationSql = await readFile(migration, "utf8");
  const statement = migrationSql
    .split(MIGRATION_STATEMENT_SEPARATOR)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith(statementStart));
  if (!statement) {
    throw new Error(`No se encontró "${statementStart}" en ${migration}.`);
  }
  return statement;
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
    // CASCADE también vacía catalog_options, admission_interviews, guests, sus evaluaciones, sus evoluciones y system_settings, que referencian a users.
    await pool.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
    for (const seedStatement of CATALOG_SEED_STATEMENTS) {
      await pool.query(await readMigrationStatement(seedStatement));
    }
    for (const seedStatement of SYSTEM_SETTINGS_SEED_STATEMENTS) {
      await pool.query(await readMigrationStatement(seedStatement));
    }
    await pool.query(`TRUNCATE "audit_log" RESTART IDENTITY`);
  });
}
