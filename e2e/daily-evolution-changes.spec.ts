import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { findUserIdByEmail } from "../src/modules/access/auth/repository";
import { insertGuest } from "../src/modules/guests/test-fixtures";
import { getDatabase } from "../src/platform/database/client";
import { FICTITIOUS_SUPER_USER, signIn } from "./fixtures";

const EVOLUTION_TEXT = "Pasó la noche tranquila, sin dolor ni disnea.";
const CORRECTED_TEXT =
  "Pasó la noche tranquila, con dolor leve a la madrugada.";
const CLARIFICATION_TEXT = "El dolor cedió con la medicación de rescate.";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.75" } });

async function insertNamedGuest(
  clinicalRecordNumber: number,
  firstName: string,
): Promise<string> {
  const [guest] = await insertGuest({
    clinicalRecordNumber,
    firstName,
    lastName: "Corregida",
    dni: "39111222",
  });
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

async function insertEvolutionOutOfWindow(guestId: string): Promise<void> {
  const authorUserId = await findUserIdByEmail(FICTITIOUS_SUPER_USER.email);
  if (!authorUserId) {
    throw new Error("Falta el usuario ficticio.");
  }
  await getDatabase().execute(
    sql`insert into daily_evolutions (
          guest_id, author_user_id, signature, text,
          created_at, editable_until, updated_at
        ) values (
          ${guestId}, ${authorUserId}, 'Super user', ${EVOLUTION_TEXT},
          now() - interval '2 days', now() - interval '1 day', now() - interval '2 days'
        )`,
  );
}

// Cada huésped de estas pruebas tiene una sola evolución: la primera de la pestaña.
function onlyEvolution(page: Page) {
  return page
    .getByRole("tabpanel", { name: "Evolución diaria" })
    .getByRole("listitem")
    .first();
}

test("RF-EVO-04, RF-EVO-05, RF-EVO-06: el autor corrige, agrega una nota y anula su evolución", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_601, "Tobías");

  await page.goto(`/huespedes/${guestId}?pestana=evolucion-diaria`);
  await signIn(page);
  await page
    .getByRole("textbox", { name: "Nueva evolución" })
    .fill(EVOLUTION_TEXT);
  await page.getByRole("button", { name: "Registrar evolución" }).click();
  await expect(page.getByText("Evolución registrada.")).toBeVisible();

  const item = onlyEvolution(page);
  await expect(item).toContainText("Podés corregirla hasta el");
  await item.getByRole("button", { name: "Editar" }).click();
  await item.getByRole("textbox", { name: "Evolución" }).fill(CORRECTED_TEXT);
  await item.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Guardaste los cambios.")).toBeVisible();

  const correctedItem = onlyEvolution(page);
  await expect(correctedItem).toContainText(CORRECTED_TEXT);
  await expect(correctedItem).toContainText("Modificada el");
  await correctedItem
    .getByRole("button", { name: "Agregar nota aclaratoria" })
    .click();
  await correctedItem
    .getByRole("textbox", { name: "Nota aclaratoria" })
    .fill(CLARIFICATION_TEXT);
  await correctedItem.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText("Nota aclaratoria agregada.")).toBeVisible();
  await expect(correctedItem).toContainText(`Nota aclaratoria · `);
  await expect(correctedItem).toContainText(CLARIFICATION_TEXT);

  await correctedItem.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", { name: /^Anular la evolución del/ });
  await dialog
    .getByRole("textbox", { name: "Motivo" })
    .fill("Cargada en el huésped equivocado");
  await dialog.getByRole("button", { name: "Anular evolución" }).click();

  await expect(page.getByText("Evolución anulada.")).toBeVisible();
  await expect(
    page.getByText("Todavía no hay evoluciones registradas."),
  ).toBeVisible();
});

test("CA-10: fuera de la ventana queda bloqueada y solo admite una nota aclaratoria", async ({
  page,
}) => {
  const guestId = await insertNamedGuest(900_602, "Ulises");
  await insertEvolutionOutOfWindow(guestId);

  await page.goto(`/huespedes/${guestId}?pestana=evolucion-diaria`);
  await signIn(page);
  const item = onlyEvolution(page);
  await expect(item).toContainText("Bloqueada");
  await expect(item.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(item.getByRole("button", { name: "Anular" })).toHaveCount(0);

  await item.getByRole("button", { name: "Agregar nota aclaratoria" }).click();
  await item
    .getByRole("textbox", { name: "Nota aclaratoria" })
    .fill(CLARIFICATION_TEXT);
  await item.getByRole("button", { name: "Guardar nota" }).click();

  await expect(page.getByText("Nota aclaratoria agregada.")).toBeVisible();
  await expect(item).toContainText(CLARIFICATION_TEXT);
});
