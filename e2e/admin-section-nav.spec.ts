import { expect, test } from "@playwright/test";

import { signIn } from "./fixtures";

// Otra IP de documentación: estos ingresos no comparten el límite con los demás archivos.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": "203.0.113.230" } });

test("RF-UX-04, RNF-15: en el teléfono, la fila de pestañas de Administración muestra la pestaña activa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/admin/actividad");
  await signIn(page);

  const activeSection = page
    .getByRole("navigation", { name: "Secciones de Administración" })
    .getByRole("link", { name: "Registro de actividad" });
  await expect(activeSection).toHaveAttribute("aria-current", "page");
  await expect(activeSection).toBeInViewport({ ratio: 1 });
});
