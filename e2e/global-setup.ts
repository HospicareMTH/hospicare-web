import { createFirstSuperUser } from "../src/modules/access";
import {
  migrateTestDatabase,
  resetTestDatabase,
} from "../src/platform/database/test-database";

import { FICTITIOUS_SUPER_USER } from "./fixtures";

export default async function globalSetup() {
  await migrateTestDatabase();
  await resetTestDatabase();
  await createFirstSuperUser(FICTITIOUS_SUPER_USER);
}
