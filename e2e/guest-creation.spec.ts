import { expect, test } from "@playwright/test";

import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.70" } });

test("RF-HUE-03, RF-HUE-07: el alta sin entrevista asigna el número y el huésped aparece en el listado", async ({
  page,
}) => {
  await page.goto("/huespedes");
  await signIn(page);

  await page.getByRole("link", { name: "Nuevo huésped" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nuevo huésped" }),
  ).toBeVisible();

  await page.getByRole("textbox", { name: /^Nombre/ }).fill("Elena");
  await page.getByRole("textbox", { name: /^Apellido/ }).fill("Alta Manual");
  await page
    .getByRole("textbox", { name: /^Fecha de nacimiento/ })
    .fill("02/03/1950");
  await page.getByRole("textbox", { name: /^DNI/ }).fill("31.222.777");
  await page
    .getByRole("textbox", { name: /^Dirección/ })
    .fill("Calle Ficticia 123");
  await page.getByRole("button", { name: "Guardar huésped" }).click();

  const createdMessage = page.getByText(
    /Creaste el huésped con historia clínica N\.° \d+\./,
  );
  await expect(createdMessage).toBeVisible();
  const clinicalRecordNumber = (await createdMessage.textContent())?.match(
    /\d+/,
  )?.[0];
  expect(clinicalRecordNumber).toBeDefined();

  await expect(page).toHaveURL(/\/huespedes$/);
  await expect(
    page.getByRole("row", {
      name: new RegExp(
        `${clinicalRecordNumber}.*Elena Alta Manual.*31\\.222\\.777.*Sin entrevista`,
      ),
    }),
  ).toBeVisible();
});

test("RF-HUE-03: un dato inválido se marca junto al campo y el formulario conserva lo escrito", async ({
  page,
}) => {
  await page.goto("/huespedes/nuevo");
  await signIn(page);

  await page.getByRole("textbox", { name: /^Nombre/ }).fill("Conservada");
  await page.getByRole("textbox", { name: /^DNI/ }).fill("123");
  await page.getByRole("button", { name: "Guardar huésped" }).click();

  await expect(
    page.getByText(
      "El DNI debe tener 7 u 8 números, entre 1.000.000 y 99.999.999.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Nombre/ })).toHaveValue(
    "Conservada",
  );
  await expect(page).toHaveURL(/\/huespedes\/nuevo$/);
});

test("RNF-15: el formulario de alta no se desplaza de costado en el teléfono", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/huespedes/nuevo");
  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 2, name: "Internación" }),
  ).toBeVisible();
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
