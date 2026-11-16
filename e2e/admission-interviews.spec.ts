import { expect, test } from "@playwright/test";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import {
  createFictitiousUser,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const ADMISSIONS_PATH = "/admisiones";
const MOBILE_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.140" } });

test("RF-ENT-01: el listado muestra las entrevistas y busca por DNI con puntos", async ({
  page,
}) => {
  await insertInterview({
    guestFirstName: "Rosa",
    guestLastName: "Listado",
    guestDni: "30111222",
  });

  await page.goto(ADMISSIONS_PATH);
  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Admisiones" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Admisiones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Rosa Listado.*DNI 30\.111\.222/ }),
  ).toBeVisible();

  const searchBox = page.getByRole("searchbox", {
    name: "Buscar entrevistas",
  });
  await searchBox.fill("30.111");
  await searchBox.press("Enter");
  await expect(page).toHaveURL(/buscar=30\.111/);
  await expect(page.getByRole("row", { name: /Rosa Listado/ })).toBeVisible();

  await searchBox.fill("Nadie Coincide");
  await searchBox.press("Enter");
  await expect(
    page.getByText("Ninguna entrevista coincide con “Nadie Coincide”."),
  ).toBeVisible();
});

test("RF-ROL-09: sin permiso de Admisiones no aparece el destino y la pantalla muestra acceso restringido", async ({
  page,
}) => {
  const email = "sin.admisiones@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(ADMISSIONS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Admisiones", exact: true }),
  ).toHaveCount(0);
});

for (const viewport of MOBILE_VIEWPORTS) {
  test(`RNF-15: Admisiones está en la navegación inferior y sin desplazamiento horizontal a ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(ADMISSIONS_PATH);
    await signIn(page);

    await expect(
      page
        .getByRole("navigation", { name: "Navegación principal" })
        .getByRole("link", { name: "Admisiones" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Admisiones" }),
    ).toBeVisible();
    const overflowInPixels = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflowInPixels).toBe(0);
  });
}
