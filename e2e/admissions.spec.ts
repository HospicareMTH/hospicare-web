import { expect, test } from "@playwright/test";

import {
  createFictitiousUser,
  createInvitationWithKnownToken,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite de 5 por minuto con los otros archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.30" } });

const INVALID_LINK_MESSAGE =
  "Este enlace ya no es válido. Pedile una nueva invitación a un administrador.";

test("CA-01, RF-ACC-01: el registro solo informa que el alta es por invitación", async ({
  page,
}) => {
  await page.goto("/registro");

  await expect(
    page.getByText("El alta en Hospicare es solo por invitación."),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL("/iniciar-sesion");
});

test("RF-INV-01: administración invita y la invitación queda pendiente", async ({
  page,
}) => {
  await page.goto("/admin/invitaciones");
  await signIn(page);

  await page.getByRole("button", { name: "Invitar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill("Elena Ficticia");
  await dialog.getByLabel("Correo electrónico").fill("elena@hospicare.test");
  await dialog.getByRole("combobox", { name: "Rol" }).click();
  await page.getByRole("option", { name: "Usuario" }).click();
  await page.getByRole("button", { name: "Enviar invitación" }).click();

  await expect(page.getByText("Invitación enviada.")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Elena Ficticia.*Pendiente/ }),
  ).toBeVisible();
});

test("RF-ACC-17, CA-05: la persona invitada crea su cuenta y el enlace no se puede reusar", async ({
  page,
}) => {
  const email = "francisco@hospicare.test";
  const token = await createInvitationWithKnownToken(
    "Francisco Ficticio",
    email,
  );
  const invitationUrl = `/invitaciones/aceptar?token=${token}`;

  await page.goto(invitationUrl);
  await expect(page.getByText("Francisco Ficticio")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Contraseña", exact: true })
    .fill(FICTITIOUS_SUPER_USER.password);
  await page
    .getByLabel("Repetí la contraseña")
    .fill(FICTITIOUS_SUPER_USER.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL("/iniciar-sesion");
  await expect(page.getByText("Tu cuenta está lista.")).toBeVisible();
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();

  await page.goto(invitationUrl);
  await expect(page.getByText(INVALID_LINK_MESSAGE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toHaveCount(
    0,
  );
});

test("RF-USR-04, RF-ACC-18: un acceso revocado no puede volver a entrar", async ({
  page,
  browser,
}) => {
  const email = "gaston@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto("/admin/usuarios");
  await signIn(page);
  await page
    .getByRole("row", { name: new RegExp(email) })
    .getByRole("button", { name: "Acciones de Persona Ficticia" })
    .click();
  await page.getByRole("menuitem", { name: "Revocar acceso" }).click();
  await page.getByRole("combobox", { name: "Duración" }).click();
  await page.getByRole("option", { name: "Por una cantidad de días" }).click();
  await page.getByLabel("Días").fill("3");
  await page.getByLabel("Motivo").fill("Licencia de prueba");
  await page.getByRole("button", { name: "Revocar acceso" }).click();
  await expect(page.getByText("Acceso revocado.")).toBeVisible();

  const revokedPersonContext = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.31" },
  });
  const revokedPersonPage = await revokedPersonContext.newPage();
  await revokedPersonPage.goto("/iniciar-sesion");
  await signIn(revokedPersonPage, FICTITIOUS_SUPER_USER.password, email);
  await expect(
    revokedPersonPage.getByText(
      "Tu acceso está suspendido. Contactá a un administrador.",
    ),
  ).toBeVisible();
  await revokedPersonContext.close();
});
