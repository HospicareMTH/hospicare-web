import { expect, test } from "@playwright/test";

const SIGN_IN_PATH = "/iniciar-sesion";
const PHONE_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

test("RF-UX-06: arranca con el tema del sistema y recuerda el elegido", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(SIGN_IN_PATH);
  const documentRoot = page.locator("html");

  await expect(documentRoot).toHaveClass(/\bdark\b/);

  await page
    .getByRole("button", { name: "Cambiar entre modo claro y oscuro" })
    .click();
  await expect(documentRoot).toHaveClass(/\blight\b/);

  await page.reload();
  await expect(documentRoot).toHaveClass(/\blight\b/);
});

test("RF-ACC-03: la raíz lleva al inicio de sesión", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(SIGN_IN_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("RNF-08, RNF-20: el inicio de sesión es indexable y tiene título y descripción", async ({
  page,
}) => {
  await page.goto(SIGN_IN_PATH);

  await expect(page).toHaveTitle("Iniciar sesión | Hospicare");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /^index/,
  );
});

for (const viewport of PHONE_VIEWPORTS) {
  test(`RNF-15: sin desplazamiento horizontal a ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(SIGN_IN_PATH);

    const overflowInPixels = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

    expect(overflowInPixels).toBe(0);
  });
}
