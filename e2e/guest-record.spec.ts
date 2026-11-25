import { expect, test } from "@playwright/test";

import { insertGuest } from "../src/modules/guests/test-fixtures";
import {
  createFictitiousUser,
  FICTITIOUS_SUPER_USER,
  findRoleId,
  signIn,
} from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.150" } });

async function insertRecordGuest(
  clinicalRecordNumber: number,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName: "Inés",
    lastName: "Ficha",
    dni: "33444555",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

test("RF-ROL-09: sin permiso de Huéspedes la ficha muestra acceso restringido", async ({
  page,
}) => {
  const guestId = await insertRecordGuest(900_002);
  const email = "sin.ficha@hospicare.test";
  await createFictitiousUser(email, await findRoleId("Usuario"));

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page, FICTITIOUS_SUPER_USER.password, email);

  await expect(
    page.getByRole("heading", { level: 1, name: "Acceso restringido" }),
  ).toBeVisible();
  await expect(page.getByText("33.444.555")).toHaveCount(0);
});

test("RNF-15: la ficha no se desplaza de costado en el teléfono", async ({
  page,
}) => {
  const guestId = await insertRecordGuest(900_003);
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`/huespedes/${guestId}`);
  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Inés Ficha" }),
  ).toBeVisible();
  const overflowInPixels = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflowInPixels).toBe(0);
});
