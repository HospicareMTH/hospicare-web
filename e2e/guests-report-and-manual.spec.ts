import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.85" } });

test("RF-DAS-02, 7.2: el inicio muestra el reporte Huéspedes y lleva al listado", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  const report = page.getByRole("region", { name: "Huéspedes", exact: true });
  await expect(
    report.getByRole("row", { name: /Huéspedes vigentes \d+/ }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", { name: /Ingresaron desde una entrevista \d+/ }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", {
      name: /Con obra social cargada (\d+ de \d+ \(\d+\s%\)|Sin huéspedes)/,
    }),
  ).toBeVisible();

  await report.getByRole("link", { name: "Ver huéspedes" }).click();
  await expect(page).toHaveURL("/huespedes");
});

test("RF-DAS-01, CA-20: con el reporte pero sin permiso de ver huéspedes, no hay enlace al listado", async ({
  page,
}) => {
  const email = "solo.reporte.huespedes@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo reporte de huéspedes", [
    "dashboard.guests.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  const report = page.getByRole("region", { name: "Huéspedes", exact: true });
  await expect(report).toBeVisible();
  await expect(report.getByRole("link", { name: "Ver huéspedes" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("region", { name: "Seguimiento clínico" }),
  ).toHaveCount(0);
});

test("RF-MAN-02: el manual tiene las secciones Huéspedes y Configuración", async ({
  page,
}) => {
  await page.goto("/documentacion");
  await signIn(page);

  const manualNavigation = page.getByRole("navigation", {
    name: "Secciones del manual",
  });
  await manualNavigation.getByRole("link", { name: "Huéspedes" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Huéspedes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Crear un huésped sin entrevista" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anular un huésped" }),
  ).toBeVisible();

  await manualNavigation.getByRole("link", { name: "Configuración" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Configuración" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ventana de edición de evoluciones diarias",
    }),
  ).toBeVisible();
});
