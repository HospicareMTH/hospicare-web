import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createPasswordResetLink,
  findRoleId,
  signIn,
} from "./fixtures";

// Otra IP de documentación: los límites de recuperación e ingreso no se comparten con otros archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.40" } });

const NEW_PASSWORD = "otra-clave-de-prueba-larga";

test("RF-ACC-05: pide el enlace desde el inicio de sesión sin revelar si la cuenta existe", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();

  await expect(page).toHaveURL("/recuperar-contrasena");
  await page
    .getByRole("textbox", { name: "Correo electrónico" })
    .fill("nadie@hospicare.test");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(
    page.getByText("Si ese correo tiene una cuenta, te enviamos un enlace"),
  ).toBeVisible();
});

test("RF-ACC-05, 8.5: crea una contraseña nueva desde el enlace y entra con ella", async ({
  page,
}) => {
  const email = "rosa.ficticia@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));
  const resetLink = await createPasswordResetLink(email);

  await page.goto(resetLink);
  await expect(page).toHaveURL(/\/restablecer-contrasena\?token=/);
  await page
    .getByRole("textbox", { name: "Contraseña", exact: true })
    .fill(NEW_PASSWORD);
  await page.getByLabel("Repetí la contraseña").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(page).toHaveURL("/iniciar-sesion");
  await expect(page.getByText("Listo: tu contraseña cambió.")).toBeVisible();
  await signIn(page, NEW_PASSWORD, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();

  await page.goto(resetLink);
  await expect(
    page.getByText("Este enlace ya no es válido. Pedí uno nuevo."),
  ).toBeVisible();
});

test("RNF-20: las pantallas de recuperación no se indexan", async ({
  page,
}) => {
  for (const path of ["/recuperar-contrasena", "/restablecer-contrasena"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  }
});
