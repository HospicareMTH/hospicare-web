import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "DATABASE_URL debe ser una URL de PostgreSQL.",
  }),
});

let database: NodePgDatabase | undefined;

export function getDatabase(): NodePgDatabase {
  if (database) {
    return database;
  }

  const { DATABASE_URL } = databaseEnvironmentSchema.parse(process.env);
  database = drizzle({ client: new Pool({ connectionString: DATABASE_URL }) });
  return database;
}

export async function checkDatabaseConnection(): Promise<void> {
  await getDatabase().execute(sql`select 1`);
}
