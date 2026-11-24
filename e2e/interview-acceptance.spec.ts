import { expect, test } from "@playwright/test";

import { insertInterview } from "../src/modules/admissions/test-fixtures";
import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.120" } });

test("RF-ENT-06, RF-HUE-02, CA-08: aceptar la entrevista crea el huésped y la entrevista queda aceptada", async ({
  page,
}) => {
  const [interview] = await insertInterview({
    guestFirstName: "Marta",
    guestLastName: "Aceptada",
    guestDni: "32111444",
  });
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }

  await page.goto(`/admisiones/${interview.id}`);
  await signIn(page);

  await page.getByRole("button", { name: "Aceptar entrevista" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "¿Aceptar la entrevista de Marta Aceptada?",
  });
  await dialog.getByRole("button", { name: "Aceptar entrevista" }).click();

  const createdMessage = page.getByText(
    /Creaste el huésped con historia clínica N\.° \d+\./,
  );
  await expect(createdMessage).toBeVisible();
  const clinicalRecordNumber = (await createdMessage.textContent())?.match(
    /\d+/,
  )?.[0];
  await expect(
    page.getByText(
      new RegExp(
        `Aceptada el .*: huésped con historia clínica N\\.° ${clinicalRecordNumber}\\.`,
      ),
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aceptar entrevista" }),
  ).toHaveCount(0);

  await page.goto(`/admisiones/${interview.id}/editar`);
  await expect(
    page.getByText(
      "Esta entrevista ya se aceptó. Los cambios que guardes acá no se pasan a los datos del huésped.",
    ),
  ).toBeVisible();

  await page.goto("/huespedes?buscar=32.111.444");
  await expect(
    page.getByRole("row", {
      name: new RegExp(
        `${clinicalRecordNumber}.*Marta Aceptada.*32\\.111\\.444.*Admisión`,
      ),
    }),
  ).toBeVisible();
});
