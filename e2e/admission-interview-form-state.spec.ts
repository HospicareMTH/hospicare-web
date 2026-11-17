import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import { getDatabase } from "../src/platform/database/client";
import { signIn } from "./fixtures";

const ADMISSIONS_PATH = "/admisiones";
const NEW_INTERVIEW_PATH = "/admisiones/nueva";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.180" } });

async function chooseOption(page: Page, fieldLabel: string, option: string) {
  await page.getByRole("combobox", { name: fieldLabel }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function fillRequiredFields(page: Page, firstName: string) {
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill(firstName);
  await page.getByRole("textbox", { name: "Apellido" }).fill("Estado");
  await page
    .getByRole("textbox", { name: "Fecha de nacimiento" })
    .fill("01/01/1950");
  await page.getByRole("textbox", { name: "DNI" }).fill("21.444.555");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Calle 1");
  await chooseOption(
    page,
    "Información general",
    "Total, conoce el diagnóstico y el pronóstico",
  );
  await chooseOption(page, "Religión", "Ninguna");
  await chooseOption(page, "ECOG", "Asintomático, actividad normal");
  await page
    .getByRole("tab", { name: "Entrevistado y red de cuidado" })
    .click();
  await page
    .getByRole("textbox", { name: "Nombre y apellido del entrevistado" })
    .fill("Familiar Estado");
  await page.getByRole("tab", { name: "Condición clínica" }).click();
  await chooseOption(page, "Tratamiento oncológico específico", "No recibirá");
}

test("RF-ENT-02: después de guardar una entrevista, Nueva entrevista abre el formulario vacío", async ({
  page,
}) => {
  await page.goto(NEW_INTERVIEW_PATH);
  await signIn(page);
  await fillRequiredFields(page, "Primera");
  await page.getByRole("button", { name: "Guardar entrevista" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Primera Estado" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Volver a Admisiones" }).click();
  await page.getByRole("link", { name: "Nueva entrevista" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Nueva entrevista" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Huésped" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "DNI" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Religión" })).toHaveText(
    /Elegí una opción/,
  );
});

test("RF-ENT-02: si el guardado falla, lo cargado no se pierde", async ({
  page,
}) => {
  await page.goto(NEW_INTERVIEW_PATH);
  await signIn(page);
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Conservada");
  await page.getByRole("textbox", { name: "DNI" }).fill("123");
  await page.getByRole("button", { name: "Guardar entrevista" }).click();

  await expect(
    page.getByText("Hay datos para corregir. Revisá las secciones marcadas."),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("Conservada");
  await expect(page.getByRole("textbox", { name: "DNI" })).toHaveValue("123");
});

test("RF-ENT-04: al volver a Editar, el formulario muestra lo último guardado y no un borrador viejo", async ({
  page,
}) => {
  const [interview] = await insertInterview({
    guestFirstName: "Vera",
    guestAddress: "Calle Original 1",
  });
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }

  await page.goto(`${ADMISSIONS_PATH}/${interview.id}/editar`);
  await signIn(page);
  await expect(page.getByRole("textbox", { name: "Dirección" })).toHaveValue(
    "Calle Original 1",
  );
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: /Vera/ }),
  ).toBeVisible();

  await getDatabase().execute(
    sql`update admission_interviews
        set guest_address = 'Calle Cambiada 2', updated_at = now()
        where id = ${interview.id}`,
  );
  await page.getByRole("link", { name: "Volver a Admisiones" }).click();
  await page.getByRole("row", { name: /Vera/ }).dblclick();
  await expect(page.getByText("Calle Cambiada 2")).toBeVisible();
  await page.getByRole("link", { name: "Editar" }).click();

  await expect(page.getByRole("textbox", { name: "Dirección" })).toHaveValue(
    "Calle Cambiada 2",
  );
});
