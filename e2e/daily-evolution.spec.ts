import { expect, type Page, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import { signIn } from "./fixtures";

const SYSTEM_SETTINGS_PATH = "/admin/configuracion";
const EVOLUTION_TEXT = "Pasó la noche tranquila, sin dolor ni disnea.";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.65" } });

async function insertNamedGuest(
  clinicalRecordNumber: number,
  firstName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName,
    lastName: "Evolucionada",
    dni: "38111222",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

async function chooseWindowMode(page: Page, mode: string) {
  await page
    .getByRole("radiogroup", { name: "Ventana de edición" })
    .getByRole("radio", { name: mode })
    .click();
}

test("RF-EVO-01, RF-EVO-02, RF-EVO-03, RF-EVO-07: registra una evolución firmada y la muestra primera", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_501, "Sabina");

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page);
  await page.getByRole("tab", { name: "Evolución diaria" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/huespedes/${guestId}\\?pestana=evolucion-diaria$`),
  );
  await expect(
    page.getByText("Todavía no hay evoluciones registradas."),
  ).toBeVisible();
  await expect(page.getByText(/^Se firma como/)).toHaveText(
    "Se firma como Super user.",
  );

  const field = page.getByRole("textbox", { name: "Nueva evolución" });
  await field.fill("Corta");
  await page.getByRole("button", { name: "Registrar evolución" }).click();
  await expect(
    page.getByText("La evolución debe tener al menos 10 caracteres."),
  ).toBeVisible();
  await expect(field).toHaveValue("Corta");

  await field.fill(EVOLUTION_TEXT);
  await page.getByRole("button", { name: "Registrar evolución" }).click();

  await expect(page.getByText("Evolución registrada.")).toBeVisible();
  await expect(field).toHaveValue("");
  const evolution = page
    .getByRole("listitem")
    .filter({ hasText: EVOLUTION_TEXT });
  await expect(evolution).toContainText("Ana Prueba · Super user");
  await expect(
    page.getByText("Todavía no hay evoluciones registradas."),
  ).toHaveCount(0);
});

test("RF-CFG-02, RN-20: Administración cambia la ventana de edición de evoluciones", async ({
  page,
}) => {
  await page.goto(SYSTEM_SETTINGS_PATH);
  await signIn(page);
  const section = page.getByRole("region", {
    name: "Ventana de edición de evoluciones diarias",
  });
  await expect(section.getByRole("textbox", { name: "Cantidad" })).toHaveValue(
    "24",
  );

  await chooseWindowMode(page, "Bloqueo inmediato");
  await section.getByRole("button", { name: "Guardar ventana" }).click();
  await expect(
    page.getByText("Guardaste la ventana de edición."),
  ).toBeVisible();
  await expect(section).toContainText("Última modificación: Ana Prueba");

  await page.reload();
  await expect(
    section.getByRole("radio", { name: "Bloqueo inmediato" }),
  ).toHaveAttribute("aria-checked", "true");

  await chooseWindowMode(page, "Durante un tiempo");
  await section.getByRole("textbox", { name: "Cantidad" }).fill("24");
  await section.getByRole("button", { name: "Guardar ventana" }).click();
  await expect(
    page.getByText("Guardaste la ventana de edición."),
  ).toBeVisible();
});
