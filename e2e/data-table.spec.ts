import { expect, test } from "@playwright/test";

import { createInvitationWithKnownToken, signIn } from "./fixtures";

// Otra IP de documentación: los ingresos de este archivo no comparten el límite con los demás.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.90" } });

test("RF-TAB-06: las columnas ocultas se guardan para la persona", async ({
  page,
}) => {
  await page.goto("/admin/usuarios");
  await signIn(page);
  const emailHeader = page.getByRole("columnheader", {
    name: "Correo",
    exact: true,
  });
  await expect(emailHeader).toBeVisible();

  await page.getByRole("button", { name: "Columnas" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Correo", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(emailHeader).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("columnheader", { name: "Nombre" }),
  ).toBeVisible();
  await expect(emailHeader).toHaveCount(0);

  await page.getByRole("button", { name: "Columnas" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Correo", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(emailHeader).toBeVisible();
});

test("RF-TAB-01: elige 50, 100 o 150 filas por página", async ({ page }) => {
  await page.goto("/admin/roles");
  await signIn(page);

  await page.getByRole("combobox", { name: "Filas por página" }).click();
  await expect(page.getByRole("option")).toHaveText(["50", "100", "150"]);
  await page.getByRole("option", { name: "100" }).click();

  await expect(page).toHaveURL(/filas=100/);
  await expect(
    page.getByRole("combobox", { name: "Filas por página" }),
  ).toHaveText("100");
});

test("RF-INV-01: el vencimiento de la invitación muestra fecha y hora", async ({
  page,
}) => {
  await createInvitationWithKnownToken(
    "Hugo Ficticio",
    "hugo.ficticio@hospicare.test",
  );

  await page.goto("/admin/invitaciones");
  await signIn(page);

  await expect(page.getByRole("row", { name: /Hugo Ficticio/ })).toContainText(
    /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/,
  );
});
