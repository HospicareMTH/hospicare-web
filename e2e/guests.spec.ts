import { expect, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import {
  createFictitiousUser,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const GUESTS_PATH = "/huespedes";
const MOBILE_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.50" } });

test("RF-HUE-01: el listado muestra el número de historia clínica y busca por DNI con puntos", async ({
  page,
}) => {
  await insertGuest({
    clinicalRecordNumber: 900_001,
    firstName: "Rosa",
    lastName: "Listado",
    dni: "30111999",
  });

  await page.goto(GUESTS_PATH);
  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Huéspedes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /900001.*Rosa Listado.*30\.111\.999/ }),
  ).toBeVisible();

  const searchBox = page.getByRole("searchbox", { name: "Buscar huéspedes" });
  await searchBox.fill("30.111.999");
  await searchBox.press("Enter");
  await expect(page).toHaveURL(/buscar=30\.111\.999/);
  await expect(page.getByRole("row", { name: /Rosa Listado/ })).toBeVisible();

  await searchBox.fill("Nadie Coincide");
  await searchBox.press("Enter");
  await expect(
    page.getByText("Ningún huésped coincide con “Nadie Coincide”."),
  ).toBeVisible();
});

test("RF-ROL-09: sin permiso de Huéspedes no aparece el destino y la pantalla muestra acceso restringido", async ({
  page,
}) => {
  const email = "sin.huespedes@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(GUESTS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Huéspedes", exact: true }),
  ).toHaveCount(0);
});

for (const viewport of MOBILE_VIEWPORTS) {
  test(`RNF-15: Huéspedes está en la navegación inferior y sin desplazamiento horizontal a ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(GUESTS_PATH);
    await signIn(page);

    await expect(
      page
        .getByRole("navigation", { name: "Navegación principal" })
        .getByRole("link", { name: "Huéspedes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Huéspedes" }),
    ).toBeVisible();
    const overflowInPixels = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflowInPixels).toBe(0);
  });
}
