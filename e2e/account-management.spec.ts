import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  markEmailVerified,
  signIn,
} from "./fixtures";

// Otra IP de documentación: los límites de ingreso y contraseña no se comparten con otros archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.80" } });

const NEW_PASSWORD = "otra-clave-de-prueba-larga";

test("RF-ADM-01: Administración abre con el resumen de accesos", async ({
  page,
}) => {
  await page.goto("/admin");
  await signIn(page);

  await expect(page.getByRole("link", { name: "Resumen" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const label of [
    "Roles",
    "Usuarios",
    "Usuarios activos",
    "Invitaciones pendientes",
  ]) {
    await expect(
      page.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) }),
    ).toBeVisible();
  }
});

test("RF-USR-02, RF-USR-03: administración crea un usuario y le cambia el rol", async ({
  page,
  browser,
}) => {
  const email = "tomas.ficticio@hospicare.test";
  await createRoleWithPermissions("Recepción", ["documentation.app.view"]);

  await page.goto("/admin/usuarios");
  await signIn(page);
  await page.getByRole("button", { name: "Crear usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill("Tomás Ficticio");
  await dialog.getByLabel("Correo electrónico").fill(email);
  await dialog
    .getByLabel("Contraseña inicial")
    .fill(FICTITIOUS_SUPER_USER.password);
  await dialog
    .getByLabel("Repetí la contraseña")
    .fill(FICTITIOUS_SUPER_USER.password);
  await dialog.getByRole("combobox", { name: "Rol" }).click();
  await page.getByRole("option", { name: "Usuario" }).click();
  await dialog.getByRole("checkbox", { name: "Correo verificado" }).check();
  await dialog.getByRole("button", { name: "Crear usuario" }).click();

  await expect(page.getByText("Usuario creado.")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row).toContainText("Usuario");

  await row.getByRole("button", { name: "Acciones de Tomás Ficticio" }).click();
  await page.getByRole("menuitem", { name: "Cambiar rol" }).click();
  await page.getByRole("combobox", { name: "Rol" }).click();
  await page.getByRole("option", { name: "Recepción" }).click();
  await page.getByRole("button", { name: "Guardar rol" }).click();
  await expect(page.getByText("Rol actualizado.")).toBeVisible();
  await expect(row).toContainText("Recepción");

  const createdPersonContext = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.81" },
  });
  const createdPersonPage = await createdPersonContext.newPage();
  await createdPersonPage.goto("/");
  await signIn(createdPersonPage, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    createdPersonPage.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();
  await createdPersonContext.close();
});

test("RF-ACC-15, RF-ACC-16: la persona cambia su nombre y su contraseña", async ({
  page,
}) => {
  const email = "sofia.ficticia@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));
  await markEmailVerified(email);

  await page.goto("/usuario");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await page.getByRole("textbox", { name: "Nombre" }).fill("Sofía Ficticia");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByText("Guardaste tu nombre.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sofía Ficticia/ }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Contraseña actual" })
    .fill(FICTITIOUS_SUPER_USER.password);
  await page
    .getByRole("textbox", { name: "Contraseña nueva", exact: true })
    .fill(NEW_PASSWORD);
  await page
    .getByRole("textbox", { name: "Repetí la contraseña nueva" })
    .fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Cambiaste tu contraseña.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/");
  await signIn(page, NEW_PASSWORD, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();
});
