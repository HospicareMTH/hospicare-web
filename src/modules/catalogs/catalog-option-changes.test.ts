// @vitest-environment node

import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFirstSuperUser, getAuth } from "@/modules/access";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  createCatalogOptionAction,
  deactivateCatalogOptionAction,
  reactivateCatalogOptionAction,
  updateCatalogOptionAction,
} from "./actions";
import type { CatalogKey } from "./definitions";
import { catalogOptions } from "./tables";

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const FORBIDDEN_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;403";
const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

async function signInAsSuperUser(): Promise<string> {
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
  requestHeaders.current = new Headers({ cookie: sessionCookie });
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${FICTITIOUS_SUPER_USER.email}`,
  );
  const [user] = result.rows;
  if (!user) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return user.id;
}

async function restrictSignedInUserTo(permissions: string[]): Promise<void> {
  const database = getDatabase();
  const roleResult = await database.execute<{ id: string }>(
    sql`insert into roles (name) values ('Solo religión') returning id`,
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

async function findOption(catalog: CatalogKey, label: string) {
  const [option] = await getDatabase()
    .select()
    .from(catalogOptions)
    .where(
      and(eq(catalogOptions.catalog, catalog), eq(catalogOptions.label, label)),
    );
  if (!option) {
    throw new Error(`No existe la opción de prueba ${label}.`);
  }
  return option;
}

async function countOptions(catalog: CatalogKey): Promise<number> {
  return (
    await getDatabase()
      .select()
      .from(catalogOptions)
      .where(eq(catalogOptions.catalog, catalog))
  ).length;
}

describe("catálogos: cambios de opciones", () => {
  let superUserId: string;

  beforeEach(async () => {
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
    await resetTestDatabase();
    superUserId = await signInAsSuperUser();
  });

  it("RF-CAT-01, RN-20: crea la opción al final del catálogo con su responsable", async () => {
    await expect(
      createCatalogOptionAction("religion", {
        label: "  Budista ",
        description: "",
      }),
    ).resolves.toEqual({ status: "success", wasReactivated: false });

    const option = await findOption("religion", "Budista");
    expect(option).toMatchObject({
      description: null,
      isActive: true,
      isSystem: false,
      sortOrder: 80,
      createdByUserId: superUserId,
    });
    const audit = await getDatabase().execute<{ actor_user_id: string }>(
      sql`select actor_user_id from audit_log where action = 'catalog_option.created' and resource_id = ${option.id}`,
    );
    expect(audit.rows).toEqual([{ actor_user_id: superUserId }]);
  });

  it("RF-CAT-01: rechaza nombres de menos de 2 o más de 120 caracteres", async () => {
    await expect(
      createCatalogOptionAction("religion", { label: "B", description: "" }),
    ).resolves.toMatchObject({ status: "invalid" });
    await expect(
      createCatalogOptionAction("religion", {
        label: "B".repeat(121),
        description: "",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(await countOptions("religion")).toBe(7);
  });

  it("RF-CAT-06: rechaza un nombre activo repetido al crear y al editar", async () => {
    const galeno = await findOption("health_insurance", "Galeno");

    await expect(
      createCatalogOptionAction("health_insurance", {
        label: "osde",
        description: "",
      }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { label: ["Ya existe «osde» en este catálogo."] },
    });
    await expect(
      updateCatalogOptionAction(galeno.id, { label: "OSDE", description: "" }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { label: ["Ya existe «OSDE» en este catálogo."] },
    });
    expect((await findOption("health_insurance", "Galeno")).label).toBe(
      "Galeno",
    );
  });

  it("RF-CAT-02, RF-CAT-06: desactivar conserva la opción y crearla de nuevo la reactiva", async () => {
    const judio = await findOption("religion", "Judío");

    await expect(deactivateCatalogOptionAction(judio.id)).resolves.toEqual({
      status: "success",
    });
    expect((await findOption("religion", "Judío")).isActive).toBe(false);

    await expect(
      createCatalogOptionAction("religion", {
        label: "judio",
        description: "",
      }),
    ).resolves.toEqual({ status: "success", wasReactivated: true });

    const reactivated = await findOption("religion", "Judío");
    expect(reactivated.isActive).toBe(true);
    expect(reactivated.sortOrder).toBe(judio.sortOrder);
    expect(await countOptions("religion")).toBe(7);
  });

  it("RF-CAT-01: edita nombre y descripción, y reactiva desde la fila", async () => {
    const otra = await findOption("religion", "Otra");

    await expect(
      updateCatalogOptionAction(otra.id, {
        label: "Otra religión",
        description: "Declarada por la familia.",
      }),
    ).resolves.toEqual({ status: "success" });
    await deactivateCatalogOptionAction(otra.id);
    await expect(reactivateCatalogOptionAction(otra.id)).resolves.toEqual({
      status: "success",
    });

    expect(await findOption("religion", "Otra religión")).toMatchObject({
      description: "Declarada por la familia.",
      isActive: true,
      updatedByUserId: superUserId,
    });
  });

  it("CA-03, RF-ROL-08: sin permiso del catálogo el servidor rechaza sin cambiar datos", async () => {
    await restrictSignedInUserTo([
      "admin.religion_options.view",
      "admin.religion_options.create",
    ]);
    const osde = await findOption("health_insurance", "OSDE");
    const catolico = await findOption("religion", "Católico");

    await expect(
      createCatalogOptionAction("health_insurance", {
        label: "Nueva cobertura",
        description: "",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(deactivateCatalogOptionAction(osde.id)).rejects.toMatchObject({
      digest: FORBIDDEN_DIGEST,
    });
    await expect(
      updateCatalogOptionAction(catolico.id, {
        label: "Católica",
        description: "",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      deactivateCatalogOptionAction(catolico.id),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });

    expect(await countOptions("health_insurance")).toBe(18);
    expect((await findOption("health_insurance", "OSDE")).isActive).toBe(true);
    expect((await findOption("religion", "Católico")).isActive).toBe(true);
  });

  it("RF-CAT-06: con permiso de crear alcanza para reactivar por nombre repetido", async () => {
    await deactivateCatalogOptionAction(
      (await findOption("religion", "Mormón")).id,
    );
    await restrictSignedInUserTo([
      "admin.religion_options.view",
      "admin.religion_options.create",
    ]);

    await expect(
      createCatalogOptionAction("religion", {
        label: "Mormon",
        description: "",
      }),
    ).resolves.toEqual({ status: "success", wasReactivated: true });
  });
});
