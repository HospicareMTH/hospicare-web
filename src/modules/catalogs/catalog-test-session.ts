import { sql } from "drizzle-orm";

import { createFirstSuperUser, getAuth } from "@/modules/access";
import { getDatabase } from "@/platform/database/client";

export const FORBIDDEN_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;403";

const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

export const testRequestHeaders = { current: new Headers() };

export async function signInAsSuperUser(): Promise<string> {
  await createFirstSuperUser(FICTITIOUS_SUPER_USER);
  const response = await getAuth().api.signInEmail({
    body: {
      email: FICTITIOUS_SUPER_USER.email,
      password: FICTITIOUS_SUPER_USER.password,
    },
    asResponse: true,
  });
  const sessionCookie = response.headers.get("set-cookie");
  if (!sessionCookie) {
    throw new Error("No se obtuvo la sesión de prueba.");
  }
  testRequestHeaders.current = new Headers({ cookie: sessionCookie });
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${FICTITIOUS_SUPER_USER.email}`,
  );
  const [user] = result.rows;
  if (!user) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return user.id;
}

export async function restrictSignedInUserTo(
  permissions: string[],
): Promise<void> {
  const database = getDatabase();
  const roleResult = await database.execute<{ id: string }>(
    sql`insert into roles (name) values ('Rol restringido') returning id`,
  );
  const [role] = roleResult.rows;
  if (!role) {
    throw new Error("No se creó el rol de prueba.");
  }
  for (const permission of permissions) {
    await database.execute(
      sql`insert into role_permissions (role_id, permission) values (${role.id}, ${permission})`,
    );
  }
  await database.execute(sql`update user_roles set role_id = ${role.id}`);
}
