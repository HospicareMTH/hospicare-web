import { expect, test } from "@playwright/test";

import {
  assignPermissions,
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const ROLES_PATH = "/admin/roles";

// Otra IP de documentación: estos ingresos no comparten el límite de 5 por minuto con session.spec.ts.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.20" } });

test("RF-ROL-04 a RF-ROL-07: el Super user crea un rol, le asigna permisos y lo elimina", async ({
  page,
}) => {
  await page.goto(ROLES_PATH);
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Roles" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuevo rol" }).click();
  await page.getByLabel("Nombre").fill("Asistencia espiritual");
  await page.getByRole("button", { name: "Crear rol" }).click();
  await expect(page.getByText("Rol creado.")).toBeVisible();

  const roleRow = page.getByRole("row", { name: /Asistencia espiritual/ });
  await roleRow
    .getByRole("button", { name: "Acciones de Asistencia espiritual" })
    .click();
  await page.getByRole("menuitem", { name: "Permisos" }).click();
  await page.getByRole("checkbox", { name: "Documentación" }).click();
  await page.getByRole("button", { name: "Guardar permisos" }).click();
  await expect(page.getByText("Permisos guardados.")).toBeVisible();

  await roleRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Eliminar" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Rol eliminado.")).toBeVisible();
  await expect(roleRow).toHaveCount(0);
});

test("RF-ROL-09: sin permiso muestra acceso restringido y oculta Administración", async ({
  page,
}) => {
  const email = "sin.permiso@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(ROLES_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(
    0,
  );
});

test("CA-04, RF-ACC-07: un cambio de permisos rige en la próxima pantalla sin volver a ingresar", async ({
  page,
}) => {
  const email = "trabajo.social@hospicare.test";
  const roleId = await createRoleWithPermissions("Trabajo social", []);
  await createFictitiousUser(email, roleId);

  await page.goto(ROLES_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();

  await assignPermissions(roleId, ["admin.roles.view"]);
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Roles" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo rol" })).toHaveCount(0);
});
