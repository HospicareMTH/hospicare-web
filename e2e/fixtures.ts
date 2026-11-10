import { expect, type Page } from "@playwright/test";

export const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

export async function signIn(
  page: Page,
  password = FICTITIOUS_SUPER_USER.password,
) {
  await page.getByLabel("Correo electrónico").fill(FICTITIOUS_SUPER_USER.email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

export async function signInFromHome(page: Page) {
  await page.goto("/");
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();
}
