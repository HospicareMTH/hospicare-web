import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { assertTestDatabase } from "@/platform/database/test-database";

assertTestDatabase(process.env.DATABASE_URL);
assertTestDatabase(process.env.DATABASE_MIGRATION_URL);

afterEach(cleanup);
