import { expect, test } from "@playwright/test";

import { generateTotpCode } from "../src/modules/access/test-fixtures";
import {
  createFictitiousUser,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  markEmailVerified,
  signIn,
} from "./fixtures";

// Otra IP de documentación: los límites de ingreso y segundo factor no se comparten con otros archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.60" } });

test("RF-ACC-09, 8.3: sin correo verificado, Inicio avisa y lleva a Mi cuenta", async ({
  page,
}) => {
  const email = "ines.ficticia@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByText("Verificá tu correo para poder activar el segundo factor."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Verificar mi correo" }).click();

  await expect(page).toHaveURL("/usuario");
  await expect(
    page.getByRole("button", { name: "Enviar código" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Activar segundo factor" }),
  ).toHaveCount(0);
});

test("RF-ACC-11, RF-ACC-12, RF-ACC-13, 8.4: activa el segundo factor y el ingreso lo pide", async ({
  page,
}) => {
  const email = "julia.ficticia@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));
  await markEmailVerified(email);

  await page.goto("/");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await page.getByRole("link", { name: "Mi cuenta" }).click();
  await page.getByRole("button", { name: "Activar segundo factor" }).click();
  await page
    .getByRole("textbox", { name: "Tu contraseña" })
    .fill(FICTITIOUS_SUPER_USER.password);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(
    page.getByRole("img", {
      name: "Código QR para la aplicación autenticadora",
    }),
  ).toBeVisible();
  const manualKey = await page.locator("code").innerText();
  await page
    .getByRole("textbox", { name: "Código de la aplicación" })
    .fill(generateTotpCode(manualKey));
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(
    page
      .getByRole("list", { name: "Códigos de respaldo" })
      .getByRole("listitem"),
  ).toHaveCount(10);
  await page.getByRole("button", { name: "Ya los guardé" }).click();
  await expect(page.getByText("El segundo factor está activo.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/usuario");
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(page).toHaveURL(/\/2fa\?redirectTo=%2Fusuario$/);
  await page
    .getByRole("textbox", { name: "Código de la aplicación" })
    .fill(generateTotpCode(manualKey));
  await page.getByRole("button", { name: "Verificar" }).click();

  await expect(page).toHaveURL("/usuario");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mi cuenta" }),
  ).toBeVisible();
});
