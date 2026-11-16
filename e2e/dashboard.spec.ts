import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.110" } });

test("RF-DAS-02: el reporte Calidad de datos muestra las opciones activas y enlaza al catálogo", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  const report = page.getByRole("region", { name: "Calidad de datos" });
  await expect(report.getByRole("row", { name: /Religión 7/ })).toBeVisible();
  await expect(
    report.getByRole("row", { name: /Lugar de metástasis 0/ }),
  ).toBeVisible();

  await report.getByRole("link", { name: "Religión" }).click();
  await expect(page).toHaveURL(/catalogo=religion/);
});

test("CA-20, RF-DAS-01: un rol sin permiso del reporte no lo ve", async ({
  page,
}) => {
  const email = "sin.reportes@hospicare.test";
  const roleId = await createRoleWithPermissions("Sin reportes", [
    "admin.religion_options.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByText("Todavía no hay reportes para mostrar."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Calidad de datos" }),
  ).toHaveCount(0);
});
