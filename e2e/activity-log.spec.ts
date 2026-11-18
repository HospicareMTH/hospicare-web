import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const ACTIVITY_LOG_PATH = "/admin/actividad";

// Otra IP de documentación: estos ingresos no comparten el límite de 5 por minuto con las demás pruebas.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.210" } });

test("CA-19, RF-LOG-01, RF-LOG-02: un cambio figura con acción, responsable y recurso, y se filtra por recurso", async ({
  page,
}) => {
  await createRoleWithPermissions("Registro ficticio", []);

  await page.goto(ACTIVITY_LOG_PATH);
  await signIn(page);
  await expect(
    page.getByRole("link", { name: "Registro de actividad" }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("combobox", { name: "Filtrar por recurso" }).click();
  await page.getByRole("option", { name: "Rol", exact: true }).click();
  await expect(page).toHaveURL(/recurso=rol(&|$)/);

  const latestRoleCreatedRow = page
    .getByRole("row", { name: /Rol creado/ })
    .first();
  await expect(latestRoleCreatedRow).toContainText(FICTITIOUS_SUPER_USER.name);
  await expect(latestRoleCreatedRow).toContainText("Completada");
  await expect(
    latestRoleCreatedRow.getByRole("cell", { name: "Rol", exact: true }),
  ).toBeVisible();
});

test("RF-LOG-02: busca por acción sin distinguir acentos", async ({ page }) => {
  await page.goto(ACTIVITY_LOG_PATH);
  await signIn(page);
  await expect(page.getByRole("table")).toBeVisible();

  const search = page.getByRole("searchbox", {
    name: "Buscar acción o persona",
  });
  await search.fill("sesion iniciada");
  await search.press("Enter");

  await expect(page).toHaveURL(/buscar=sesion/);
  await expect(
    page.getByRole("row", { name: /Sesión iniciada/ }),
  ).not.toHaveCount(0);
  await expect(page.getByRole("row", { name: /Rol creado/ })).toHaveCount(0);
});

test("RF-ROL-09: sin permiso muestra acceso restringido", async ({ page }) => {
  const email = "sin.registro@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(ACTIVITY_LOG_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("RNF-15: el registro no se desplaza de costado en el teléfono", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ACTIVITY_LOG_PATH);
  await signIn(page);

  await expect(page.getByRole("table")).toBeVisible();
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
