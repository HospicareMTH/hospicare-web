import { expect, type Page, test } from "@playwright/test";

import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

const ADMISSIONS_PATH = "/admisiones";
const NEW_INTERVIEW_PATH = "/admisiones/nueva";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.160" } });

async function chooseOption(page: Page, fieldLabel: string, option: string) {
  await page.getByRole("combobox", { name: fieldLabel }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function openSection(page: Page, sectionLabel: string) {
  await page.getByRole("tab", { name: sectionLabel }).click();
}

test("RF-ENT-02: se carga una entrevista en tres secciones y aparece en el listado", async ({
  page,
}) => {
  await page.goto(ADMISSIONS_PATH);
  await signIn(page);
  await page.getByRole("link", { name: "Nueva entrevista" }).click();
  await expect(page).toHaveURL(NEW_INTERVIEW_PATH);

  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Clara");
  await page.getByRole("textbox", { name: "Apellido" }).fill("Alta Ficticia");
  await page
    .getByRole("textbox", { name: "Fecha de nacimiento" })
    .fill("01/01/1950");
  await page.getByRole("textbox", { name: "DNI" }).fill("20.333.444");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Calle 123");
  await chooseOption(
    page,
    "Información general",
    "Total, conoce el diagnóstico y el pronóstico",
  );
  await chooseOption(page, "Religión", "Otra");
  await page.getByRole("textbox", { name: "Otra religión" }).fill("Ficticia");
  await chooseOption(page, "ECOG", "Asintomático, actividad normal");

  await openSection(page, "Entrevistado y red de cuidado");
  await page
    .getByRole("textbox", { name: "Nombre y apellido del entrevistado" })
    .fill("Pablo Entrevistado");
  await page
    .getByRole("radiogroup", { name: "Servicio funerario" })
    .getByRole("radio", { name: "Sí" })
    .click();

  await openSection(page, "Condición clínica");
  await chooseOption(page, "Tratamiento oncológico específico", "No recibirá");
  await page
    .getByRole("radiogroup", { name: "Tratamiento con opioides" })
    .getByRole("radio", { name: "Sí" })
    .click();
  await page.getByRole("textbox", { name: "Opioide" }).fill("Morfina");

  await page.getByRole("button", { name: "Guardar entrevista" }).click();

  await expect(page.getByText("Entrevista guardada.")).toBeVisible();
  await expect(page).toHaveURL(ADMISSIONS_PATH);
  await expect(
    page.getByRole("row", { name: /Clara Alta Ficticia.*DNI 20\.333\.444/ }),
  ).toBeVisible();
});

test("CA-06: un DNI de 6 dígitos se rechaza junto al campo y marca su sección", async ({
  page,
}) => {
  await page.goto(NEW_INTERVIEW_PATH);
  await signIn(page);

  await page.getByRole("textbox", { name: "DNI" }).fill("123456");
  await openSection(page, "Condición clínica");
  await page.getByRole("button", { name: "Guardar entrevista" }).click();

  await expect(
    page.getByText("Hay datos para corregir. Revisá las secciones marcadas."),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Huésped, tiene datos para corregir" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText(
      "El DNI debe tener 7 u 8 números, entre 1.000.000 y 99.999.999.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "DNI" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("RF-ROL-08, RF-ROL-09: sin permiso de crear no hay botón y la carga muestra acceso restringido", async ({
  page,
}) => {
  const email = "solo.ver.admisiones@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo ver admisiones", [
    "admissions.interviews.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto(ADMISSIONS_PATH);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Admisiones" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nueva entrevista" }),
  ).toHaveCount(0);

  await page.goto(NEW_INTERVIEW_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar entrevista" }),
  ).toHaveCount(0);
});

test("RNF-15: la carga de una entrevista no se desplaza de costado en el teléfono", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(NEW_INTERVIEW_PATH);
  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Nueva entrevista" }),
  ).toBeVisible();
  for (const section of [
    "Huésped",
    "Entrevistado y red de cuidado",
    "Condición clínica",
  ]) {
    await openSection(page, section);
    const overflowInPixels = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflowInPixels).toBe(0);
  }
});
