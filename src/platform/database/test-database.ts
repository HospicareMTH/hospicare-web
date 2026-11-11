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
    await pool.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
  });
}
