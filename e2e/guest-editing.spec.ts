import { expect, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.95" } });

async function insertEditableGuest(
  clinicalRecordNumber: number,
  lastName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName: "Edith",
    lastName,
    dni: "34555666",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

test("RF-HUE-05: se edita desde la ficha y el cambio queda a la vista", async ({
  page,
}) => {
  const guestId = await insertEditableGuest(900_101, "Edición");

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page);
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar huésped" }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: /^Dirección/ })
    .fill("Avenida Corregida 789");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Guardaste los cambios.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/huespedes/${guestId}$`));
  await expect(
    page.getByRole("definition").filter({ hasText: "Avenida Corregida 789" }),
  ).toBeVisible();
});

test("RF-HUE-05, RF-TAB-05: el menú de la fila lleva a la edición", async ({
  page,
}) => {
  await insertEditableGuest(900_102, "Menú");

  await page.goto("/huespedes?buscar=900102");
  await signIn(page);
  await page.getByRole("button", { name: "Acciones de Edith Menú" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Editar huésped" }),
  ).toBeVisible();
});

test("RF-HUE-05: si otra persona guardó antes, avisa y conserva lo escrito", async ({
  page,
  context,
}) => {
  const guestId = await insertEditableGuest(900_103, "Simultánea");
  const editPath = `/huespedes/${guestId}/editar`;

  await page.goto(editPath);
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar huésped" }),
  ).toBeVisible();
  const otherPage = await context.newPage();
  await otherPage.goto(editPath);

  await otherPage
    .getByRole("textbox", { name: /^Dirección/ })
    .fill("Guardada primero 1");
  await otherPage.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(otherPage.getByText("Guardaste los cambios.")).toBeVisible();

  const address = page.getByRole("textbox", { name: /^Dirección/ });
  await address.fill("Guardada después 2");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(
    page.getByText(
      "Otra persona cambió este huésped mientras lo editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
    ),
  ).toBeVisible();
  await expect(address).toHaveValue("Guardada después 2");
});
