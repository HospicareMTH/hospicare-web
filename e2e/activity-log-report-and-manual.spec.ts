import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.220" } });

test("RF-DAS-02: el inicio muestra el reporte Accesos y lleva al registro de actividad", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  const report = page.getByRole("region", { name: "Accesos" });
  await expect(
    report.getByRole("row", {
      name: /Entradas del registro de actividad en los últimos 7 días \d+/,
    }),
  ).toBeVisible();

  await report.getByRole("link", { name: "Ver registro de actividad" }).click();
  await expect(page).toHaveURL("/admin/actividad");
});

test("RF-DAS-01, CA-20: con el reporte pero sin permiso de ver el registro, no hay enlace", async ({
  page,
}) => {
  const email = "solo.reporte.accesos@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo reporte de accesos", [
    "dashboard.accesses.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  const report = page.getByRole("region", { name: "Accesos" });
  await expect(report).toBeVisible();
  await expect(
    report.getByRole("link", { name: "Ver registro de actividad" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Admisiones" })).toHaveCount(0);
});

test("RF-MAN-02: el manual tiene la sección Registro de actividad", async ({
  page,
}) => {
  await page.goto("/documentacion");
  await signIn(page);

  await page
    .getByRole("navigation", { name: "Secciones del manual" })
    .getByRole("link", { name: "Registro de actividad" })
    .click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Registro de actividad" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Qué se registra" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Buscar y filtrar" }),
  ).toBeVisible();
});
