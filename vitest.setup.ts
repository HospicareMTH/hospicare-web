import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const TEST_DATABASE_NAME_SUFFIX = "-test";

function assertTestDatabase(databaseUrl: string | undefined) {
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

assertTestDatabase(process.env.DATABASE_URL);
assertTestDatabase(process.env.DATABASE_MIGRATION_URL);

afterEach(cleanup);
