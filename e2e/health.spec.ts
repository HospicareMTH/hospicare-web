import { expect, test } from "@playwright/test";

test("RNF-11: la verificación de salud responde activo y sin caché", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});
