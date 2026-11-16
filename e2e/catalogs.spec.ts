import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

const CATALOGS_PATH = "/admin/catalogos";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.100" } });

test("RF-CAT-01: el Super user recorre los catálogos de Admisiones y Huéspedes", async ({
  page,
}) => {
  await page.goto(CATALOGS_PATH);
  await signIn(page);

  await expect(
    page.getByRole("link", { name: "Catálogos", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("combobox", { name: "Catálogo" })).toHaveText(
    "Vínculos",
  );
  await expect(page.getByRole("row", { name: /Hija\/o/ })).toBeVisible();

  await page.getByRole("link", { name: "Huéspedes", exact: true }).click();
  await expect(page).toHaveURL(/catalogo=motivo-de-internacion/);
  await expect(page.getByRole("combobox", { name: "Catálogo" })).toHaveText(
    "Motivo de internación",
  );

  await page.getByRole("combobox", { name: "Catálogo" }).click();
  await page.getByRole("option", { name: "Deambulación", exact: true }).click();
  await expect(page).toHaveURL(/catalogo=deambulacion/);
  await expect(page.getByRole("row", { name: /No deambula/ })).toBeVisible();
});

test("RF-ROL-09: un catálogo sin permiso muestra acceso restringido", async ({
  page,
}) => {
  const email = "solo.religion@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo religión", [
    "admin.religion_options.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto(CATALOGS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(page.getByRole("combobox", { name: "Catálogo" })).toHaveText(
    "Religión",
  );
  await expect(
    page.getByRole("link", { name: "Huéspedes", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nueva opción" })).toHaveCount(
    0,
  );

  await page.goto(`${CATALOGS_PATH}?catalogo=vinculos`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("RF-CAT-01, RF-CAT-02: crea, edita, desactiva y reactiva una opción", async ({
  page,
}) => {
  await page.goto(`${CATALOGS_PATH}?catalogo=cirugia`);
  await signIn(page);

  await page.getByRole("button", { name: "Nueva opción" }).click();
  await page.getByLabel("Nombre").fill("Colectomía");
  await page.getByRole("button", { name: "Crear opción" }).click();
  await expect(page.getByText("Opción creada.")).toBeVisible();

  const optionRow = page.getByRole("row", { name: /Colectomía/ });
  await optionRow
    .getByRole("button", { name: "Acciones de Colectomía" })
    .click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await page.getByLabel("Nombre").fill("Colectomía parcial");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Opción actualizada.")).toBeVisible();

  await optionRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Desactivar" }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await expect(page.getByText("Opción desactivada.")).toBeVisible();
  await expect(optionRow).toHaveCount(0);

  await page.getByRole("combobox", { name: "Filtrar por estado" }).click();
  await page.getByRole("option", { name: "Inactivas" }).click();
  await expect(optionRow).toContainText("Inactiva");
  await optionRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Reactivar" }).click();
  await page.getByRole("button", { name: "Reactivar", exact: true }).click();
  await expect(page.getByText("Opción reactivada.")).toBeVisible();
  await expect(optionRow).toHaveCount(0);
});

test("RF-CAT-03: reordena con los botones y arrastrando, y Vínculos conserva su orden", async ({
  page,
}) => {
  await page.goto(`${CATALOGS_PATH}?catalogo=tratamiento-oncologico`);
  await signIn(page);
  const optionRows = page
    .getByRole("row")
    .filter({ hasNot: page.getByRole("columnheader") });

  await expect(
    page.getByRole("button", { name: "Subir No recibirá" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Subir No convencional" }).click();
  await expect(page.getByText("Orden guardado.")).toBeVisible();
  await expect(optionRows.nth(1)).toContainText("No convencional");

  await expect(
    page.getByRole("button", { name: "Subir No convencional" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Mover No recibirá" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Tomaste No recibirá.")).toBeAttached();
  // dnd-kit escucha las flechas recién en el ciclo siguiente a tomar la fila.
  await expect(async () => {
    if ((await page.getByText("Tomaste No recibirá.").count()) > 0) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(
      page.getByText("No recibirá está sobre No convencional."),
    ).toBeAttached({ timeout: 1000 });
  }).toPass();
  await page.keyboard.press("Space");
  await expect(
    page.getByText("No recibirá quedó en el lugar de No convencional."),
  ).toBeAttached();
  await expect(optionRows.nth(0)).toContainText("No convencional");
  await expect(optionRows.nth(1)).toContainText("No recibirá");

  await page.reload();
  await expect(optionRows.nth(0)).toContainText("No convencional");
  await expect(optionRows.nth(2)).toContainText("Suspensión definitiva");

  await page.goto(`${CATALOGS_PATH}?catalogo=vinculos`);
  await expect(page.getByRole("row", { name: /Hija\/o/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Subir|Mover) / }),
  ).toHaveCount(0);
});

test("RF-CAT-01, RF-CAT-02: gestiona Profesionales de salud en orden alfabético", async ({
  page,
}) => {
  await page.goto(`${CATALOGS_PATH}?catalogo=profesionales-de-salud`);
  await signIn(page);
  await expect(page.getByRole("combobox", { name: "Catálogo" })).toHaveText(
    "Profesionales de salud",
  );
  await expect(
    page.getByText("Todavía no hay profesionales cargados."),
  ).toBeVisible();
  const professionalDialog = page.getByRole("dialog");

  for (const fullName of ["Zulema Ficticia", "Ana Ficticia"]) {
    await page.getByRole("button", { name: "Nuevo profesional" }).click();
    await professionalDialog.getByLabel("Nombre").fill(fullName);
    await professionalDialog
      .getByLabel("Correo")
      .fill(`${fullName.split(" ")[0]}@hospicare.test`);
    await professionalDialog
      .getByRole("button", { name: "Crear profesional" })
      .click();
    await expect(page.getByText("Profesional creado.")).toBeVisible();
  }
  const professionalRows = page
    .getByRole("row")
    .filter({ hasNot: page.getByRole("columnheader") });
  await expect(professionalRows.nth(0)).toContainText("Ana Ficticia");
  await expect(professionalRows.nth(1)).toContainText("Zulema Ficticia");

  await page.getByRole("button", { name: "Nuevo profesional" }).click();
  await professionalDialog.getByLabel("Nombre").fill("Otra Ana Ficticia");
  await professionalDialog.getByLabel("Correo").fill("ANA@hospicare.test");
  await professionalDialog
    .getByRole("button", { name: "Crear profesional" })
    .click();
  await expect(
    page.getByText(
      "Ya hay un profesional activo con el correo ana@hospicare.test.",
    ),
  ).toBeVisible();
  await professionalDialog.getByRole("button", { name: "Cancelar" }).click();

  const zulemaRow = page.getByRole("row", { name: /Zulema Ficticia/ });
  await zulemaRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Desactivar" }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await expect(page.getByText("Profesional desactivado.")).toBeVisible();
  await expect(zulemaRow).toHaveCount(0);

  await page.getByRole("combobox", { name: "Filtrar por estado" }).click();
  await page.getByRole("option", { name: "Inactivos" }).click();
  await expect(zulemaRow).toContainText("Inactivo");
});
