import { expect, test } from "@playwright/test";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import {
  createFictitiousUser,
  createRoleWithPermissions,
  FICTITIOUS_SUPER_USER,
  signIn,
} from "./fixtures";

const ADMISSIONS_PATH = "/admisiones";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.170" } });

async function insertNamedInterview(guestFirstName: string): Promise<string> {
  const [interview] = await insertInterview({
    guestFirstName,
    guestLastName: "Detalle",
  });
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return interview.id;
}

test("RF-TAB-04, RF-ENT-03: doble clic en el listado abre el detalle con etiquetas y datos sin cargar", async ({
  page,
}) => {
  await insertNamedInterview("Irma");

  await page.goto(ADMISSIONS_PATH);
  await signIn(page);
  await page.getByRole("row", { name: /Irma Detalle/ }).dblclick();

  await expect(
    page.getByRole("heading", { level: 1, name: "Irma Detalle" }),
  ).toBeVisible();
  await expect(page.getByText("Cargada el")).toBeVisible();
  await expect(page.getByText("Ninguna", { exact: true })).toBeVisible();
  await expect(page.getByText("Sin cargar").first()).toBeVisible();
});

test("RF-ENT-04: se edita la entrevista y el detalle muestra el cambio", async ({
  page,
}) => {
  const interviewId = await insertNamedInterview("Olga");

  await page.goto(`${ADMISSIONS_PATH}/${interviewId}`);
  await signIn(page);
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar entrevista" }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Dirección" })
    .fill("Calle Editada 9");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await expect(page).toHaveURL(`${ADMISSIONS_PATH}/${interviewId}`);
  await expect(page.getByText("Calle Editada 9")).toBeVisible();
  await expect(page.getByText("Última modificación el")).toBeVisible();
});

test("RF-ROL-08, RF-ROL-09: sin permiso de modificar no aparece Editar y la edición muestra acceso restringido", async ({
  page,
}) => {
  const interviewId = await insertNamedInterview("Pía");
  const email = "solo.lectura.admisiones@hospicare.test";
  const roleId = await createRoleWithPermissions("Solo lectura de admisiones", [
    "admissions.interviews.view",
  ]);
  await createFictitiousUser(email, roleId);

  await page.goto(`${ADMISSIONS_PATH}/${interviewId}`);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pía Detalle" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);

  await page.goto(`${ADMISSIONS_PATH}/${interviewId}/editar`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
});

test("RF-ENT-03: una entrevista inexistente muestra que no se encontró, sin desplazarse de costado en el teléfono", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${ADMISSIONS_PATH}/00000000-0000-4000-8000-000000000000`);
  await signIn(page);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "No encontramos esta entrevista",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ir a Admisiones" }).click();
  await expect(page).toHaveURL(ADMISSIONS_PATH);
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
