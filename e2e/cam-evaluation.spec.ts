import { expect, type Locator, type Page, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.45" } });

async function insertNamedGuest(
  clinicalRecordNumber: number,
  firstName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName,
    lastName: "Evaluada",
    dni: "36111222",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

function camSection(page: Page): Locator {
  return page.getByRole("region", { name: "Evaluación CAM" });
}

function detailValue(section: Locator, label: string): Locator {
  return section.locator(`dt:text-is("${label}") + dd`);
}

async function answer(dialog: Locator, criterion: string, option: "Sí" | "No") {
  await dialog
    .getByRole("radiogroup", { name: criterion })
    .getByRole("radio", { name: option })
    .click();
}

test("CA-11, CA-21, RF-HUE-04: sin comienzo agudo se detiene ahí y después solo se puede modificar", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_301, "Ofelia");

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page);
  await page.getByRole("tab", { name: "Evaluaciones" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/huespedes/${guestId}\\?pestana=evaluaciones$`),
  );
  const section = camSection(page);
  await expect(section).toContainText("Todavía no se cargó la evaluación CAM.");

  await section.getByRole("button", { name: "Cargar evaluación CAM" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Cargar la evaluación CAM de Ofelia Evaluada",
  });
  await expect(
    dialog.getByRole("radiogroup", { name: "Inatención" }),
  ).toHaveCount(0);
  await answer(dialog, "Comienzo agudo", "No");
  await expect(dialog).toContainText("Resultado: Sin delirium probable");
  await dialog.getByRole("button", { name: "Guardar evaluación" }).click();

  await expect(page.getByText("Evaluación CAM cargada.")).toBeVisible();
  await expect(detailValue(section, "Resultado")).toHaveText(
    "Sin delirium probable",
  );
  await expect(detailValue(section, "Comienzo agudo")).toHaveText("No");
  await expect(detailValue(section, "Inatención")).toHaveText("No evaluado");

  await page.reload();
  await expect(page.getByRole("tab", { name: "Evaluaciones" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    section.getByRole("button", { name: "Cargar evaluación CAM" }),
  ).toHaveCount(0);
  await expect(
    section.getByRole("button", { name: "Modificar" }),
  ).toBeVisible();
});

test("RF-CAM-03, RF-CAM-04: al modificarla recalcula el resultado", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_302, "Prudencia");

  await page.goto(`/huespedes/${guestId}?pestana=evaluaciones`);
  await signIn(page);
  const section = camSection(page);
  await section.getByRole("button", { name: "Cargar evaluación CAM" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Cargar la evaluación CAM de Prudencia Evaluada",
  });
  await answer(createDialog, "Comienzo agudo", "Sí");
  await answer(createDialog, "Inatención", "No");
  await createDialog
    .getByRole("button", { name: "Guardar evaluación" })
    .click();
  await expect(detailValue(section, "Resultado")).toHaveText(
    "Sin delirium probable",
  );

  await section.getByRole("button", { name: "Modificar" }).click();
  const updateDialog = page.getByRole("dialog", {
    name: "Modificar la evaluación CAM de Prudencia Evaluada",
  });
  await answer(updateDialog, "Inatención", "Sí");
  await answer(updateDialog, "Pensamiento desorganizado", "No");
  await answer(updateDialog, "Conciencia alterada", "Sí");
  await updateDialog
    .getByRole("textbox", { name: "Observaciones" })
    .fill("Somnolienta por la tarde");
  await updateDialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Guardaste los cambios.")).toBeVisible();
  await expect(detailValue(section, "Resultado")).toHaveText(
    "Delirium probable",
  );
  await expect(detailValue(section, "Observaciones")).toHaveText(
    "Somnolienta por la tarde",
  );
  await expect(section).toContainText("Última modificación el");
});
