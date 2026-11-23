import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

const SYSTEM_SETTINGS_PATH = "/admin/configuracion";

// Otra IP de documentación: estos ingresos no comparten el límite de 5 por minuto con las demás pruebas.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.250" } });

test("RF-CFG-04, RN-20: Administración sube el último número, ve el próximo y el cambio queda registrado", async ({
  page,
}) => {
  await page.goto(SYSTEM_SETTINGS_PATH);
  await signIn(page);
  await expect(
    page
      .getByRole("navigation", { name: "Secciones de Administración" })
      .getByRole("link", { name: "Configuración" }),
  ).toHaveAttribute("aria-current", "page");

  const field = page.getByRole("textbox", { name: /Último número asignado/ });
  const currentNumber = Number(await field.inputValue());
  const nextNumber = currentNumber + 100;
  await field.fill(String(nextNumber));
  await page.getByRole("button", { name: "Guardar número" }).click();

  const dialog = page.getByRole("alertdialog", {
    name: `¿Guardar el número ${nextNumber}?`,
  });
  await expect(dialog).toContainText(
    `Después no vas a poder volver a un número menor que ${nextNumber}.`,
  );
  await dialog.getByRole("button", { name: "Guardar número" }).click();

  await expect(
    page.getByText(`Guardaste el número ${nextNumber}.`),
  ).toBeVisible();
  await expect(field).toHaveValue(String(nextNumber));
  await expect(
    page.getByText(
      `El próximo huésped va a recibir el número ${nextNumber + 1}.`,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(`Última modificación: ${FICTITIOUS_SUPER_USER.name}`),
  ).toBeVisible();

  await field.fill(String(currentNumber));
  await page.getByRole("button", { name: "Guardar número" }).click();
  await expect(
    page.getByText(
      `El número no puede ser menor que ${nextNumber}, el último que ya se asignó.`,
    ),
  ).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("RF-ROL-09: con permiso de ver solamente, el número se muestra sin formulario", async ({
  page,
}) => {
  const email = "configuracion.lectura@hospicare.test";
  await createRoleWithPermissions("Configuración solo lectura", [
    "admin.system_settings.view",
  ]);
  await createFictitiousUser(
    email,
    await findRoleId("Configuración solo lectura"),
  );

  await page.goto(SYSTEM_SETTINGS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 2, name: "Número de historia clínica" }),
  ).toBeVisible();
  await expect(page.getByText("Último número asignado")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Guardar número" }),
  ).toHaveCount(0);
});

test("RF-ROL-09: sin permiso, Configuración no figura y la pantalla muestra acceso restringido", async ({
  page,
}) => {
  const email = "sin.configuracion@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(SYSTEM_SETTINGS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(
    0,
  );
});
