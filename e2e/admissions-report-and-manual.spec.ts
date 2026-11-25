import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.200" } });

test("RF-DAS-02: el inicio muestra el reporte Admisiones y lleva al listado", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  const report = page.getByRole("region", { name: "Admisiones" });
  await expect(
    report.getByRole("row", {
      name: /Entrevistas cargadas en los últimos 7 días \d+/,
    }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", {
      name: /Pasaron a huésped (\d+\s%\s\(\d+ de \d+\)|Sin entrevistas)/,
    }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", { name: /Pendientes de decisión \d+/ }),
  ).toBeVisible();

  await report.getByRole("link", { name: "Ver entrevistas" }).click();
  await expect(page).toHaveURL("/admisiones");
});

test("RF-DAS-01: con el reporte pero sin permiso de ver entrevistas, no hay enlace al listado", async ({
  page,
}) => {
  const email = "solo.reporte.admisiones@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo reporte de admisiones", [
    "dashboard.admissions.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  const report = page.getByRole("region", { name: "Admisiones" });
  await expect(report).toBeVisible();
  await expect(
    report.getByRole("link", { name: "Ver entrevistas" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Calidad de datos" }),
  ).toHaveCount(0);
});

test("RF-MAN-02: el manual tiene la sección Admisiones", async ({ page }) => {
  await page.goto("/documentacion");
  await signIn(page);

  await page
    .getByRole("navigation", { name: "Secciones del manual" })
    .getByRole("link", { name: "Admisiones" })
    .click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Admisiones" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cargar una entrevista" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Aceptar una entrevista" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anular una entrevista" }),
  ).toBeVisible();
});
