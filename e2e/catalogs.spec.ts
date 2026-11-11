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

  await page.goto(`${CATALOGS_PATH}?catalogo=vinculos`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
