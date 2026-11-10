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

export const DATABASE_CASING = "snake_case";

let database: NodePgDatabase | undefined;

export function getDatabase(): NodePgDatabase {
  if (database) {
    return database;
  }

  const { DATABASE_URL } = databaseEnvironmentSchema.parse(process.env);
  database = drizzle({
    client: new Pool({ connectionString: DATABASE_URL }),
    casing: DATABASE_CASING,
  });
  return database;
}

export type DatabaseTransaction = Parameters<
  Parameters<NodePgDatabase["transaction"]>[0]
>[0];

export function runInTransaction<Result>(
  work: (transaction: DatabaseTransaction) => Promise<Result>,
): Promise<Result> {
  return getDatabase().transaction(work);
}

export function runInTransactionAs<Result>(
  actorUserId: string,
  work: (transaction: DatabaseTransaction) => Promise<Result>,
): Promise<Result> {
  return runInTransaction(async (transaction) => {
    // Los triggers del registro de actividad leen al responsable de esta variable.
    await transaction.execute(
      sql`select set_config('hospicare.actor_user_id', ${actorUserId}, true)`,
    );
    return work(transaction);
  });
}

export async function checkDatabaseConnection(): Promise<void> {
  await getDatabase().execute(sql`select 1`);
}
