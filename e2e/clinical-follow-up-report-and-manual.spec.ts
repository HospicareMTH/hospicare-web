import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.105" } });

const EVALUATED_SHARE = /(\d+ de \d+ evaluados|Sin evaluaciones)/;

test("RF-DAS-02, 7.2: el inicio muestra el reporte Seguimiento clínico", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);

  const report = page.getByRole("region", { name: "Seguimiento clínico" });
  await expect(
    report.getByRole("row", {
      name: new RegExp(
        `Delirium probable en la evaluación CAM ${EVALUATED_SHARE.source}`,
      ),
    }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", {
      name: new RegExp(
        `Úlceras en la evaluación física de ingreso ${EVALUATED_SHARE.source}`,
      ),
    }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", {
      name: /Evoluciones registradas en los últimos 7 días \d+/,
    }),
  ).toBeVisible();
});

test("RF-DAS-01, CA-20: un rol con solo este reporte no ve los demás", async ({
  page,
}) => {
  const email = "solo.seguimiento.clinico@hospicare.test";
  const roleId = await createRoleWithPermissions(
    "Solo reporte de seguimiento clínico",
    ["dashboard.clinical_follow_up.view"],
  );
  await createFictitiousUser(email, roleId);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("region", { name: "Seguimiento clínico" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Huéspedes", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Admisiones" })).toHaveCount(0);
});

test("RF-MAN-02: el manual tiene las secciones Evaluaciones y Evolución diaria", async ({
  page,
}) => {
  await page.goto("/documentacion");
  await signIn(page);

  const manualNavigation = page.getByRole("navigation", {
    name: "Secciones del manual",
  });
  await manualNavigation.getByRole("link", { name: "Evaluaciones" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Evaluaciones" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evaluación CAM" }),
  ).toBeVisible();

  await manualNavigation
    .getByRole("link", { name: "Evolución diaria" })
    .click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Evolución diaria" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Agregar una nota aclaratoria" }),
  ).toBeVisible();
});
