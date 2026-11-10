import { expect, test } from "@playwright/test";

import { signIn, signInFromHome } from "./fixtures";

test("CA-02, RF-ACC-03: sin sesión va al ingreso y después vuelve a la pantalla pedida", async ({
  page,
}) => {
  await page.goto("/huespedes?tab=cam");

  await expect(page).toHaveURL(
    "/iniciar-sesion?redirectTo=%2Fhuespedes%3Ftab%3Dcam",
  );
  await signIn(page);
  await expect(page).toHaveURL("/huespedes?tab=cam");
});

test("RF-ACC-02: ingresa y ve el Inicio dentro del shell", async ({ page }) => {
  await signInFromHome(page);

  await expect(
    page.getByText("Todavía no hay reportes para mostrar."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inicio" }).first(),
  ).toBeVisible();
});

test("RF-UX-01: con una contraseña incorrecta avisa sin decir si el correo existe", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion");

  await signIn(page, "otra-clave-incorrecta");

  await expect(
    page.getByText("El correo o la contraseña no son correctos."),
  ).toBeVisible();
  await expect(page).toHaveURL("/iniciar-sesion");
});

test("RF-ACC-08: cerrar sesión vuelve al ingreso y vuelve a proteger el Inicio", async ({
  page,
}) => {
  await signInFromHome(page);

  await page.getByRole("button", { name: "Ana Prueba" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL("/iniciar-sesion");
  await page.goto("/");
  await expect(page).toHaveURL("/iniciar-sesion");
});

test("RNF-15: en el teléfono el Inicio usa la navegación inferior sin desplazarse de costado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInFromHome(page);

  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
