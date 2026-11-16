import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const DOCUMENTATION_PATH = "/documentacion";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.130" } });

test("RF-MAN-01: el manual se abre desde el menú y cada sección tiene su página", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  await page.getByRole("link", { name: "Documentación", exact: true }).click();
  await expect(page).toHaveURL(`${DOCUMENTATION_PATH}/como-se-usa`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Documentación" }),
  ).toBeVisible();

  const index = page.getByRole("navigation", { name: "Secciones del manual" });
  await index.getByRole("link", { name: "Catálogos" }).click();
  await expect(page).toHaveURL(`${DOCUMENTATION_PATH}/catalogos`);
  await expect(
    page.getByRole("heading", { level: 2, name: "Catálogos" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Ingreso" }),
  ).toHaveCount(0);
  await expect(index.getByRole("link", { name: "Catálogos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("RF-MAN-01: una sección que no existe lleva a la primera sección", async ({
  page,
}) => {
  await page.goto(`${DOCUMENTATION_PATH}/no-existe`);
  await signIn(page);

  await expect(page).toHaveURL(`${DOCUMENTATION_PATH}/como-se-usa`);
});

test("RF-ROL-03: el rol Usuario ve solo las secciones de lo que puede usar", async ({
  page,
}) => {
  const email = "solo.documentacion@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(DOCUMENTATION_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  const index = page.getByRole("navigation", { name: "Secciones del manual" });
  await expect(index.getByRole("link", { name: "Mi cuenta" })).toBeVisible();
  await expect(index.getByRole("link", { name: "Roles" })).toHaveCount(0);

  await page.goto(`${DOCUMENTATION_PATH}/roles`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
});

test("RF-ROL-09: sin permiso de Documentación no aparece en el menú y la pantalla queda restringida", async ({
  page,
}) => {
  const email = "sin.documentacion@hospicare.test";
  const roleId = await createRoleWithPermissions("Sin documentación", [
    "admin.religion_options.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Documentación", exact: true }),
  ).toHaveCount(0);

  await page.goto(DOCUMENTATION_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
});
