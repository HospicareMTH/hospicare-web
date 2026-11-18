import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
  signInFromHome,
} from "./fixtures";

const NO_RESULTS_MESSAGE = "No encontramos nada con ese nombre.";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.240" } });

test("RF-BUS-01, RF-BUS-02: el botón del menú abre el buscador, que ignora acentos y abre la pantalla", async ({
  page,
}) => {
  await signInFromHome(page);

  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Buscar" });
  await search.getByRole("combobox").fill("CATALOGOS");
  await search.getByRole("option", { name: "Catálogos" }).first().click();

  await expect(page).toHaveURL(/\/admin\/catalogos/);
  await expect(search).toHaveCount(0);
});

test("RF-BUS-01, RF-MAN-01: Ctrl + K abre el buscador y encuentra una sección del manual", async ({
  page,
}) => {
  await signInFromHome(page);

  await page.keyboard.press("Control+K");
  const search = page.getByRole("dialog", { name: "Buscar" });
  await search.getByRole("combobox").fill("registro de actividad");
  await search
    .getByRole("group", { name: "Manual" })
    .getByRole("option", { name: "Registro de actividad" })
    .click();

  await expect(page).toHaveURL("/documentacion/registro-de-actividad");
});

test("RF-BUS-02, RF-ROL-03: el rol Usuario no encuentra lo que no puede abrir", async ({
  page,
}) => {
  const email = "solo.buscador@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Buscar" });
  await search.getByRole("combobox").fill("registro de actividad");

  await expect(search.getByText(NO_RESULTS_MESSAGE)).toBeVisible();
});

test("RF-BUS-01, RNF-15: en el teléfono el buscador se abre desde Menú", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInFromHome(page);

  await page.getByRole("button", { name: "Menú" }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Buscar" });
  await search.getByRole("combobox").fill("mi cuenta");
  await search
    .getByRole("group", { name: "Pantallas" })
    .getByRole("option", { name: "Mi cuenta" })
    .click();

  await expect(page).toHaveURL("/usuario");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
