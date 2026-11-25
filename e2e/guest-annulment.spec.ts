import { expect, test } from "@playwright/test";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import { insertGuest } from "../src/modules/guests/test-fixtures";
import { signIn } from "./fixtures";

const VALID_REASON = "Carga duplicada por error";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.35" } });

async function insertNamedGuest(
  clinicalRecordNumber: number,
  firstName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName,
    lastName: "Anulación",
    dni: "35666777",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

test("RF-HUE-06: se anula desde la ficha con motivo, sin perder lo escrito si el motivo es corto", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_201, "Delfina");

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page);
  await page.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Anular al huésped Delfina Anulación",
  });
  await expect(dialog).toContainText(
    "Su número de historia clínica (N.° 900201) no se vuelve a usar.",
  );
  await expect(dialog).not.toContainText("Su entrevista vuelve a quedar");
  await dialog.getByRole("textbox", { name: "Motivo" }).fill("Muy corto");
  await dialog.getByRole("button", { name: "Anular huésped" }).click();

  await expect(
    dialog.getByText("El motivo debe tener al menos 10 caracteres."),
  ).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Motivo" })).toHaveValue(
    "Muy corto",
  );

  await dialog.getByRole("textbox", { name: "Motivo" }).fill(VALID_REASON);
  await dialog.getByRole("button", { name: "Anular huésped" }).click();

  await expect(page.getByText("Huésped anulado.")).toBeVisible();
  await expect(page.getByText(/^Anulado el .* por Ana Prueba\./)).toBeVisible();
  await expect(page.getByText(`Motivo: ${VALID_REASON}`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);
});

test("RF-TAB-05, 8.2: se anula desde el menú de la fila y el huésped sale del listado", async ({
  page,
}) => {
  await insertNamedGuest(900_202, "Elvira");

  await page.goto("/huespedes?buscar=900202");
  await signIn(page);
  await page
    .getByRole("button", { name: "Acciones de Elvira Anulación" })
    .click();
  await page.getByRole("menuitem", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Anular al huésped Elvira Anulación",
  });
  await dialog.getByRole("textbox", { name: "Motivo" }).fill(VALID_REASON);
  await dialog.getByRole("button", { name: "Anular huésped" }).click();

  await expect(page.getByText("Huésped anulado.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Elvira Anulación/ })).toHaveCount(
    0,
  );
});

test("RF-HUE-02, R-14: la entrevista de un huésped anulado avisa y se puede aceptar de nuevo", async ({
  page,
}) => {
  const [interview] = await insertInterview({
    guestFirstName: "Fermina",
    guestLastName: "Reaceptada",
    guestDni: "35777888",
  });
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }
  const [guest] = await insertGuest({
    clinicalRecordNumber: 900_203,
    firstName: "Fermina",
    lastName: "Reaceptada",
    dni: "35777888",
    origin: "admission",
    admissionInterviewId: interview.id,
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }

  await page.goto(`/huespedes/${guest.id}`);
  await signIn(page);
  await page.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Anular al huésped Fermina Reaceptada",
  });
  await expect(dialog).toContainText(
    "Su entrevista vuelve a quedar sin aceptar. Si se acepta de nuevo, se crea otro huésped con otro número.",
  );
  await dialog.getByRole("textbox", { name: "Motivo" }).fill(VALID_REASON);
  await dialog.getByRole("button", { name: "Anular huésped" }).click();
  await expect(page.getByText("Huésped anulado.")).toBeVisible();

  await page.getByRole("link", { name: "Ver la entrevista" }).click();
  await expect(
    page.getByText(/^La aceptaron el .*, pero ese huésped/),
  ).toContainText("se anuló el");
  await page.getByRole("link", { name: "historia clínica N.° 900203" }).click();
  await expect(page).toHaveURL(new RegExp(`/huespedes/${guest.id}$`));
  await page.goBack();

  await page.getByRole("button", { name: "Aceptar entrevista" }).click();
  await page
    .getByRole("alertdialog", {
      name: "¿Aceptar la entrevista de Fermina Reaceptada?",
    })
    .getByRole("button", { name: "Aceptar entrevista" })
    .click();

  await expect(
    page.getByText(/Creaste el huésped con historia clínica N\.° \d+\./),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "huésped con historia clínica N.° 900203" }),
  ).toHaveCount(0);
});
