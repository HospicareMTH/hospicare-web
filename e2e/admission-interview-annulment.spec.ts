import { expect, test } from "@playwright/test";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

const ADMISSIONS_PATH = "/admisiones";
const VALID_REASON = "Carga duplicada por error";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.190" } });

async function insertNamedInterview(guestFirstName: string): Promise<string> {
  const [interview] = await insertInterview({
    guestFirstName,
    guestLastName: "Anulación",
  });
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return interview.id;
}

test("RF-ENT-05: se anula desde el detalle con motivo, sin perder lo escrito si el motivo es corto", async ({
  page,
}) => {
  const interviewId = await insertNamedInterview("Delia");

  await page.goto(`${ADMISSIONS_PATH}/${interviewId}`);
  await signIn(page);
  await page.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Anular la entrevista de Delia Anulación",
  });
  await dialog.getByRole("textbox", { name: "Motivo" }).fill("Muy corto");
  await dialog.getByRole("button", { name: "Anular entrevista" }).click();

  await expect(
    dialog.getByText("El motivo debe tener al menos 10 caracteres."),
  ).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Motivo" })).toHaveValue(
    "Muy corto",
  );

  await dialog.getByRole("textbox", { name: "Motivo" }).fill(VALID_REASON);
  await dialog.getByRole("button", { name: "Anular entrevista" }).click();

  await expect(page.getByText("Entrevista anulada.")).toBeVisible();
  await expect(page.getByText(/^Anulada el .* por Ana Prueba\./)).toBeVisible();
  await expect(page.getByText(`Motivo: ${VALID_REASON}`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);
});

test("RF-TAB-05, 8.2: se anula desde el menú de la fila y la entrevista sale del listado", async ({
  page,
}) => {
  await insertNamedInterview("Elsa");

  await page.goto(ADMISSIONS_PATH);
  await signIn(page);
  await page
    .getByRole("button", {
      name: "Acciones de la entrevista de Elsa Anulación",
    })
    .click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Motivo" }).fill(VALID_REASON);
  await dialog.getByRole("button", { name: "Anular entrevista" }).click();

  await expect(page.getByText("Entrevista anulada.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Elsa Anulación/ })).toHaveCount(
    0,
  );
});

test("RF-ROL-08: sin permiso de anular no aparece la acción en el detalle ni en el menú", async ({
  page,
}) => {
  const interviewId = await insertNamedInterview("Fina");
  const email = "sin.anular@hospicare.test";
  const roleId = await createRoleWithPermissions("Admisiones sin anular", [
    "admissions.interviews.view",
    "admissions.interviews.update",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto(`${ADMISSIONS_PATH}/${interviewId}`);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);

  await page.getByRole("link", { name: "Volver a Admisiones" }).click();
  await page
    .getByRole("button", {
      name: "Acciones de la entrevista de Fina Anulación",
    })
    .click();
  await expect(page.getByRole("menuitem", { name: "Editar" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Anular" })).toHaveCount(0);
});

test("RNF-15: el diálogo de anulación no se desplaza de costado en el teléfono", async ({
  page,
}) => {
  const interviewId = await insertNamedInterview("Gala");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${ADMISSIONS_PATH}/${interviewId}`);
  await signIn(page);
  await page.getByRole("button", { name: "Anular" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
