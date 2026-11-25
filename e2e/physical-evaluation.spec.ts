import { expect, type Locator, type Page, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.55" } });

const ESAS_SYMPTOMS = [
  "Dolor",
  "Cansancio",
  "Náuseas",
  "Depresión",
  "Ansiedad",
  "Somnolencia",
  "Apetito",
  "Disnea",
  "Dificultad para dormir",
  "Bienestar",
];

async function insertNamedGuest(
  clinicalRecordNumber: number,
  firstName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName,
    lastName: "Examinada",
    dni: "37111222",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

function physicalSection(page: Page): Locator {
  return page.getByRole("region", { name: "Evaluación física de ingreso" });
}

function detailValue(scope: Locator, label: string): Locator {
  return scope.locator(`dt:text-is("${label}") + dd`);
}

async function chooseScore(page: Page, symptom: string, score: string) {
  await page
    .getByRole("radiogroup", { name: symptom, exact: true })
    .getByRole("radio", { name: score, exact: true })
    .click();
}

async function chooseAllScores(page: Page, painScore: string) {
  await chooseScore(page, "Dolor", painScore);
  for (const symptom of ESAS_SYMPTOMS.slice(1)) {
    await chooseScore(page, symptom, "0, Nada");
  }
}

test("RF-FIS-01, RF-FIS-02, RF-HUE-04: se carga en su pantalla y se consulta en Evaluaciones", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_401, "Quiteria");

  await page.goto(`/huespedes/${guestId}?pestana=evaluaciones`);
  await signIn(page);
  const section = physicalSection(page);
  await expect(section).toContainText(
    "Todavía no se cargó la evaluación física de ingreso.",
  );
  await section
    .getByRole("link", { name: "Cargar evaluación física de ingreso" })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/huespedes/${guestId}/evaluacion-fisica$`),
  );
  await expect(
    page.getByText("Quiteria Examinada · Historia clínica N.° 900401"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar evaluación" }).click();
  await expect(
    page.getByText("Hay datos para corregir. Revisá los campos marcados."),
  ).toBeVisible();
  await expect(
    page.getByRole("radiogroup", { name: "Dolor", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");

  await chooseAllScores(page, "6, Bastante");
  await page
    .getByRole("textbox", { name: "Causa", exact: true })
    .fill("Tumoral");
  await page
    .getByRole("textbox", { name: "Localización", exact: true })
    .fill("Lumbar");
  await page
    .getByRole("textbox", { name: "Intensidad", exact: true })
    .fill("Moderada");
  await page
    .getByRole("textbox", { name: "Tipo", exact: true })
    .fill("Punzante");
  await page
    .getByRole("radiogroup", { name: "Úlceras por presión" })
    .getByRole("radio", { name: "Sí" })
    .click();
  await page
    .getByRole("radiogroup", { name: "Estadio" })
    .getByRole("radio", { name: "II", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Lugar de las úlceras" })
    .fill("Sacro");
  await page.getByRole("button", { name: "Guardar evaluación" }).click();

  await expect(
    page.getByText("Evaluación física de ingreso cargada."),
  ).toBeVisible();
  await expect(page).toHaveURL(
    new RegExp(`/huespedes/${guestId}\\?pestana=evaluaciones$`),
  );
  await expect(detailValue(section, "Dolor")).toHaveText("6 (Bastante)");
  await expect(detailValue(section, "Causa")).toHaveText("Tumoral");
  await expect(detailValue(section, "Estadio")).toHaveText("II");
  await expect(
    section.getByRole("link", { name: "Cargar evaluación física de ingreso" }),
  ).toHaveCount(0);
});

test("RN-12, RF-FIS-02: al modificarla sin dolor se descartan los datos del dolor", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_402, "Rosalía");

  await page.goto(`/huespedes/${guestId}/evaluacion-fisica`);
  await signIn(page);
  await chooseAllScores(page, "3");
  await page.getByRole("textbox", { name: "Causa", exact: true }).fill("Ósea");
  await page
    .getByRole("textbox", { name: "Localización", exact: true })
    .fill("Cadera");
  await page
    .getByRole("textbox", { name: "Intensidad", exact: true })
    .fill("Leve");
  await page.getByRole("textbox", { name: "Tipo", exact: true }).fill("Sordo");
  await page.getByRole("button", { name: "Guardar evaluación" }).click();
  const section = physicalSection(page);
  await expect(detailValue(section, "Causa")).toHaveText("Ósea");

  await section.getByRole("link", { name: "Modificar" }).click();
  await chooseScore(page, "Dolor", "0, Nada");
  await expect(
    page.getByRole("textbox", { name: "Causa", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Guardaste los cambios.")).toBeVisible();
  await expect(detailValue(section, "Dolor")).toHaveText("0 (Nada)");
  await expect(section).toContainText("Sin dolor en la ESAS.");
  await expect(section).toContainText("Última modificación el");
});
